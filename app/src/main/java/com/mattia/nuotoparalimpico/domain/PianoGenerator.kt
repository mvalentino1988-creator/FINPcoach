package com.mattia.nuotoparalimpico.domain

import com.mattia.nuotoparalimpico.data.Chiusura
import com.mattia.nuotoparalimpico.data.FaseMesociclo
import com.mattia.nuotoparalimpico.data.Gara
import com.mattia.nuotoparalimpico.data.MacroGen
import com.mattia.nuotoparalimpico.data.Macrociclo
import com.mattia.nuotoparalimpico.data.MesoGen
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
    /** Usato solo se non ci sono gare prioritarie: con gare prioritarie ogni macrociclo finisce con una gara. */
    val numeroMacrocicli: Int = 1,
    /** Metri di una seduta "piena". Da tarare sul livello reale del gruppo. */
    val metriBaseSeduta: Int = 1800,
    /** Ogni quante settimane c'è uno scarico (4 = 3 di carico + 1 di scarico). */
    val settimaneCicloCarico: Int = 4
)

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

    /** Settimane di fase pre-gara prima della settimana di gara (l'ultima è il tapering). */
    private const val SETTIMANE_PRE_GARA = 3

    /** Quota della preparazione (prima della fase pre-gara) dedicata alla parte specifica. */
    private const val QUOTA_SPECIFICA = 0.45

    /** Stato del ritmo carico/scarico, condiviso su tutta la stagione. */
    private class StatoCarico {
        var caricoNelCiclo = 0
    }

    private class Blocco(val settimane: List<Pair<LocalDate, FaseMesociclo>>, val obiettivo: String)

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

        val stato = StatoCarico()
        return costruisciBlocchi(settimane, gare, p).mapIndexed { indice, blocco ->
            val meso = raggruppa(blocco.settimane).map { (fase, sett) ->
                MesoGen(
                    meso = Mesociclo(
                        macrocicloId = 0,
                        fase = fase,
                        inizio = sett.first(),
                        fine = sett.last().plusDays(6)
                    ),
                    micro = microcicli(sett, fase, settimane.first(), stagione, chiusure, gare, p, stato)
                )
            }
            MacroGen(
                macro = Macrociclo(
                    stagioneId = 0,
                    nome = "Macrociclo ${indice + 1}",
                    inizio = blocco.settimane.first().first,
                    fine = blocco.settimane.last().first.plusDays(6),
                    obiettivo = blocco.obiettivo
                ),
                meso = meso
            )
        }
    }

    /**
     * Con gare prioritarie: un macrociclo per ciascuna, che finisce con la gara e la settimana di
     * recupero; le fasi sono ancorate alla gara. Senza: divisione per proporzioni fisse.
     */
    private fun costruisciBlocchi(settimane: List<LocalDate>, gare: List<Gara>, p: ParametriPiano): List<Blocco> {
        val ultimaDomenica = settimane.last().plusDays(6)
        val indiciGara = mutableListOf<Int>()
        val nomiGara = mutableListOf<String>()
        gare.filter { it.prioritaria }.sortedBy { it.dal }.forEach { g ->
            val idx = settimane.indexOfLast { !it.isAfter(g.dal) }
            val distanteAbbastanza = indiciGara.isEmpty() || idx >= indiciGara.last() + 2
            if (idx >= 0 && !g.dal.isAfter(ultimaDomenica) && distanteAbbastanza) {
                indiciGara += idx
                nomiGara += g.nome
            }
        }

        if (indiciGara.isEmpty()) {
            val nMacro = p.numeroMacrocicli.coerceIn(1, settimane.size)
            val dimensione = (settimane.size + nMacro - 1) / nMacro
            return settimane.chunked(dimensione).map { blocco ->
                Blocco(dividiInFasi(blocco).flatMap { (fase, sett) -> sett.map { it to fase } }, "")
            }
        }

        val ultimo = settimane.lastIndex
        return indiciGara.mapIndexed { k, r ->
            val inizio = if (k == 0) 0 else indiciGara[k - 1] + 2
            val fine = if (k == indiciGara.lastIndex) ultimo else minOf(r + 1, ultimo)
            val rLocale = r - inizio
            Blocco(
                settimane = (inizio..fine).map { i -> settimane[i] to faseAttorno(i - inizio, rLocale) },
                obiettivo = "Gara prioritaria: ${nomiGara[k]}"
            )
        }
    }

    /** Fase della settimana j (indice locale) in un macrociclo la cui gara cade alla settimana r. */
    private fun faseAttorno(j: Int, r: Int): FaseMesociclo {
        val d = r - j
        return when {
            d < -1 -> FaseMesociclo.PREPARAZIONE_GENERALE // dopo il recupero: si riparte
            d <= 0 -> FaseMesociclo.COMPETITIVA           // gara + settimana di recupero
            d <= SETTIMANE_PRE_GARA -> FaseMesociclo.PRE_GARA
            else -> {
                val n = r - SETTIMANE_PRE_GARA
                val nSpecifica = (n * QUOTA_SPECIFICA).roundToInt()
                if (j >= n - nSpecifica) FaseMesociclo.PREPARAZIONE_SPECIFICA
                else FaseMesociclo.PREPARAZIONE_GENERALE
            }
        }
    }

    /** Raggruppa settimane consecutive con la stessa fase in mesocicli. */
    private fun raggruppa(
        fasi: List<Pair<LocalDate, FaseMesociclo>>
    ): List<Pair<FaseMesociclo, List<LocalDate>>> {
        val risultato = mutableListOf<Pair<FaseMesociclo, MutableList<LocalDate>>>()
        for ((data, fase) in fasi) {
            if (risultato.isNotEmpty() && risultato.last().first == fase) {
                risultato.last().second.add(data)
            } else {
                risultato.add(fase to mutableListOf(data))
            }
        }
        return risultato
    }

    /** Ripartisce le settimane di un blocco nelle 4 fasi secondo PROPORZIONI. */
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
        p: ParametriPiano,
        stato: StatoCarico
    ): List<Microciclo> = sett.map { lunedi ->
        val domenica = lunedi.plusDays(6)

        val giorniUtili = p.giorniAllenamento.map { lunedi.with(it) }.filter { d ->
            !d.isBefore(stagione.inizio) && !d.isAfter(stagione.fine) &&
                    chiusure.none { c -> !d.isBefore(c.dal) && !d.isAfter(c.al) }
        }
        val gareInSettimana = gare.filter { g -> !g.dal.isAfter(domenica) && !g.al.isBefore(lunedi) }
        val garaPrioritariaInSettimana = gareInSettimana.any { it.prioritaria }
        val dopoGaraPrioritaria = gare.any { g ->
            g.prioritaria &&
                    !g.al.isBefore(lunedi.minusWeeks(1)) &&
                    !g.al.isAfter(domenica.minusWeeks(1))
        }
        val prePrioritaria = gare.any { g ->
            g.prioritaria &&
                    !g.dal.isBefore(lunedi.plusWeeks(1)) &&
                    !g.dal.isAfter(domenica.plusWeeks(1))
        }

        val tipo = when {
            giorniUtili.isEmpty() -> TipoMicrociclo.PAUSA
            gareInSettimana.isNotEmpty() -> TipoMicrociclo.GARA
            lunedi == primaSettimanaStagione -> TipoMicrociclo.ADATTAMENTO
            dopoGaraPrioritaria -> TipoMicrociclo.RECUPERO
            prePrioritaria -> TipoMicrociclo.SCARICO // tapering
            stato.caricoNelCiclo >= p.settimaneCicloCarico - 1 -> TipoMicrociclo.SCARICO
            else -> TipoMicrociclo.CARICO
        }

        val fattore = when (tipo) {
            TipoMicrociclo.PAUSA -> 0.0
            TipoMicrociclo.ADATTAMENTO -> 0.8
            TipoMicrociclo.SCARICO -> 0.7
            TipoMicrociclo.RECUPERO -> 0.5
            TipoMicrociclo.GARA -> if (garaPrioritariaInSettimana) 0.6 else 0.9
            TipoMicrociclo.CARICO -> (FATTORE_FASE[fase] ?: 1.0) * (1.0 + 0.05 * stato.caricoNelCiclo)
        }

        // Aggiorna il ritmo su tutta la stagione (non solo dentro il mesociclo)
        when (tipo) {
            TipoMicrociclo.CARICO -> stato.caricoNelCiclo++
            TipoMicrociclo.GARA -> {
                if (garaPrioritariaInSettimana) stato.caricoNelCiclo = 0
            }
            else -> stato.caricoNelCiclo = 0
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