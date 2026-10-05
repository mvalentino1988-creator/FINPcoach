package com.mattia.nuotoparalimpico.domain

import com.mattia.nuotoparalimpico.data.Assenza
import com.mattia.nuotoparalimpico.data.Atleta
import com.mattia.nuotoparalimpico.data.ContestoTempo
import com.mattia.nuotoparalimpico.data.LogSeduta
import com.mattia.nuotoparalimpico.data.Microciclo
import com.mattia.nuotoparalimpico.data.Stile
import com.mattia.nuotoparalimpico.data.Tempo
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.temporal.TemporalAdjusters
import java.util.Locale

private val REGEX_TEMPO = Regex("""^(?:(\d{1,2}):)?(\d{1,2})(?:\.(\d{1,2}))?$""")

/** "1:02.35", "62.35", "28,4" -> centesimi. Restituisce null se il testo non è valido. */
fun parseTempo(testo: String): Int? {
    val t = testo.trim().replace(',', '.')
    val m = REGEX_TEMPO.matchEntire(t) ?: return null
    val minutiStr = m.groupValues[1]
    val minuti = minutiStr.ifEmpty { "0" }.toInt()
    val secondi = m.groupValues[2].toInt()
    if (minutiStr.isNotEmpty() && secondi >= 60) return null
    val dec = m.groupValues[3]
    val centesimi = when (dec.length) {
        0 -> 0
        1 -> dec.toInt() * 10
        else -> dec.toInt()
    }
    val totale = (minuti * 60 + secondi) * 100 + centesimi
    return if (totale > 0) totale else null
}

/** 6235 -> "1:02.35"; 2840 -> "28.40" */
fun formattaTempo(centesimi: Int): String {
    val minuti = centesimi / 6000
    val secondi = (centesimi % 6000) / 100
    val cent = centesimi % 100
    return if (minuti > 0) String.format(Locale.ROOT, "%d:%02d.%02d", minuti, secondi, cent)
    else String.format(Locale.ROOT, "%d.%02d", secondi, cent)
}

data class Primato(
    val stile: Stile,
    val distanzaMetri: Int,
    val vascaMetri: Int,
    val centesimi: Int,
    val data: LocalDate
)

/** Miglior tempo di gara per stile, distanza e vasca (i tempi di allenamento e test non contano). */
fun primatiPersonali(tempi: List<Tempo>): List<Primato> =
    tempi.filter { it.contesto == ContestoTempo.GARA }
        .groupBy { Triple(it.stile, it.distanzaMetri, it.vascaMetri) }
        .map { (chiave, lista) ->
            val migliore = lista.minByOrNull { it.centesimi }!!
            Primato(chiave.first, chiave.second, chiave.third, migliore.centesimi, migliore.data)
        }
        .sortedWith(compareBy({ it.stile.ordinal }, { it.distanzaMetri }, { it.vascaMetri }))

data class RiepilogoSettimana(
    val lunedi: LocalDate,
    val sedute: Int,
    val assenze: Int,
    val metri: Int,
    val rpeMedio: Double?,
    /** Carico percepito: somma di RPE x minuti delle sedute con RPE. */
    val caricoSrpe: Int,
    val metriPrevisti: Int?
)

object Riepilogo {

    /**
     * Ultime settimane dell'atleta, dalla più recente con sedute registrate.
     * Le settimane senza sedute tra due settimane registrate vengono incluse con carico 0:
     * così la media cronica (ACWR) non viene gonfiata dai buchi.
     */
    fun perAtleta(
        atleta: Atleta,
        log: List<LogSeduta>,
        micro: List<Microciclo>,
        assenze: List<Assenza>,
        maxSettimane: Int = 8
    ): List<RiepilogoSettimana> {
        if (log.isEmpty()) return emptyList()
        val perSettimana = log.groupBy { it.data.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)) }
        val ultima = perSettimana.keys.maxOrNull() ?: return emptyList()
        val prima = perSettimana.keys.minOrNull() ?: ultima

        return (0 until maxSettimane)
            .map { ultima.minusWeeks(it.toLong()) }
            .filter { !it.isBefore(prima) }
            .map { lunedi ->
                val l = perSettimana[lunedi].orEmpty()
                val presenti = l.filter { it.presente }
                val rpe = presenti.mapNotNull { it.rpe }
                RiepilogoSettimana(
                    lunedi = lunedi,
                    sedute = presenti.size,
                    assenze = l.size - presenti.size,
                    metri = presenti.sumOf { it.metriEffettivi },
                    rpeMedio = if (rpe.isEmpty()) null else rpe.average(),
                    caricoSrpe = presenti.sumOf { (it.rpe ?: 0) * it.durataMin },
                    metriPrevisti = micro.firstOrNull { it.inizio == lunedi }
                        ?.let { VolumeIndividuale.settimana(it, atleta, assenze).metri }
                )
            }
    }
}