package com.mattia.nuotoparalimpico.domain

import com.mattia.nuotoparalimpico.data.Atleta
import com.mattia.nuotoparalimpico.data.CondizioneMedica
import com.mattia.nuotoparalimpico.data.LogSeduta
import com.mattia.nuotoparalimpico.data.Stagione
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.Period
import java.time.temporal.ChronoUnit
import java.time.temporal.TemporalAdjusters
import kotlin.math.roundToInt

/** Tutto ciò che l'app può decidere da sola. Ogni valore è un punto di partenza: la UI permette di sovrascriverlo. */
object AutoPianificatore {

    private val GIORNI_DEFAULT = setOf(DayOfWeek.WEDNESDAY, DayOfWeek.SATURDAY)
    private val PAROLE_GARA_IMPORTANTE = listOf(
        "campionat", "assolut", "italian", "nazional", "final", "mondial", "europe", "paralimp", "world", "coni"
    )

    fun inizioStagioneSuggerito(oggi: LocalDate): LocalDate {
        val anno = if (oggi.monthValue >= 7) oggi.year else oggi.year - 1
        return LocalDate.of(anno, 9, 1).with(TemporalAdjusters.nextOrSame(DayOfWeek.MONDAY))
    }

    fun fineStagioneSuggerita(inizio: LocalDate): LocalDate {
        val anno = if (inizio.monthValue >= 7) inizio.year + 1 else inizio.year
        return LocalDate.of(anno, 6, 30)
    }

    fun nomeStagione(inizio: LocalDate, fine: LocalDate): String =
        if (inizio.year == fine.year) "${inizio.year}"
        else "${inizio.year}/${(fine.year % 100).toString().padStart(2, '0')}"

    fun garaProbabilmentePrioritaria(nome: String): Boolean {
        val n = nome.lowercase()
        return n.isNotBlank() && PAROLE_GARA_IMPORTANTE.any { n.contains(it) }
    }

    fun parametriAuto(atleti: List<Atleta>, log: List<LogSeduta>, stagione: Stagione?, oggi: LocalDate): ParametriPiano {
        val settimane = stagione?.let { ChronoUnit.WEEKS.between(it.inizio, it.fine) } ?: 40L
        val eta = etaMediana(atleti, oggi)
        return ParametriPiano(
            giorniAllenamento = giorniDaStorico(log, oggi) ?: GIORNI_DEFAULT,
            numeroMacrocicli = if (settimane > 40) 2 else 1,
            metriBaseSeduta = metriBaseDaStorico(log, atleti, oggi) ?: metriBaseDaEta(eta),
            settimaneCicloCarico = if (eta != null && (eta < 12 || eta >= 35)) 3 else 4
        )
    }

    /** Fattore volume suggerito (multipli di 5%). Punto di partenza: l'allenatore può passare a manuale. */
    fun fattoreVolumeSuggerito(atleta: Atleta, condizioniAttive: List<CondizioneMedica>, oggi: LocalDate): Double {
        val eta = atleta.dataNascita?.let { Period.between(it, oggi).years }
        var f = when {
            eta == null -> 1.0
            eta < 10 -> 0.5
            eta < 12 -> 0.6
            eta <= 14 -> 0.8
            eta <= 17 -> 0.9
            eta >= 60 -> 0.7
            eta >= 50 -> 0.8
            eta >= 35 -> 0.9
            else -> 1.0
        }
        val testo = condizioniAttive.joinToString(" | ") { "${it.descrizione} ${it.limitazioni}" }
        if (testo.isNotBlank()) {
            val stima = FINPSpecialistAI.analizza(testo, "", eta).stimaClassi
            val s = atleta.classeS ?: if (stima.eleggibile) stima.classeS else null
            f *= when (s) {
                null -> 1.0
                in 1..3 -> 0.7
                in 4..6 -> 0.85
                else -> 1.0
            }
            val flag = FINPSpecialistAI.flagMedici(testo)
            if (flag.cardiorespiratoria) f *= 0.85
            if (flag.spalla) f *= 0.9
        }
        return ((f * 20).roundToInt() / 20.0).coerceIn(0.4, 1.0)
    }

    // ---------------------------------------------------------------- interni

    private fun giorniDaStorico(log: List<LogSeduta>, oggi: LocalDate): Set<DayOfWeek>? {
        val date = log.filter { it.presente && !it.data.isBefore(oggi.minusWeeks(8)) && !it.data.isAfter(oggi) }
            .map { it.data }.distinct()
        if (date.size < 4) return null
        val settimane = date.map { it.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)) }
            .distinct().size.coerceAtLeast(1)
        val scelti = date.groupingBy { it.dayOfWeek }.eachCount()
            .filterValues { it >= settimane * 0.4 }.keys
        return scelti.takeIf { it.isNotEmpty() }?.toSet()
    }

    private fun metriBaseDaStorico(log: List<LogSeduta>, atleti: List<Atleta>, oggi: LocalDate): Int? {
        val fattori = atleti.associate { it.id to it.fattoreVolume.coerceAtLeast(0.1) }
        val perGiorno = log
            .filter { it.presente && it.metriEffettivi >= 400 && !it.data.isBefore(oggi.minusWeeks(8)) && !it.data.isAfter(oggi) }
            .groupBy { it.data }
            .map { (_, l) -> mediana(l.map { (it.metriEffettivi / (fattori[it.atletaId] ?: 1.0)).roundToInt() }) }
        if (perGiorno.size < 4) return null
        return ((mediana(perGiorno) + 50) / 100 * 100).coerceIn(600, 6000)
    }

    private fun metriBaseDaEta(eta: Int?): Int = when {
        eta == null -> 1800
        eta < 12 -> 1200
        eta <= 14 -> 1800
        eta <= 17 -> 2200
        eta <= 34 -> 2400
        else -> 1800
    }

    private fun etaMediana(atleti: List<Atleta>, oggi: LocalDate): Int? {
        val anni = atleti.mapNotNull { a -> a.dataNascita?.let { Period.between(it, oggi).years } }
        return if (anni.isEmpty()) null else mediana(anni)
    }

    private fun mediana(v: List<Int>): Int = v.sorted()[v.size / 2]
}