package com.mattia.nuotoparalimpico.domain

import com.mattia.nuotoparalimpico.data.Chiusura
import com.mattia.nuotoparalimpico.data.FaseMesociclo
import com.mattia.nuotoparalimpico.data.Gara
import com.mattia.nuotoparalimpico.data.Macrociclo
import com.mattia.nuotoparalimpico.data.Mesociclo
import com.mattia.nuotoparalimpico.data.Microciclo
import com.mattia.nuotoparalimpico.data.Stagione
import com.mattia.nuotoparalimpico.data.TipoMicrociclo
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.temporal.TemporalAdjusters
import kotlin.math.roundToInt

data class ParametriPiano(
    val giorniAllenamento: Set<DayOfWeek> = setOf(DayOfWeek.WEDNESDAY, DayOfWeek.SATURDAY),
    val numeroMacrocicli: Int = 1,
    /** Metri di una seduta "piena". Da tarare sul livello reale del gruppo. */
    val metriBaseSeduta: Int = 1800,
    /** Ogni quante settimane c'è uno scarico (4 = 3 di carico + 1 di scarico). */
    val settimaneCicloCarico: Int = 4
)

data class MesoGen(val meso: Mesociclo, val micro: List<Microciclo>)
data class MacroGen(val macro: Macrociclo, val meso: List<MesoGen>)

object PianoGenerator {

    private val PROPORZIONI = listOf(
        FaseMesociclo.PREPARAZIONE_GENERALE to 0.35,
        FaseMesociclo.PREPARAZIONE_SPECIFICA to 0.30,
        FaseMesociclo.PRE_GARA to 0.15,
        FaseMesociclo.COMPETITIVA to 0.20
    )

    private val FATTORE_FASE = mapOf(
        FaseMesociclo.PREPARAZIONE_GENERALE to 1.0,
        FaseMesociclo.PREPARAZIONE_SPECIFICA to 1.0,
        FaseMesociclo.PRE_GARA to 0.9,
        FaseMesociclo.COMPETITIVA to 0.8
    )

    fun genera(
        stagione: Stagione,
        chiusure: List<Chiusura>,
        gare: List<Gara>,
        p: ParametriPiano
    ): List<MacroGen> {
        val primoLunedi = stagione.inizio.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
        val ultimaDomenica = stagione.fine.with(TemporalAdjusters.nextOrSame(DayOfWeek.SUNDAY))
        val settimane = generateSequence(primoLunedi) { it.plusWeeks(1) }
            .takeWhile { !it.isAfter(ultimaDomenica) }
            .toList()
        if (settimane.isEmpty() || p.giorniAllenamento.isEmpty()) return emptyList()

        val nMacro = p.numeroMacrocicli.coerceIn(1, settimane.size)
        val dimensioneBlocco = (settimane.size + nMacro - 1) / nMacro

        return settimane.chunked(dimensioneBlocco).mapIndexed { indice, blocco ->
            val meso = dividiInFasi(blocco).map { (fase, sett) ->
                MesoGen(
                    meso = Mesociclo(
                        macrocicloId = 0,
                        fase = fase,
                        inizio = sett.first(),
                        fine = sett.last().plusDays(6)
                    ),
                    micro = microcicli(sett, fase, settimane.first(), stagione, chiusure, gare, p)
                )
            }
            MacroGen(
                macro = Macrociclo(
                    stagioneId = 0,
                    nome = "Macrociclo ${indice + 1}",
                    inizio = blocco.first(),
                    fine = blocco.last().plusDays(6)
                ),
                meso = meso
            )
        }
    }

    /** Ripartisce le settimane di un macrociclo nelle 4 fasi secondo PROPORZIONI. */
    private fun dividiInFasi(sett: List<LocalDate>): List<Pair<FaseMesociclo, List<LocalDate>>> {
        val n = sett.size
        var cumulato = 0.0
        var precedente = 0
        val risultato = mutableListOf<Pair<FaseMesociclo, List<LocalDate>>>()
        PROPORZIONI.forEachIndexed { i, voce ->
            cumulato += voce.second
            val limite = if (i == PROPORZIONI.lastIndex) n else (n * cumulato).roundToInt()
            if (limite > precedente) {
                risultato += voce.first to sett.subList(precedente, limite)
            }
            precedente = maxOf(precedente, limite)
        }
        return risultato
    }

    private fun microcicli(
        sett: List<LocalDate>,
        fase: FaseMesociclo,
        primaSettimanaStagione: LocalDate,
        stagione: Stagione,
        chiusure: List<Chiusura>,
        gare: List<Gara>,
        p: ParametriPiano
    ): List<Microciclo> {
        var indiceCarico = 0
        return sett.mapIndexed { i, lunedi ->
            val domenica = lunedi.plusDays(6)

            val giorniUtili = p.giorniAllenamento.map { lunedi.with(it) }.filter { d ->
                !d.isBefore(stagione.inizio) && !d.isAfter(stagione.fine) &&
                    chiusure.none { c -> !d.isBefore(c.dal) && !d.isAfter(c.al) }
            }
            val garaInSettimana = gare.any { g -> !g.dal.isAfter(domenica) && !g.al.isBefore(lunedi) }
            val garaPrioritariaSettimanaDopo = gare.any { g ->
                g.prioritaria &&
                    !g.dal.isBefore(lunedi.plusWeeks(1)) &&
                    !g.dal.isAfter(domenica.plusWeeks(1))
            }

            val tipo = when {
                giorniUtili.isEmpty() -> TipoMicrociclo.PAUSA
                garaInSettimana -> TipoMicrociclo.GARA
                lunedi == primaSettimanaStagione -> TipoMicrociclo.ADATTAMENTO
                garaPrioritariaSettimanaDopo -> TipoMicrociclo.SCARICO // tapering
                (i + 1) % p.settimaneCicloCarico == 0 -> TipoMicrociclo.SCARICO
                else -> TipoMicrociclo.CARICO
            }

            val fattore = when (tipo) {
                TipoMicrociclo.PAUSA -> 0.0
                TipoMicrociclo.ADATTAMENTO -> 0.8
                TipoMicrociclo.SCARICO -> 0.7
                TipoMicrociclo.GARA -> 0.6
                TipoMicrociclo.CARICO -> {
                    val f = (FATTORE_FASE[fase] ?: 1.0) * (1.0 + 0.05 * minOf(indiceCarico, 4))
                    indiceCarico++
                    f
                }
            }

            val previste = p.giorniAllenamento.size
            val nota = if (tipo != TipoMicrociclo.PAUSA && giorniUtili.size < previste) {
                "${giorniUtili.size} sedute invece di $previste (chiusure/festività/limiti stagione)"
            } else ""

            Microciclo(
                mesocicloId = 0,
                inizio = lunedi,
                fine = domenica,
                tipo = tipo,
                sedutePreviste = giorniUtili.size,
                volumeTargetMetri = (giorniUtili.size * p.metriBaseSeduta * fattore).roundToInt(),
                note = nota
            )
        }
    }
}
