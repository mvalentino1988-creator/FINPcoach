package com.mattia.nuotoparalimpico.domain

import com.mattia.nuotoparalimpico.data.AmbitoRanking
import com.mattia.nuotoparalimpico.data.Atleta
import com.mattia.nuotoparalimpico.data.CondizioneMedica
import com.mattia.nuotoparalimpico.data.ContestoTempo
import com.mattia.nuotoparalimpico.data.Gara
import com.mattia.nuotoparalimpico.data.LogSeduta
import com.mattia.nuotoparalimpico.data.RankingAtleta
import com.mattia.nuotoparalimpico.data.StatoClassificazione
import com.mattia.nuotoparalimpico.data.Stile
import com.mattia.nuotoparalimpico.data.Tempo
import java.time.LocalDate
import java.time.Period
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit

fun nomeStile(s: Stile): String = when (s) {
    Stile.STILE_LIBERO -> "Stile libero"
    Stile.DORSO -> "Dorso"
    Stile.RANA -> "Rana"
    Stile.FARFALLA -> "Farfalla"
    Stile.MISTI -> "Misti"
}

enum class CategoriaClasse(val prefisso: String) { S("S"), SB("SB"), SM("SM") }

data class GaraDisponibile(
    val distanzaMetri: Int,
    val stile: Stile,
    val categoria: CategoriaClasse,
    val classi: Set<Int>,
    val descrizione: String
)

data class SuggerimentoGara(
    val gara: GaraDisponibile,
    val classeAtleta: Int,
    val priorita: Int,            // 1 principale, 2 secondaria, 3 opzionale
    val punteggio: Int,
    val motivazione: List<String>,
    val pbCentesimi: Int?
) {
    val etichettaPriorita: String
        get() = when (priorita) {
            1 -> "Principale"
            2 -> "Secondaria"
            else -> "Opzionale"
        }
}

/**
 * Programma gare per classe e motore dei consigli.
 *
 * ATTENZIONE: il PROGRAMMA è il programma standard World Para Swimming / Paralimpico (nuoto in vasca).
 * Non viene letto dal PDF: va verificato ogni stagione sul Regolamento Tecnico Nuoto FINP e sul
 * World Para Swimming Rules and Regulations (sezione Regolamenti dell'app).
 */
object RegolamentoGare {

    private val FORMATO = DateTimeFormatter.ofPattern("dd/MM/yyyy")

    private fun voce(d: Int, s: Stile, c: CategoriaClasse, classi: Collection<Int>) =
        GaraDisponibile(d, s, c, classi.toSet(), "${d}m ${nomeStile(s)}")

    val PROGRAMMA: List<GaraDisponibile> = listOf(
        voce(50, Stile.STILE_LIBERO, CategoriaClasse.S, 3..13),
        voce(100, Stile.STILE_LIBERO, CategoriaClasse.S, 4..14),
        voce(200, Stile.STILE_LIBERO, CategoriaClasse.S, (2..5) + 14),
        voce(400, Stile.STILE_LIBERO, CategoriaClasse.S, 6..13),
        voce(50, Stile.DORSO, CategoriaClasse.S, 1..5),
        voce(100, Stile.DORSO, CategoriaClasse.S, listOf(1, 2) + (6..14)),
        voce(50, Stile.FARFALLA, CategoriaClasse.S, 5..7),
        voce(100, Stile.FARFALLA, CategoriaClasse.S, 8..14),
        voce(50, Stile.RANA, CategoriaClasse.SB, 1..3),
        voce(100, Stile.RANA, CategoriaClasse.SB, (4..9) + (11..14)),   // SB10 non esiste
        voce(150, Stile.MISTI, CategoriaClasse.SM, 1..4),
        voce(200, Stile.MISTI, CategoriaClasse.SM, 5..14)
    )

    fun note(atleta: Atleta): List<String> {
        val n = mutableListOf<String>()
        if (atleta.stato == StatoClassificazione.IN_ATTESA) {
            n += "Classificazione in attesa: i consigli valgono per le classi inserite e sono provvisori."
        }
        if (atleta.classeS in 11..13) n += "Classi visive (S11-S13): previsto il tapper; per S11 occhialini oscurati."
        n += "Dopo una rivalutazione la classe può cambiare, e con essa il programma gare."
        return n
    }

    fun suggerisciGare(
        atleta: Atleta,
        tempi: List<Tempo>,
        ranking: List<RankingAtleta>,
        log: List<LogSeduta>,
        condizioni: List<CondizioneMedica>,
        gare: List<Gara>,
        oggi: LocalDate
    ): List<SuggerimentoGara> {
        val profilo = CalcoloCarico.profilo(log, oggi)
        val eta = atleta.dataNascita?.let { Period.between(it, oggi).years }
        val testoMedico = condizioni.filter { it.attiva }
            .joinToString(" ") { "${it.descrizione} ${it.limitazioni}" }.lowercase()
        val spalla = listOf("spalla", "cuffia", "rotator", "articolar").any { testoMedico.contains(it) }
        val neuro = listOf("spastic", "neurolog", "sclerosi", "midoll", "parapleg", "tetrapleg", "emipares", "cerebr")
            .any { testoMedico.contains(it) }
        val cardio = listOf("cardio", "cuore", "pression", "iperten").any { testoMedico.contains(it) }
        val prossimaPrioritaria = gare.filter { it.prioritaria && !it.dal.isBefore(oggi) }.minByOrNull { it.dal }
        val giorniAllaGara = prossimaPrioritaria?.let { ChronoUnit.DAYS.between(oggi, it.dal) }
        val mieiRanking = ranking.filter { it.atletaId == atleta.id }

        val risultati = mutableListOf<SuggerimentoGara>()
        for (g in PROGRAMMA) {
            val classe = when (g.categoria) {
                CategoriaClasse.S -> atleta.classeS
                CategoriaClasse.SB -> atleta.classeSB
                CategoriaClasse.SM -> atleta.classeSM
            } ?: continue
            if (classe !in g.classi) continue

            var p = 20
            val motivi = mutableListOf("Nel programma WPS per la classe ${g.categoria.prefisso}$classe")

            // Tempi
            val gareTempi = tempi.filter {
                it.contesto == ContestoTempo.GARA && it.stile == g.stile && it.distanzaMetri == g.distanzaMetri
            }.sortedBy { it.data }
            val pb = gareTempi.minByOrNull { it.centesimi }
            if (pb != null) {
                p += 25
                motivi += "PB ${formattaTempo(pb.centesimi)} (${pb.data.format(FORMATO)})"
                val giorni = ChronoUnit.DAYS.between(pb.data, oggi)
                if (giorni <= 180) p += 5 else if (giorni > 365) { p -= 5; motivi += "tempo datato (oltre un anno)" }
                if (gareTempi.size >= 2) {
                    val ultimo = gareTempi.last()
                    val migliorePrima = gareTempi.dropLast(1).minOf { it.centesimi }
                    if (ultimo.centesimi < migliorePrima) { p += 8; motivi += "ultimo tempo in miglioramento" }
                    else if (ultimo.centesimi > migliorePrima * 1.02) { p -= 3; motivi += "ultimo tempo sopra il PB" }
                }
                if (giorniAllaGara != null && giorniAllaGara <= 70 && giorni <= 120) {
                    p += 5
                    motivi += "tempo recente, vicino alla gara prioritaria «${prossimaPrioritaria.nome}»"
                }
            } else {
                val altri = tempi.any { it.contesto != ContestoTempo.GARA && it.stile == g.stile && it.distanzaMetri == g.distanzaMetri }
                if (altri) { p += 8; motivi += "ha tempi di test/allenamento, nessun tempo di gara" }
                else motivi += "nessun tempo registrato: da testare"
            }

            // Ranking
            mieiRanking.filter { it.stile == g.stile && it.distanzaMetri == g.distanzaMetri }.forEach { r ->
                val fa = ChronoUnit.DAYS.between(r.aggiornatoIl, oggi)
                val dato = if (fa > 60) " (dato di $fa giorni fa)" else ""
                when (r.ambito) {
                    AmbitoRanking.ITALIA -> {
                        if (r.posizione <= 3) p += 20 else if (r.posizione <= 10) p += 10
                        motivi += "n° ${r.posizione} in Italia$dato"
                    }
                    AmbitoRanking.MONDO -> {
                        if (r.posizione <= 8) p += 25 else if (r.posizione <= 20) p += 15 else if (r.posizione <= 50) p += 5
                        motivi += "n° ${r.posizione} nel mondo$dato"
                    }
                }
            }

            // Età
            if (eta != null) {
                if (eta < 14 && g.distanzaMetri >= 400) { p -= 25; motivi += "distanza lunga: sconsigliata sotto i 14 anni" }
                else if (eta < 12 && g.distanzaMetri >= 200) { p -= 10; motivi += "under 12: preferibili distanze brevi" }
            }

            // Capacità reale (volume abituale)
            val medi = profilo.metriMedi
            if (profilo.sedute >= CalcoloCarico.SEDUTE_MINIME && medi != null) {
                if (g.distanzaMetri >= 400 && medi < 1500) { p -= 15; motivi += "volume abituale ~$medi m a seduta: base aerobica da costruire" }
                else if (g.distanzaMetri >= 200 && medi < 1000) { p -= 8; motivi += "volume abituale ~$medi m a seduta" }
            }

            // Condizioni mediche
            if (spalla && g.stile == Stile.FARFALLA) { p -= 12; motivi += "spalla: la farfalla è molto gravosa" }
            if (neuro && g.distanzaMetri >= 200) { p -= 8; motivi += "lattato elevato può aggravare la spasticità" }
            if (cardio && g.distanzaMetri <= 50) { p -= 8; motivi += "sforzi massimali brevi: da valutare con il medico" }

            risultati += SuggerimentoGara(g, classe, 3, p, motivi, pb?.centesimi)
        }

        return risultati.sortedByDescending { it.punteggio }
            .take(8)
            .mapIndexed { i, s -> s.copy(priorita = if (i < 3) 1 else if (i < 6) 2 else 3) }
    }
}