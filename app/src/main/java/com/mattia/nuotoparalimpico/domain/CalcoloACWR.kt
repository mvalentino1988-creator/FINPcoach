package com.mattia.nuotoparalimpico.domain

import com.mattia.nuotoparalimpico.data.LogSeduta
import java.time.LocalDate
import java.time.temporal.ChronoUnit
import java.util.Locale

/**
 * SICURO = carico acuto sotto il cronico (nessun picco; attenzione al detraining).
 * Soglie di default da letteratura (zona 0.8-1.3, rischio > 1.5): configurabili.
 */
enum class LivelloAcwr(
    val etichetta: String,
    val simbolo: String,
    val coloreContainerHex: Long,
    val coloreTestoHex: Long
) {
    SICURO("Sicuro", "▽", 0xFFE0F2FE, 0xFF0369A1),
    OTTIMALE("Ottimale", "✓", 0xFFDCFCE7, 0xFF166534),
    ATTENZIONE("Attenzione", "!", 0xFFFEF3C7, 0xFFB45309),
    RISCHIO("Rischio", "⚠", 0xFFFEE2E2, 0xFFB91C1C)
}

data class SogliaAcwr(
    val sicuroSotto: Double = 0.8,
    val ottimaleFinoA: Double = 1.3,
    val attenzioneFinoA: Double = 1.5
)

data class RisultatoAcwr(
    val riferimento: LocalDate,
    val caricoAcuto: Int,          // somma sRPE ultimi 7 giorni
    val caricoCronico: Double,     // media settimanale sRPE ultimi 28 giorni
    val rapporto: Double?,         // null se non calcolabile
    val livello: LivelloAcwr?,     // null se non affidabile
    val affidabile: Boolean,
    val giorniStorico: Int,
    val sedutePrivediRpe: Int,     // presenti senza RPE: carico sottostimato
    val messaggio: String
)

object CalcoloAcwr {
    const val GIORNI_ACUTO = 7
    const val GIORNI_CRONICO = 28

    /** sRPE = RPE x minuti. Assente = 0. Presente senza RPE/durata = null (dato mancante). */
    fun caricoSeduta(l: LogSeduta): Int? = when {
        !l.presente -> 0
        l.rpe == null || l.durataMin <= 0 -> null
        else -> l.rpe * l.durataMin
    }

    fun classifica(rapporto: Double, soglie: SogliaAcwr = SogliaAcwr()): LivelloAcwr = when {
        rapporto < soglie.sicuroSotto -> LivelloAcwr.SICURO
        rapporto <= soglie.ottimaleFinoA -> LivelloAcwr.OTTIMALE
        rapporto <= soglie.attenzioneFinoA -> LivelloAcwr.ATTENZIONE
        else -> LivelloAcwr.RISCHIO
    }

    /** Finestre mobili (non settimane di calendario): le settimane senza sedute contano come 0. */
    fun calcola(
        log: List<LogSeduta>,
        riferimento: LocalDate,
        soglie: SogliaAcwr = SogliaAcwr()
    ): RisultatoAcwr {
        val fino = log.filter { !it.data.isAfter(riferimento) }
        val primo = fino.minOfOrNull { it.data }
        val giorniStorico =
            if (primo == null) 0 else (ChronoUnit.DAYS.between(primo, riferimento) + 1).toInt()

        fun giorniFa(l: LogSeduta) = ChronoUnit.DAYS.between(l.data, riferimento)

        val finestraCronica = fino.filter { giorniFa(it) < GIORNI_CRONICO }
        val finestraAcuta = finestraCronica.filter { giorniFa(it) < GIORNI_ACUTO }
        val senzaRpe = finestraCronica.count { it.presente && caricoSeduta(it) == null }
        val acuto = finestraAcuta.sumOf { caricoSeduta(it) ?: 0 }
        val cronico = finestraCronica.sumOf { caricoSeduta(it) ?: 0 } /
            (GIORNI_CRONICO / GIORNI_ACUTO.toDouble())

        if (giorniStorico < GIORNI_CRONICO) {
            return RisultatoAcwr(
                riferimento, acuto, cronico, null, null, false, giorniStorico, senzaRpe,
                "Servono almeno 4 settimane di storico con RPE (disponibili: $giorniStorico giorni)."
            )
        }
        if (cronico <= 0.0) {
            return RisultatoAcwr(
                riferimento, acuto, cronico, null, null, false, giorniStorico, senzaRpe,
                "Carico cronico nullo: registra durata e RPE delle sedute."
            )
        }
        val rapporto = acuto / cronico
        val livello = classifica(rapporto, soglie)
        val testoRapporto = String.format(Locale.ITALY, "%.2f", rapporto)
        val msg = buildString {
            append("ACWR $testoRapporto - ${livello.etichetta}. ")
            append(
                when (livello) {
                    LivelloAcwr.SICURO -> "Carico recente inferiore all'abituale: nessun picco, ma verifica il mantenimento."
                    LivelloAcwr.OTTIMALE -> "Progressione del carico coerente con lo storico."
                    LivelloAcwr.ATTENZIONE -> "Incremento marcato rispetto allo storico: monitora recupero e dolori."
                    LivelloAcwr.RISCHIO -> "Picco di carico: valuta di ridurre il volume nelle prossime sedute."
                }
            )
            if (senzaRpe > 0) append(" Attenzione: $senzaRpe sedute senza RPE, carico sottostimato.")
        }
        return RisultatoAcwr(riferimento, acuto, cronico, rapporto, livello, true, giorniStorico, senzaRpe, msg)
    }

    /** Andamento per grafico/dashboard: un punto a settimana, dal più vecchio al più recente. */
    fun andamentoSettimanale(
        log: List<LogSeduta>,
        fine: LocalDate,
        settimane: Int = 8
    ): List<RisultatoAcwr> =
        (settimane - 1 downTo 0).map { calcola(log, fine.minusWeeks(it.toLong())) }

    fun mediaSquadra(risultati: List<RisultatoAcwr>): Double? =
        risultati.filter { it.affidabile }.mapNotNull { it.rapporto }
            .takeIf { it.isNotEmpty() }?.average()
}