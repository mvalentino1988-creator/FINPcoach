package com.mattia.nuotoparalimpico.domain

import com.mattia.nuotoparalimpico.data.Stile

/**
 * Sistema di gestione del regolamento tecnico FINP/Paralympic per suggerire gare appropriate
 * in base alla classe di classificazione dell'atleta.
 * 
 * Basato sul Regolamento Tecnico Nuoto FINP 2026 e World Para Swimming Rules.
 */

data class GaraDisponibile(
    val distanzaMetri: Int,
    val stile: Stile,
    val descrizione: String,
    val minClasse: Int? = null,  // Classe minima per partecipare (null = tutte)
    val maxClasse: Int? = null,  // Classe massima per partecipare (null = tutte)
    val note: String = ""
)

data class SuggerimentoGara(
    val gara: GaraDisponibile,
    val priorita: Int,  // 1-5, dove 1 è la più raccomandata
    val motivazione: String
)

object RegolamentoGare {

    /**
     * Gare disponibili secondo il regolamento FINP 2026 e World Para Swimming.
     * Le classi S1-S14 sono per nuoto in vasca, SB1-SB14 per rana, SM1-SM14 per misti.
     */
    private val GARE_S_STILE_LIBERO = listOf(
        GaraDisponibile(50, Stile.STILE_LIBERO, "50m Stile Libero"),
        GaraDisponibile(100, Stile.STILE_LIBERO, "100m Stile Libero"),
        GaraDisponibile(200, Stile.STILE_LIBERO, "200m Stile Libero"),
        GaraDisponibile(400, Stile.STILE_LIBERO, "400m Stile Libero", minClasse = 1, maxClasse = 10),
        GaraDisponibile(800, Stile.STILE_LIBERO, "800m Stile Libero", minClasse = 1, maxClasse = 8),
        GaraDisponibile(1500, Stile.STILE_LIBERO, "1500m Stile Libero", minClasse = 1, maxClasse = 7)
    )

    private val GARE_S_DORSO = listOf(
        GaraDisponibile(50, Stile.DORSO, "50m Dorso"),
        GaraDisponibile(100, Stile.DORSO, "100m Dorso"),
        GaraDisponibile(200, Stile.DORSO, "200m Dorso")
    )

    private val GARE_S_RANA = listOf(
        GaraDisponibile(50, Stile.RANA, "50m Rana"),
        GaraDisponibile(100, Stile.RANA, "100m Rana")
    )

    private val GARE_S_FARFALLA = listOf(
        GaraDisponibile(50, Stile.FARFALLA, "50m Farfalla"),
        GaraDisponibile(100, Stile.FARFALLA, "100m Farfalla")
    )

    private val GARE_S_MISTI = listOf(
        GaraDisponibile(150, Stile.MISTI, "150m Misti"),
        GaraDisponibile(200, Stile.MISTI, "200m Misti")
    )

    private val GARE_SB_RANA = listOf(
        GaraDisponibile(50, Stile.RANA, "50m Rana (SB)"),
        GaraDisponibile(100, Stile.RANA, "100m Rana (SB)")
    )

    private val GARE_SM_MISTI = listOf(
        GaraDisponibile(150, Stile.MISTI, "150m Misti (SM)"),
        GaraDisponibile(200, Stile.MISTI, "200m Misti (SM)")
    )

    /**
     * Suggerisce le gare più appropriate per un atleta in base alla sua classe di classificazione.
     * 
     * @param classeS Classe per stile libero/dorso/farfalla (null se non classificato)
     * @param classeSB Classe per rana (null se non classificato)
     * @param classeSM Classe per misti (null se non classificato)
     * @param tempiDisponibili Tempi registrati dall'atleta per dare priorità alle gare migliori
     * @return Lista di suggerimenti ordinati per priorità
     */
    fun suggerisciGare(
        classeS: Int?,
        classeSB: Int?,
        classeSM: Int?,
        tempiDisponibili: Map<Pair<Stile, Int>, Int> = emptyMap()
    ): List<SuggerimentoGara> {
        val suggerimenti = mutableListOf<SuggerimentoGara>()

        // Suggerimenti per Stile Libero (classe S)
        if (classeS != null) {
            suggerimenti += suggerisciPerClasse(GARE_S_STILE_LIBERO, classeS, tempiDisponibili, "S")
            suggerimenti += suggerisciPerClasse(GARE_S_DORSO, classeS, tempiDisponibili, "S")
            suggerimenti += suggerisciPerClasse(GARE_S_FARFALLA, classeS, tempiDisponibili, "S")
            suggerimenti += suggerisciPerClasse(GARE_S_MISTI, classeS, tempiDisponibili, "S")
        }

        // Suggerimenti per Rana (classe SB)
        if (classeSB != null) {
            suggerimenti += suggerisciPerClasse(GARE_SB_RANA, classeSB, tempiDisponibili, "SB")
        }

        // Suggerimenti per Misti (classe SM)
        if (classeSM != null) {
            suggerimenti += suggerisciPerClasse(GARE_SM_MISTI, classeSM, tempiDisponibili, "SM")
        }

        // Se non classificato, suggerisci gare generiche
        if (classeS == null && classeSB == null && classeSM == null) {
            suggerimenti += GARE_S_STILE_LIBERO.take(3).map { gara ->
                SuggerimentoGara(
                    gara = gara,
                    priorita = 3,
                    motivazione = "Gara standard consigliata per atleti non classificati"
                )
            }
        }

        return suggerimenti.sortedBy { it.priorita }
    }

    private fun suggerisciPerClasse(
        gare: List<GaraDisponibile>,
        classe: Int,
        tempi: Map<Pair<Stile, Int>, Int>,
        prefissoClasse: String
    ): List<SuggerimentoGara> {
        val gareValide = gare.filter { gara ->
            (gara.minClasse == null || classe >= gara.minClasse) &&
            (gara.maxClasse == null || classe <= gara.maxClasse)
        }

        return gareValide.mapIndexed { index, gara ->
            val prioritaBase = when (index) {
                0 -> 1 // Prima gara più importante
                1 -> 2
                else -> 3
            }

            val haTempo = tempi.containsKey(Pair(gara.stile, gara.distanzaMetri))
            val priorita = if (haTempo) prioritaBase else prioritaBase + 1

            val motivazione = buildString {
                append("Gara ")
                append(prefissoClasse)
                append(classe)
                append(" - ")
                if (haTempo) {
                    append("⭐ Hai già un tempo registrato, gare ideale per migliorare il PB")
                } else {
                    append("Consigliata per la tua classe di classificazione")
                }
                if (gara.note.isNotBlank()) {
                    append(". ")
                    append(gara.note)
                }
            }

            SuggerimentoGara(gara, priorita, motivazione)
        }
    }

    /**
     * Verifica se una gara è consentita per una specifica classe.
     */
    fun isGaraConsentita(gara: GaraDisponibile, classe: Int, tipoClasse: String): Boolean {
        return when (tipoClasse) {
            "S", "SB", "SM" -> {
                (gara.minClasse == null || classe >= gara.minClasse) &&
                (gara.maxClasse == null || classe <= gara.maxClasse)
            }
            else -> true
        }
    }

    /**
     * Restituisce tutte le gare disponibili per un dato stile.
     */
    fun getGarePerStile(stile: Stile): List<GaraDisponibile> {
        return when (stile) {
            Stile.STILE_LIBERO -> GARE_S_STILE_LIBERO
            Stile.DORSO -> GARE_S_DORSO
            Stile.RANA -> GARE_S_RANA
            Stile.FARFALLA -> GARE_S_FARFALLA
            Stile.MISTI -> GARE_S_MISTI
        }
    }

    /**
     * Informazioni sulle restrizioni di classe per gare di lunga distanza.
     * Secondo il regolamento FINP 2026, alcune gare lunghe non sono disponibili per classi più severe.
     */
    fun getNoteRegolamento(classe: Int): List<String> {
        val note = mutableListOf<String>()

        if (classe >= 11) {
            note += "Classi S11-S14: gare di 400m, 800m e 1500m non disponibili in competizioni internazionali"
        }
        if (classe >= 9) {
            note += "Classi S9-S14: 1500m stile libero non disponibile ai Giochi Paralimpici"
        }
        if (classe >= 8) {
            note += "Classi S8-S14: 800m stile libero non disponibile ai Giochi Paralimpici"
        }

        return note
    }
}
