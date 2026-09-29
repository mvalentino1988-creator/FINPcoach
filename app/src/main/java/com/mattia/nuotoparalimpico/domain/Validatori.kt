package com.mattia.nuotoparalimpico.domain

import com.mattia.nuotoparalimpico.data.Assenza
import com.mattia.nuotoparalimpico.data.Atleta
import com.mattia.nuotoparalimpico.data.CondizioneMedica
import com.mattia.nuotoparalimpico.data.Gara
import com.mattia.nuotoparalimpico.data.Microciclo
import com.mattia.nuotoparalimpico.data.Stagione
import com.mattia.nuotoparalimpico.data.StatoClassificazione
import com.mattia.nuotoparalimpico.data.TipoMicrociclo
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit
import kotlin.math.roundToInt

enum class Gravita { INFO, ATTENZIONE, ERRORE }

data class Avviso(val gravita: Gravita, val messaggio: String)

private val FORMATO_DATA: DateTimeFormatter = DateTimeFormatter.ofPattern("dd/MM/yyyy")

object ClassiSportive {
    /** Da verificare sul regolamento WPS in vigore. Nota: la classe SB10 non esiste. */
    fun valida(s: Int?, sb: Int?, sm: Int?): List<String> {
        val errori = mutableListOf<String>()
        if (s != null && s !in 1..14) errori += "Classe S$s non valida (S1–S14)"
        if (sb != null && (sb !in 1..14 || sb == 10)) errori += "Classe SB$sb non valida (SB1–SB9, SB11–SB14)"
        if (sm != null && sm !in 1..14) errori += "Classe SM$sm non valida (SM1–SM14)"
        return errori
    }
}

object PianoValidator {

    private const val SOGLIA_ATTENZIONE = 0.10
    private const val SOGLIA_ERRORE = 0.20
    private const val MAX_SETTIMANE_CARICO = 4

    fun valida(stagione: Stagione, micro: List<Microciclo>, gare: List<Gara>): List<Avviso> {
        val avvisi = mutableListOf<Avviso>()

        gare.filter { it.dal.isBefore(stagione.inizio) || it.al.isAfter(stagione.fine) }
            .forEach { avvisi += Avviso(Gravita.ERRORE, "La gara \"${it.nome}\" è fuori dalla stagione") }

        if (gare.none { it.prioritaria }) {
            avvisi += Avviso(
                Gravita.INFO,
                "Nessuna gara prioritaria: senza, il piano non prevede lo scarico pre-gara (tapering)."
            )
        }

        var riferimento: Microciclo? = null
        var caricoConsecutivi = 0

        for (m in micro.sortedBy { it.inizio }) {
            when (m.tipo) {
                TipoMicrociclo.CARICO -> {
                    caricoConsecutivi++
                    val r = riferimento
                    if (r != null && r.sedutePreviste > 0 && m.sedutePreviste > 0) {
                        val prima = r.volumeTargetMetri.toDouble() / r.sedutePreviste
                        val ora = m.volumeTargetMetri.toDouble() / m.sedutePreviste
                        if (prima > 0) {
                            val incremento = (ora - prima) / prima
                            val percentuale = (incremento * 100).roundToInt()
                            val settimana = m.inizio.format(FORMATO_DATA)
                            if (incremento > SOGLIA_ERRORE) {
                                avvisi += Avviso(
                                    Gravita.ERRORE,
                                    "Settimana del $settimana: volume per seduta +$percentuale% rispetto alla settimana di carico precedente"
                                )
                            } else if (incremento > SOGLIA_ATTENZIONE) {
                                avvisi += Avviso(
                                    Gravita.ATTENZIONE,
                                    "Settimana del $settimana: volume per seduta +$percentuale% (soglia consigliata 10%)"
                                )
                            }
                        }
                    }
                    riferimento = m
                    if (caricoConsecutivi == MAX_SETTIMANE_CARICO + 1) {
                        avvisi += Avviso(
                            Gravita.ATTENZIONE,
                            "Più di $MAX_SETTIMANE_CARICO settimane di carico consecutive dal ${m.inizio.format(FORMATO_DATA)}: valuta uno scarico"
                        )
                    }
                }
                else -> caricoConsecutivi = 0
            }
        }
        return avvisi
    }
}

object AtletaValidator {

    fun valida(
        atleta: Atleta,
        condizioni: List<CondizioneMedica>,
        assenze: List<Assenza>,
        oggi: LocalDate
    ): List<Avviso> {
        val avvisi = mutableListOf<Avviso>()

        ClassiSportive.valida(atleta.classeS, atleta.classeSB, atleta.classeSM)
            .forEach { avvisi += Avviso(Gravita.ERRORE, it) }

        if (atleta.stato == StatoClassificazione.IN_ATTESA) {
            avvisi += Avviso(
                Gravita.INFO,
                "Classificazione non ufficiale: classi e indicazioni sulle gare sono provvisorie"
            )
        }

        if (atleta.fattoreVolume < 1.0) {
            avvisi += Avviso(
                Gravita.INFO,
                "Volume ridotto al ${(atleta.fattoreVolume * 100).roundToInt()}% del volume di squadra"
            )
        }

        condizioni.filter { it.attiva && it.limitazioni.isNotBlank() }.forEach {
            avvisi += Avviso(Gravita.ATTENZIONE, "${it.descrizione}: ${it.limitazioni}")
        }

        for (a in assenze) {
            val giorni = ChronoUnit.DAYS.between(a.dal, a.al) + 1
            val inCorso = !oggi.isBefore(a.dal) && !oggi.isAfter(a.al)
            val finitaDaPoco = a.al.isBefore(oggi) && ChronoUnit.DAYS.between(a.al, oggi) <= 7
            if (inCorso) {
                avvisi += Avviso(Gravita.INFO, "Assente fino al ${a.al.format(FORMATO_DATA)}")
            }
            if (giorni >= 14 && (inCorso || finitaDaPoco)) {
                avvisi += Avviso(
                    Gravita.ATTENZIONE,
                    "Assenza di $giorni giorni: prevedi un rientro graduale del volume"
                )
            }
        }
        return avvisi
    }
}
