package com.mattia.nuotoparalimpico.domain.usecase

import com.mattia.nuotoparalimpico.data.Assenza
import com.mattia.nuotoparalimpico.data.Atleta
import com.mattia.nuotoparalimpico.data.ContestoTempo
import com.mattia.nuotoparalimpico.data.FaseMesociclo
import com.mattia.nuotoparalimpico.data.LogSeduta
import com.mattia.nuotoparalimpico.data.Microciclo
import com.mattia.nuotoparalimpico.data.Stile
import com.mattia.nuotoparalimpico.data.Tempo
import com.mattia.nuotoparalimpico.data.TipoMicrociclo
import com.mattia.nuotoparalimpico.data.repository.AtletaRepository
import com.mattia.nuotoparalimpico.data.repository.PianoRepository
import com.mattia.nuotoparalimpico.data.repository.RegistroRepository
import com.mattia.nuotoparalimpico.domain.CalcoloAcwr
import com.mattia.nuotoparalimpico.domain.CalcoloRitmiRipartenze
import com.mattia.nuotoparalimpico.domain.TempoImportato
import com.mattia.nuotoparalimpico.domain.GeneratoreSmartSeduta
import com.mattia.nuotoparalimpico.domain.LivelloAcwr
import com.mattia.nuotoparalimpico.domain.ParametriPiano
import com.mattia.nuotoparalimpico.domain.PianoGenerator
import com.mattia.nuotoparalimpico.domain.Riepilogo
import com.mattia.nuotoparalimpico.domain.RiepilogoSettimana
import com.mattia.nuotoparalimpico.domain.SchedaSeduta
import com.mattia.nuotoparalimpico.domain.VolumeIndividuale
import java.time.LocalDate

// ------------------------------------------------------------------ 1. Piano

/** Rigenera il piano; le settimane bloccate (modificate a mano) mantengono i valori scelti. */
class GeneraPianoUseCase(private val piano: PianoRepository) {
    suspend operator fun invoke(parametri: ParametriPiano) {
        val s = piano.stagioneCorrente() ?: return
        val chiusure = piano.leggiChiusure(s.id)
        val gare = piano.leggiGare(s.id)
        val bloccati = piano.leggiMicro(s.id).filter { it.bloccato }.associateBy { it.inizio }

        val nuovo = PianoGenerator.genera(s, chiusure, gare, parametri).map { macroGen ->
            macroGen.copy(
                meso = macroGen.meso.map { mesoGen ->
                    mesoGen.copy(
                        micro = mesoGen.micro.map { mi ->
                            val vecchio = bloccati[mi.inizio]
                            if (vecchio == null) mi else mi.copy(
                                tipo = vecchio.tipo,
                                sedutePreviste = vecchio.sedutePreviste,
                                volumeTargetMetri = vecchio.volumeTargetMetri,
                                note = vecchio.note,
                                bloccato = true
                            )
                        }
                    )
                }
            )
        }
        piano.salvaPiano(s.id, nuovo)
    }
}

// ------------------------------------------------------------------ 2. Scheda

/**
 * Unico punto in cui si costruisce una scheda: trova microciclo e mesociclo della data,
 * calcola il volume per seduta (individuale o di squadra) e passa al generatore tempi, log e vasca.
 * Senza atleta, [metriManuali] ha la precedenza sul volume del piano.
 */
class GeneraSedutaUseCase(
    private val atleti: AtletaRepository,
    private val piano: PianoRepository,
    private val registro: RegistroRepository
) {
    suspend operator fun invoke(
        data: LocalDate,
        atletaId: Long? = null,
        metriManuali: Int? = null
    ): SchedaSeduta {
        val stagione = piano.stagioneCorrente()
        val micro = stagione?.let { piano.leggiMicro(it.id) }.orEmpty()
        val meso = stagione?.let { piano.leggiMeso(it.id) }.orEmpty()
        val mc = micro.firstOrNull { !data.isBefore(it.inizio) && !data.isAfter(it.fine) }
        val mesoC = mc?.let { m -> meso.firstOrNull { it.id == m.mesocicloId } }

        val atleta = atletaId?.let { id -> atleti.leggiAtleti().firstOrNull { it.id == id } }
        val assenze = atleta?.let { atleti.leggiAssenze(it.id) }.orEmpty()

        val metri = when {
            atleta != null && mc != null ->
                VolumeIndividuale.settimana(mc, atleta, assenze).metri / mc.sedutePreviste.coerceAtLeast(1)
            metriManuali != null -> metriManuali.coerceIn(400, 10_000)
            mc != null && mc.sedutePreviste > 0 -> mc.volumeTargetMetri / mc.sedutePreviste
            else -> 1800
        }

        return GeneratoreSmartSeduta.genera(
            data = data,
            metriTarget = metri,
            fase = mesoC?.fase ?: FaseMesociclo.PREPARAZIONE_SPECIFICA,
            tipoMicro = mc?.tipo ?: TipoMicrociclo.CARICO,
            atleta = atleta,
            condizioniMediche = atleta?.let { atleti.leggiCondizioni(it.id) }.orEmpty(),
            tempi = atleta?.let { registro.leggiTempi(it.id) }.orEmpty(),
            logSedute = atleta?.let { registro.leggiLog(it.id) }.orEmpty(),
            mesocicloCorrente = mesoC,
            vascaMetri = stagione?.vascaMetri ?: 25
        )
    }
}

// ------------------------------------------------------------------ 3. Registro

data class RigaSedutaInput(val atletaId: Long, val presente: Boolean, val metri: Int?, val rpe: Int?)

/** Valida e salva la seduta del giorno. Restituisce la lista degli errori (vuota = salvata). */
class SalvaSedutaUseCase(private val registro: RegistroRepository) {
    suspend operator fun invoke(data: LocalDate, durataMin: Int, righe: List<RigaSedutaInput>): List<String> {
        val errori = mutableListOf<String>()
        if (durataMin !in 1..300) errori += "Durata non valida (1-300 minuti)"
        righe.filter { it.presente }.forEach { r ->
            if (r.metri != null && r.metri !in 0..20_000) errori += "Metri non validi (0-20000)"
            if (r.rpe != null && r.rpe !in 1..10) errori += "RPE non valido (1-10)"
        }
        if (errori.isNotEmpty()) return errori.distinct()

        registro.salvaSeduta(
            data,
            righe.map { r ->
                LogSeduta(
                    atletaId = r.atletaId,
                    data = data,
                    presente = r.presente,
                    durataMin = if (r.presente) durataMin else 0,
                    metriEffettivi = if (r.presente) r.metri ?: 0 else 0,
                    rpe = if (r.presente) r.rpe else null
                )
            }
        )
        return emptyList()
    }
}

// ------------------------------------------------------------------ 4. Carico

data class CaricoAtleta(
    val affidabile: Boolean,
    val livello: LivelloAcwr?,
    val messaggio: String,
    val settimane: List<RiepilogoSettimana>,
    val ultimaSeduta: LocalDate?
)

/** Funzione pura: ACWR e riepilogo settimanale di un atleta. Usata da Storico e Dashboard. */
class CalcolaCaricoAtletaUseCase {
    fun calcola(
        atleta: Atleta,
        log: List<LogSeduta>,
        micro: List<Microciclo>,
        assenze: List<Assenza>,
        oggi: LocalDate
    ): CaricoAtleta {
        val acwr = CalcoloAcwr.calcola(log, oggi)
        return CaricoAtleta(
            affidabile = acwr.affidabile,
            livello = acwr.livello,
            messaggio = acwr.messaggio,
            settimane = Riepilogo.perAtleta(atleta, log, micro, assenze),
            ultimaSeduta = log.filter { it.presente }.maxOfOrNull { it.data }
        )
    }
}

// ------------------------------------------------------------------ 5. Import tempi

/** Analizza i risultati selezionati; il salvataggio avviene solo dopo la conferma nell'anteprima. */
class ImportaTempiUseCase {
    operator fun invoke(testo: String, cognome: String, nome: String? = null): List<TempoImportato> =
        CalcoloRitmiRipartenze.parseImportaTempi(testo, cognome, nome)
}