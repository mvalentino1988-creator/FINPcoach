package com.mattia.nuotoparalimpico.domain

import com.mattia.nuotoparalimpico.data.Atleta
import com.mattia.nuotoparalimpico.data.CondizioneMedica
import com.mattia.nuotoparalimpico.data.FaseMesociclo
import com.mattia.nuotoparalimpico.data.TipoMicrociclo
import kotlin.math.roundToInt

data class RichiestaGenerazioneSeduta(
    val volumeTargetBase: Int,
    val fase: FaseMesociclo,
    val tipoMicro: TipoMicrociclo,
    val atleta: Atleta?,
    val condizioni: List<CondizioneMedica>,
    val codicePrimario: String = "A2",
    val codiceSecondario: String = "B1",
    val percentualePrimario: Int = 60
)

class GeneratoreSmartSedutaRefactored {

    fun generaSeduta(richiesta: RichiestaGenerazioneSeduta): SchedaSeduta {
        val impatto = DisabilityImpactAnalyzer.analizza(richiesta.atleta, richiesta.condizioni)

        val volumeCorretto = (richiesta.volumeTargetBase * impatto.fattoreVolume).roundToInt()

        val primario = if (richiesta.codicePrimario in impatto.codiciEsclusi) "A2" else richiesta.codicePrimario
        val secondario = if (richiesta.codiceSecondario in impatto.codiciEsclusi) "A1" else richiesta.codiceSecondario

        val specPrimario = ArchivioCodiciFisiologici.catalog[primario] ?: ArchivioCodiciFisiologici.catalog["A2"]!!
        val specSecondario = ArchivioCodiciFisiologici.catalog[secondario] ?: ArchivioCodiciFisiologici.catalog["A1"]!!

        val metriPrimarioDesiderati = (volumeCorretto * (richiesta.percentualePrimario / 100f)).roundToInt()
        val metriPrimarioEffettivi = minOf(metriPrimarioDesiderati, specPrimario.capMassimoMetri)

        val metriSecondarioDesiderati = volumeCorretto - metriPrimarioEffettivi
        val metriSecondarioEffettivi = minOf(metriSecondarioDesiderati, specSecondario.capMassimoMetri)

        val volumeTotaleReale = metriPrimarioEffettivi + metriSecondarioEffettivi

        val tratti = mutableListOf<TrattoSeduta>()

        val metriRiscaldamento = (volumeTotaleReale * 0.20f).roundToInt()
        tratti.add(TrattoSeduta("Riscaldamento", CodiceAllenamento.A1, metriRiscaldamento, "Continuo / Misto", "Mobilità articolare e progressione tecnica."))

        val codicePrimarioEnum = try { CodiceAllenamento.valueOf(specPrimario.codice) } catch (e: Exception) { CodiceAllenamento.A2 }
        val codiceSecondarioEnum = try { CodiceAllenamento.valueOf(specSecondario.codice) } catch (e: Exception) { CodiceAllenamento.B1 }

        tratti.add(TrattoSeduta("Serie Principale · ${specPrimario.codice}", codicePrimarioEnum, metriPrimarioEffettivi, "Blocco strutturato", specPrimario.descrizione, "Recupero x${impatto.moltiplicatoreRecupero}"))

        if (metriSecondarioEffettivi > 100) {
            tratti.add(TrattoSeduta("Blocco Complementare · ${specSecondario.codice}", codiceSecondarioEnum, metriSecondarioEffettivi, "Intervalli controllati", specSecondario.descrizione))
        }

        val metriDefaticamento = maxOf(100, volumeTotaleReale - metriRiscaldamento - metriPrimarioEffettivi - metriSecondarioEffettivi)
        tratti.add(TrattoSeduta("Defaticamento", CodiceAllenamento.A1, metriDefaticamento, "Scioglimento", "Nuoto sciolto in scioltezza."))

        val sommaMetri = tratti.sumOf { it.metri }
        val ripartizione = tratti.groupBy({ it.codice }, { it.metri }).mapKeys { it.key }.mapValues { entry -> entry.value.sum() }

        // Convertiamo la mappa delle chiavi Enum a stringa o manteniamo la mappa attesa da SchedaSeduta se necessario
        // SchedaSeduta richiede ripartizioneCodici: Map<CodiceAllenamento, Int>
        val ripartizioneCodiciMap = ripartizione.mapKeys { it.key }

        return SchedaSeduta(
            titolo = "Seduta Smart · ${specPrimario.codice} + ${specSecondario.codice}",
            data = null,
            nomeAtleta = richiesta.atleta?.let { "${it.cognome} ${it.nome}" },
            etaAtleta = null,
            categoriaEta = null,
            faseStagione = richiesta.fase,
            tipoMicrociclo = richiesta.tipoMicro,
            volumeTotaleMetri = sommaMetri,
            ripartizioneCodici = ripartizioneCodiciMap,
            tratti = tratti,
            adattamentiEta = emptyList(),
            avvertenzeMediche = richiesta.condizioni.map { it.limitazioni }
        )
    }
}
