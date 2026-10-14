package com.mattia.nuotoparalimpico.domain

import com.mattia.nuotoparalimpico.data.Stile
import com.mattia.nuotoparalimpico.data.ContestoTempo

/**
 * Parser di linguaggio naturale per l'inserimento di tempi di gara e allenamenti.
 * Approccio ibrido: prima tenta il parsing locale (regex), se fallisce chiede chiarimenti.
 */
data class RisultatoParsing(
    val successo: Boolean,
    val dati: DatiParsati? = null,
    val domande: List<String> = emptyList(),
    val messaggio: String = ""
)

data class DatiParsati(
    val stile: Stile?,
    val distanzaMetri: Int?,
    val centesimi: Int?,
    val note: String = "",
    val contesto: ContestoTempo = ContestoTempo.GARA,
    val vascaMetri: Int = 25
)

object NLPParser {

    // Pattern regex per diversi formati di input
    private val PATTERN_TEMPO = Regex("""(\d+)[:.](\d{2})[:.](\d{2})|(\d+)[:.](\d{2})|(\d+)(?:m| metri)?""")
    private val PATTERN_STILE = Regex("""(stile\s*libero|libero|sl|crawl|freestyle|dorso|back|d|rana|breaststroke|br|farfalla|fly|f|misti|medley|im)""", RegexOption.IGNORE_CASE)
    private val PATTERN_DISTANZA = Regex("""(\d+)\s*(?:m|metri)""")
    private val PATTERN_GARA = Regex("""(gara|competizione|campionato|race)""", RegexOption.IGNORE_CASE)
    private val PATTERN_ALLENAMENTO = Regex("""(allenamento|training|test|prove)""", RegexOption.IGNORE_CASE)
    private val PATTERN_VASCA = Regex("""(vasca\s*)?(\d+)\s*m""", RegexOption.IGNORE_CASE)

    /**
     * Parsing di un testo libero per estrarre dati di un tempo di gara.
     * Ritorna un RisultatoParsing con successo, dati parsati, o domande per chiarimenti.
     */
    fun parseTempo(testo: String): RisultatoParsing {
        val t = testo.trim().lowercase()

        // Estrazione stile
        val stileMatch = PATTERN_STILE.find(t)
        val stile = when (stileMatch?.value?.lowercase()) {
            "stile libero", "libero", "sl", "crawl", "freestyle" -> Stile.STILE_LIBERO
            "dorso", "back", "d" -> Stile.DORSO
            "rana", "breaststroke", "br" -> Stile.RANA
            "farfalla", "fly", "f" -> Stile.FARFALLA
            "misti", "medley", "im" -> Stile.MISTI
            else -> null
        }

        // Estrazione distanza
        val distanzaMatch = PATTERN_DISTANZA.find(t)
        val distanza = distanzaMatch?.groupValues?.get(1)?.toIntOrNull()

        // Estrazione tempo
        val tempoMatch = PATTERN_TEMPO.find(t)
        val centesimi = when {
            tempoMatch?.groupValues?.get(1) != null -> {
                // formato mm:ss.cc
                val min = tempoMatch.groupValues[1].toIntOrNull() ?: 0
                val sec = tempoMatch.groupValues[2].toIntOrNull() ?: 0
                val cent = tempoMatch.groupValues[3].toIntOrNull() ?: 0
                min * 6000 + sec * 100 + cent
            }
            tempoMatch?.groupValues?.get(4) != null -> {
                // formato ss.cc
                val sec = tempoMatch.groupValues[4].toIntOrNull() ?: 0
                val cent = tempoMatch.groupValues[5].toIntOrNull() ?: 0
                sec * 100 + cent
            }
            else -> null
        }

        // Estrazione contesto
        val contesto = when {
            PATTERN_GARA.containsMatchIn(t) -> ContestoTempo.GARA
            PATTERN_ALLENAMENTO.containsMatchIn(t) -> ContestoTempo.ALLENAMENTO
            else -> ContestoTempo.GARA
        }

        // Estrazione vasca
        val vascaMatch = PATTERN_VASCA.find(t)
        val vasca = vascaMatch?.groupValues?.get(2)?.toIntOrNull() ?: 25

        // Verifica cosa manca e genera domande
        val domande = mutableListOf<String>()
        if (stile == null) domande += "Quale stile? (stile libero, dorso, rana, farfalla, misti)"
        if (distanza == null) domande += "Quale distanza? (es. 50m, 100m, 200m)"
        if (centesimi == null) domande += "Qual è il tempo? (es. 1:02.35 per 1 minuto e 2.35 secondi)"

        if (domande.isNotEmpty()) {
            return RisultatoParsing(
                successo = false,
                domande = domande,
                messaggio = "Non ho capito completamente. ${domande.joinToString(" ")}"
            )
        }

        return RisultatoParsing(
            successo = true,
            dati = DatiParsati(
                stile = stile,
                distanzaMetri = distanza,
                centesimi = centesimi,
                note = testo,
                contesto = contesto,
                vascaMetri = vasca
            ),
            messaggio = "Ho capito: ${stile?.etichetta} ${distanza}m in ${formattaTempo(centesimi!!)}"
        )
    }

    /**
     * Parsing di un testo libero per estrarre dati di una seduta di allenamento.
     */
    fun parseSeduta(testo: String): RisultatoParsing {
        val t = testo.trim().lowercase()

        // Estrazione metri totali
        val distanzaMatch = PATTERN_DISTANZA.find(t)
        val metri = distanzaMatch?.groupValues?.get(1)?.toIntOrNull()

        // Estrazione durata (minuti)
        val durataMatch = Regex("""(\d+)\s*(?:min|minuti|m)""").find(t)
        val durata = durataMatch?.groupValues?.get(1)?.toIntOrNull()

        // Estrazione RPE
        val rpeMatch = Regex("""rpe\s*:?\s*(\d+)""").find(t)
        val rpe = rpeMatch?.groupValues?.get(1)?.toIntOrNull()

        val domande = mutableListOf<String>()
        if (metri == null) domande += "Quanti metri hai fatto? (es. 2000m)"
        if (durata == null) domande += "Quanto è durata la seduta? (es. 60 min)"

        if (domande.isNotEmpty()) {
            return RisultatoParsing(
                successo = false,
                domande = domande,
                messaggio = "Non ho capito completamente. ${domande.joinToString(" ")}"
            )
        }

        return RisultatoParsing(
            successo = true,
            dati = DatiParsati(
                stile = null,
                distanzaMetri = metri,
                centesimi = null,
                note = testo,
                contesto = ContestoTempo.ALLENAMENTO
            ),
            messaggio = "Ho capito: ${metri}m in ${durata}min" + (if (rpe != null) " con RPE $rpe" else "")
        )
    }

    /**
     * Formatta i centesimi in formato mm:ss.cc
     */
    private fun formattaTempo(centesimi: Int): String {
        val min = centesimi / 6000
        val sec = (centesimi % 6000) / 100
        val cent = centesimi % 100
        return if (min > 0) {
            String.format("%d:%02d.%02d", min, sec, cent)
        } else {
            String.format("%02d.%02d", sec, cent)
        }
    }

    /**
     * Funzione pubblica per formattare il tempo per display
     */
    fun formattaTempoDisplay(centesimi: Int): String = formattaTempo(centesimi)
}
