package com.mattia.nuotoparalimpico.domain

import com.mattia.nuotoparalimpico.data.Atleta
import com.mattia.nuotoparalimpico.data.CondizioneMedica
import com.mattia.nuotoparalimpico.data.FaseMesociclo
import com.mattia.nuotoparalimpico.data.LogSeduta
import com.mattia.nuotoparalimpico.data.Mesociclo
import com.mattia.nuotoparalimpico.data.Tempo
import com.mattia.nuotoparalimpico.data.TipoMicrociclo
import java.time.LocalDate
import java.time.Period

data class TrattoScheda(
    val sezione: String,
    val codice: CodiceAllenamento,
    val ripetizioni: String,
    val metri: Int,
    val descrizione: String,
    val ripartenza: String? = null,
    val notaSpecifica: String? = null
)

data class SchedaSeduta(
    val titolo: String,
    val volumeTotaleMetri: Int,
    val faseStagione: FaseMesociclo,
    val tipoMicrociclo: TipoMicrociclo,
    val data: LocalDate? = null,
    val categoriaEta: String? = null,
    val avvertenzeMediche: List<String> = emptyList(),
    val adattamentiEta: List<String> = emptyList(),
    val noteCalibrazione: List<String> = emptyList(),
    val ripartizioneCodici: Map<CodiceAllenamento, Int> = emptyMap(),
    val tratti: List<TrattoScheda> = emptyList(),
    val tempiUtilizzati: List<Tempo> = emptyList()
)

object GeneratoreSmartSeduta {

    fun genera(
        data: LocalDate,
        metriTarget: Int,
        fase: FaseMesociclo,
        tipoMicro: TipoMicrociclo,
        atleta: Atleta? = null,
        condizioniMediche: List<CondizioneMedica> = emptyList(),
        tempi: List<Tempo> = emptyList(),
        logSedute: List<LogSeduta> = emptyList(),
        mesocicloCorrente: Mesociclo? = null,
        vascaMetri: Int = 25
    ): SchedaSeduta {
        val profilato = if (atleta != null) CalcoloCarico.profilo(logSedute, data) else null
        val raccomandazione = if (atleta != null && profilato != null) {
            CalcoloCarico.volumeRaccomandato(metriTarget, atleta, profilato, tipoMicro)
        } else {
            RaccomandazioneVolume(metriTarget, emptyList())
        }

        val volumeEffettivo = raccomandazione.metri
        val noteVolume = raccomandazione.note

        val avvertenzeMediche = mutableListOf<String>()
        val adattamentiEta = mutableListOf<String>()

        val eta = atleta?.dataNascita?.let { Period.between(it, data).years }
        if (eta != null) {
            when {
                eta < 12 -> adattamentiEta += "Categoria Esordienti (età $eta): focus su tecnica e coordinazione, recuperi ampi."
                eta >= 35 -> adattamentiEta += "Atleta Master (età $eta): riscaldamento prolungato e lavoro di mobilità articolare."
            }
        }

        if (condizioniMediche.isNotEmpty()) {
            val testoMed = condizioniMediche.joinToString(" ") { "${it.descrizione} ${it.limitazioni}" }
            val analisi = FINPSpecialistAI.analizza(testoMed, "", eta)
            avvertenzeMediche += analisi.raccomandazioniAllenamento
        }

        val riscaldamentoMetri = (volumeEffettivo * 0.20).toInt() / 50 * 50
        val defaticamentoMetri = (volumeEffettivo * 0.15).toInt() / 50 * 50
        val principaleMetri = volumeEffettivo - riscaldamentoMetri - defaticamentoMetri

        val tratti = mutableListOf<TrattoScheda>()
        val ripartizione = mutableMapOf<CodiceAllenamento, Int>()

        // Riscaldamento
        tratti += TrattoScheda(
            sezione = "Riscaldamento",
            codice = CodiceAllenamento.A1,
            ripetizioni = "${riscaldamentoMetri / 50} x 50m",
            metri = riscaldamentoMetri,
            descrizione = "Riscaldamento generale a piacere con sensibilità all'acqua"
        )
        ripartizione[CodiceAllenamento.A1] = riscaldamentoMetri

        // Serie Principale
        val codicePrincipale = when (fase) {
            FaseMesociclo.PREPARAZIONE_GENERALE -> CodiceAllenamento.A2
            FaseMesociclo.PREPARAZIONE_SPECIFICA -> CodiceAllenamento.B1
            FaseMesociclo.PRE_GARA -> CodiceAllenamento.B2
            FaseMesociclo.COMPETITIVA -> CodiceAllenamento.C1
        }

        tratti += TrattoScheda(
            sezione = "Serie Principale",
            codice = codicePrincipale,
            ripetizioni = "${principaleMetri / 100} x 100m",
            metri = principaleMetri,
            descrizione = "Lavoro specifico in regime ${codicePrincipale.nome} (${codicePrincipale.ambito})",
            ripartenza = if (vascaMetri == 50) "@1'45\"" else "@1'35\""
        )
        ripartizione[codicePrincipale] = principaleMetri

        // Defaticamento
        tratti += TrattoScheda(
            sezione = "Defaticamento",
            codice = CodiceAllenamento.A1,
            ripetizioni = "${defaticamentoMetri / 50} x 50m",
            metri = defaticamentoMetri,
            descrizione = "Scioglimento finale a stile libero/dorso sciolto"
        )
        ripartizione[CodiceAllenamento.A1] = (ripartizione[CodiceAllenamento.A1] ?: 0) + defaticamentoMetri

        val catEta = eta?.let {
            when {
                it < 12 -> "Esordienti"
                it <= 14 -> "Ragazzi"
                it <= 17 -> "Juniores"
                it <= 34 -> "Seniores"
                else -> "Master M$it"
            }
        }

        val fmt = java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy")
        return SchedaSeduta(
            titolo = "Seduta ${data.format(fmt)}" + (atleta?.let { " - ${it.nome} ${it.cognome}" } ?: ""),
            volumeTotaleMetri = volumeEffettivo,
            faseStagione = fase,
            tipoMicrociclo = tipoMicro,
            data = data,
            categoriaEta = catEta,
            avvertenzeMediche = avvertenzeMediche,
            adattamentiEta = adattamentiEta,
            noteCalibrazione = noteVolume,
            ripartizioneCodici = ripartizione,
            tratti = tratti,
            tempiUtilizzati = tempi.take(3)
        )
    }
}
