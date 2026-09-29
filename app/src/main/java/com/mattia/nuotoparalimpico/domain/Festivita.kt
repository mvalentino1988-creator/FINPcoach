package com.mattia.nuotoparalimpico.domain

import com.mattia.nuotoparalimpico.data.Chiusura
import com.mattia.nuotoparalimpico.data.Stagione
import java.time.LocalDate

object Festivita {

    /** Algoritmo di Meeus/Jones/Butcher (calendario gregoriano). */
    fun pasqua(anno: Int): LocalDate {
        val a = anno % 19
        val b = anno / 100
        val c = anno % 100
        val d = b / 4
        val e = b % 4
        val f = (b + 8) / 25
        val g = (b - f + 1) / 3
        val h = (19 * a + b - d - g + 15) % 30
        val i = c / 4
        val k = c % 4
        val l = (32 + 2 * e + 2 * i - h - k) % 7
        val m = (a + 11 * h + 22 * l) / 451
        val mese = (h + l - 7 * m + 114) / 31
        val giorno = (h + l - 7 * m + 114) % 31 + 1
        return LocalDate.of(anno, mese, giorno)
    }

    /**
     * Festività nazionali che cadono dentro la stagione, come chiusure di un giorno.
     * Le pause natalizie/estive della vasca e le feste patronali locali vanno inserite a mano.
     */
    fun perStagione(stagione: Stagione): List<Chiusura> {
        val risultato = mutableListOf<Chiusura>()
        for (anno in stagione.inizio.year..stagione.fine.year) {
            val pasqua = pasqua(anno)
            val voci = listOf(
                LocalDate.of(anno, 1, 1) to "Capodanno",
                LocalDate.of(anno, 1, 6) to "Epifania",
                pasqua to "Pasqua",
                pasqua.plusDays(1) to "Lunedì dell'Angelo",
                LocalDate.of(anno, 4, 25) to "Festa della Liberazione",
                LocalDate.of(anno, 5, 1) to "Festa del Lavoro",
                LocalDate.of(anno, 6, 2) to "Festa della Repubblica",
                LocalDate.of(anno, 8, 15) to "Ferragosto",
                LocalDate.of(anno, 11, 1) to "Ognissanti",
                LocalDate.of(anno, 12, 8) to "Immacolata Concezione",
                LocalDate.of(anno, 12, 25) to "Natale",
                LocalDate.of(anno, 12, 26) to "Santo Stefano"
            )
            for (voce in voci) {
                val data = voce.first
                if (!data.isBefore(stagione.inizio) && !data.isAfter(stagione.fine)) {
                    risultato += Chiusura(stagioneId = stagione.id, dal = data, al = data, motivo = voce.second)
                }
            }
        }
        return risultato.sortedBy { it.dal }
    }
}
