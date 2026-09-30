package com.mattia.nuotoparalimpico.domain

import com.mattia.nuotoparalimpico.data.Atleta
import com.mattia.nuotoparalimpico.data.CondizioneMedica
import com.mattia.nuotoparalimpico.data.FaseMesociclo
import com.mattia.nuotoparalimpico.data.TipoMicrociclo
import java.time.LocalDate
import java.time.Period
import kotlin.math.roundToInt

data class TrattoSeduta(
    val sezione: String,          // es. "Riscaldamento", "Attivazione Velocità", "Serie Principale", "Defaticamento"
    val codice: CodiceAllenamento,
    val metri: Int,
    val ripetizioni: String,     // es. "4 x 100m", "8 x 50m", "1 x 400m"
    val descrizione: String,      // es. "Dorso/Stile libero alternati con 15m scivolamento e sensibilità"
    val ripartenza: String? = null, // es. "a 1'45"", "recupero 45""
    val notaSpecifica: String? = null
)

data class SchedaSeduta(
    val titolo: String,
    val data: LocalDate?,
    val nomeAtleta: String?,
    val etaAtleta: Int?,
    val categoriaEta: String?,
    val faseStagione: FaseMesociclo,
    val tipoMicrociclo: TipoMicrociclo,
    val volumeTotaleMetri: Int,
    val ripartizioneCodici: Map<CodiceAllenamento, Int>, // metri per ciascun codice
    val tratti: List<TrattoSeduta>,
    val adattamentiEta: List<String>,
    val avvertenzeMediche: List<String>
)

object GeneratoreSmartSeduta {

    fun genera(
        data: LocalDate?,
        metriTarget: Int,
        fase: FaseMesociclo,
        tipoMicro: TipoMicrociclo,
        atleta: Atleta? = null,
        condizioniMediche: List<CondizioneMedica> = emptyList()
    ): SchedaSeduta {
        val volumeValido = metriTarget.coerceAtLeast(400)
        val oggi = data ?: LocalDate.now()
        val eta = atleta?.dataNascita?.let { Period.between(it, oggi).years }
        val categoria = eta?.let {
            when {
                it < 12 -> "Esordienti (< 12 anni)"
                it in 12..14 -> "Ragazzi Giovanissimi (12-14 anni)"
                it in 15..17 -> "Juniores (15-17 anni)"
                it in 18..34 -> "Assoluti / Cadetti (18-34 anni)"
                else -> "Master / Senior (35+ anni)"
            }
        }

        val adattamentiEta = mutableListOf<String>()
        val avvertenzeMediche = mutableListOf<String>()

        // 1. Calcolo quote percentuali base per Codici di Allenamento in base alla Fase e Microciclo
        val quoteBase = calcolaQuoteBase(fase, tipoMicro).toMutableMap()

        // 2. Modifiche in base all'Età
        if (eta != null) {
            when {
                eta < 12 -> {
                    // Under 12: No C1/C2 lattacidi pesanti -> trasferisci a A1 (tecnica) e D (velocità/giochi)
                    val lattato = (quoteBase[CodiceAllenamento.C1] ?: 0.0) + (quoteBase[CodiceAllenamento.C2] ?: 0.0)
                    quoteBase[CodiceAllenamento.C1] = 0.0
                    quoteBase[CodiceAllenamento.C2] = 0.0
                    quoteBase[CodiceAllenamento.A1] = (quoteBase[CodiceAllenamento.A1] ?: 0.3) + lattato * 0.6
                    quoteBase[CodiceAllenamento.D] = (quoteBase[CodiceAllenamento.D] ?: 0.05) + lattato * 0.4
                    adattamentiEta += "Atleta under 12: escluse serie ad alto accumulo lattacido (C1/C2). Enfasi su tecnica (A1) e reattività/giochi veloci (D)."
                }
                eta >= 35 -> {
                    // Master 35+: Riscaldamento A1 e defaticamento esteso, moderazione C1/C2
                    val c1 = (quoteBase[CodiceAllenamento.C1] ?: 0.0) * 0.5
                    val c2 = (quoteBase[CodiceAllenamento.C2] ?: 0.0) * 0.5
                    quoteBase[CodiceAllenamento.C1] = (quoteBase[CodiceAllenamento.C1] ?: 0.0) - c1
                    quoteBase[CodiceAllenamento.C2] = (quoteBase[CodiceAllenamento.C2] ?: 0.0) - c2
                    quoteBase[CodiceAllenamento.A1] = (quoteBase[CodiceAllenamento.A1] ?: 0.3) + c1 + c2
                    adattamentiEta += "Atleta master (35+): estesa la quota di riscaldamento/scioglimento A1 e ampliati i tempi di recupero per la protezione articolare."
                }
                eta in 12..14 -> {
                    val c2 = (quoteBase[CodiceAllenamento.C2] ?: 0.0) * 0.5
                    quoteBase[CodiceAllenamento.C2] = (quoteBase[CodiceAllenamento.C2] ?: 0.0) - c2
                    quoteBase[CodiceAllenamento.B1] = (quoteBase[CodiceAllenamento.B1] ?: 0.15) + c2
                    adattamentiEta += "Categoria 12-14 anni: introduzione graduale della potenza lattacida, priorità allo sviluppo della soglia (B1)."
                }
            }
        }

        // 3. Modifiche per Condizioni Mediche e Limitazioni Attive
        val condizioniAttive = condizioniMediche.filter { it.attiva }
        condizioniAttive.forEach { c ->
            val desc = "${c.descrizione} ${c.limitazioni}".lowercase()
            when {
                desc.contains("spalla") || desc.contains("articolare") -> {
                    val riduzioneB2 = (quoteBase[CodiceAllenamento.B2] ?: 0.0) * 0.4
                    quoteBase[CodiceAllenamento.B2] = (quoteBase[CodiceAllenamento.B2] ?: 0.0) - riduzioneB2
                    quoteBase[CodiceAllenamento.A1] = (quoteBase[CodiceAllenamento.A1] ?: 0.3) + riduzioneB2
                    avvertenzeMediche += "⚠️ Condizione articolare/spalla (${c.descrizione}): evitate palette rigide nelle serie B2/C, inseriti esercizi di sensibilità e gambe."
                }
                desc.contains("affaticamento") || desc.contains("neurolog") || desc.contains("spastic") || desc.contains("sclerosi") -> {
                    val lattacidi = (quoteBase[CodiceAllenamento.C1] ?: 0.0) + (quoteBase[CodiceAllenamento.C2] ?: 0.0)
                    quoteBase[CodiceAllenamento.C1] = 0.0
                    quoteBase[CodiceAllenamento.C2] = 0.0
                    quoteBase[CodiceAllenamento.A2] = (quoteBase[CodiceAllenamento.A2] ?: 0.3) + lattacidi * 0.7
                    quoteBase[CodiceAllenamento.A1] = (quoteBase[CodiceAllenamento.A1] ?: 0.3) + lattacidi * 0.3
                    avvertenzeMediche += "⚠️ Limitazione neurologica/spasticità (${c.descrizione}): azzerate le serie C1/C2 per prevenire blocchi muscolari e fatica centrale."
                }
                desc.contains("cardio") || desc.contains("cuore") || desc.contains("pressione") -> {
                    quoteBase[CodiceAllenamento.C2] = 0.0
                    quoteBase[CodiceAllenamento.B2] = (quoteBase[CodiceAllenamento.B2] ?: 0.0) * 0.3
                    quoteBase[CodiceAllenamento.A2] = (quoteBase[CodiceAllenamento.A2] ?: 0.3) + 0.15
                    avvertenzeMediche += "⚠️ Attenzione cardiovascolare (${c.descrizione}): evitate apnee prolungate e picchi C2, ritmo costante A2/B1."
                }
                else -> {
                    if (c.limitazioni.isNotBlank()) {
                        avvertenzeMediche += "ℹ️ Nota medica (${c.descrizione}): ${c.limitazioni}"
                    }
                }
            }
        }

        // 4. Normalizzazione percentuali e calcolo metri per ciascun codice
        val sommaQuote = quoteBase.values.sum().coerceAtLeast(0.01)
        val metriPerCodice = quoteBase.mapValues { (_, q) ->
            ((q / sommaQuote) * volumeValido).roundToInt()
        }.filterValues { it > 0 }

        // 5. Costruzione dinamica dei tratti della scheda di allenamento per la vasca
        val tratti = costruisciTrattiScheda(volumeValido, metriPerCodice, fase, tipoMicro, eta, condizioniAttive)

        val nomeAtleta = atleta?.let { "${it.nome} ${it.cognome}" }
        val titolo = if (nomeAtleta != null) "Scheda Personalizzata · $nomeAtleta" else "Scheda di Squadra"

        return SchedaSeduta(
            titolo = titolo,
            data = data,
            nomeAtleta = nomeAtleta,
            etaAtleta = eta,
            categoriaEta = categoria,
            faseStagione = fase,
            tipoMicrociclo = tipoMicro,
            volumeTotaleMetri = tratti.sumOf { it.metri },
            ripartizioneCodici = metriPerCodice,
            tratti = tratti,
            adattamentiEta = adattamentiEta,
            avvertenzeMediche = avvertenzeMediche
        )
    }

    private fun calcolaQuoteBase(fase: FaseMesociclo, tipo: TipoMicrociclo): Map<CodiceAllenamento, Double> {
        return when (tipo) {
            TipoMicrociclo.ADATTAMENTO, TipoMicrociclo.RECUPERO -> mapOf(
                CodiceAllenamento.A1 to 0.50,
                CodiceAllenamento.A2 to 0.40,
                CodiceAllenamento.D to 0.10
            )
            TipoMicrociclo.SCARICO -> mapOf(
                CodiceAllenamento.A1 to 0.45,
                CodiceAllenamento.A2 to 0.25,
                CodiceAllenamento.B2 to 0.15,
                CodiceAllenamento.D to 0.15
            )
            TipoMicrociclo.GARA -> mapOf(
                CodiceAllenamento.A1 to 0.45,
                CodiceAllenamento.C3 to 0.30,
                CodiceAllenamento.D to 0.25
            )
            TipoMicrociclo.PAUSA -> mapOf(
                CodiceAllenamento.A1 to 1.0
            )
            TipoMicrociclo.CARICO -> when (fase) {
                FaseMesociclo.PREPARAZIONE_GENERALE -> mapOf(
                    CodiceAllenamento.A1 to 0.30,
                    CodiceAllenamento.A2 to 0.45,
                    CodiceAllenamento.B1 to 0.20,
                    CodiceAllenamento.D to 0.05
                )
                FaseMesociclo.PREPARAZIONE_SPECIFICA -> mapOf(
                    CodiceAllenamento.A1 to 0.25,
                    CodiceAllenamento.A2 to 0.30,
                    CodiceAllenamento.B1 to 0.20,
                    CodiceAllenamento.B2 to 0.15,
                    CodiceAllenamento.D to 0.10
                )
                FaseMesociclo.PRE_GARA -> mapOf(
                    CodiceAllenamento.A1 to 0.30,
                    CodiceAllenamento.A2 to 0.20,
                    CodiceAllenamento.B2 to 0.20,
                    CodiceAllenamento.C1 to 0.15,
                    CodiceAllenamento.D to 0.15
                )
                FaseMesociclo.COMPETITIVA -> mapOf(
                    CodiceAllenamento.A1 to 0.35,
                    CodiceAllenamento.A2 to 0.15,
                    CodiceAllenamento.C2 to 0.20,
                    CodiceAllenamento.C3 to 0.15,
                    CodiceAllenamento.D to 0.15
                )
            }
        }
    }

    private fun costruisciTrattiScheda(
        volumeTotale: Int,
        metriCodice: Map<CodiceAllenamento, Int>,
        fase: FaseMesociclo,
        tipo: TipoMicrociclo,
        eta: Int?,
        condizioniAttive: List<CondizioneMedica>
    ): List<TrattoSeduta> {
        val tratti = mutableListOf<TrattoSeduta>()

        // 1. RISCALDAMENTO (A1)
        val mA1 = metriCodice[CodiceAllenamento.A1] ?: (volumeTotale * 0.25).roundToInt()
        val mRiscaldamento = (mA1 * 0.65).roundToInt().coerceAtLeast(200)
        tratti += TrattoSeduta(
            sezione = "Riscaldamento",
            codice = CodiceAllenamento.A1,
            metri = mRiscaldamento,
            ripetizioni = "1 x $mRiscaldamento m",
            descrizione = "A scelta tra Stile Libero e Dorso + 100m esercizi di sensibilità (bracciata singola / cagnolino) e scivolamento.",
            ripartenza = "Pausa libera",
            notaSpecifica = "Ritmo sciolto e respirazione bilanciata."
        )

        // 2. ATTIVAZIONE & VELOCITÀ (D)
        val mD = metriCodice[CodiceAllenamento.D] ?: 0
        if (mD >= 50) {
            val numD = (mD / 50).coerceIn(2, 8)
            val metriAzione = numD * 50
            tratti += TrattoSeduta(
                sezione = "Attivazione e Velocità",
                codice = CodiceAllenamento.D,
                metri = metriAzione,
                ripetizioni = "$numD x 50m",
                descrizione = "15m velocità massima (partenza / virata esplosiva) + 35m scioglimento A1.",
                ripartenza = "a 1'15\"",
                notaSpecifica = "Focus sulla reattività dei primi metri e sulla frequenza di bracciata."
            )
        }

        // 3. SERIE PRINCIPALE (A2 / B1 / B2 / C1 / C2 / C3)
        val mB1 = metriCodice[CodiceAllenamento.B1] ?: 0
        val mB2 = metriCodice[CodiceAllenamento.B2] ?: 0
        val mC1 = metriCodice[CodiceAllenamento.C1] ?: 0
        val mC2 = metriCodice[CodiceAllenamento.C2] ?: 0
        val mC3 = metriCodice[CodiceAllenamento.C3] ?: 0
        val mA2 = metriCodice[CodiceAllenamento.A2] ?: 0

        if (mC3 > 0) {
            val nC3 = (mC3 / 50).coerceIn(2, 6)
            tratti += TrattoSeduta(
                sezione = "Serie Principale - Ritmo Gara",
                codice = CodiceAllenamento.C3,
                metri = nC3 * 50,
                ripetizioni = "$nC3 x 50m",
                descrizione = "Passo gara gara obiettivo con precisione cronometrica al decimo di secondo.",
                ripartenza = "recupero 2' completo",
                notaSpecifica = "Massima concentrazione sul ritmo di bracciata della gara prioritaria."
            )
        } else if (mC1 > 0 || mC2 > 0) {
            val mTotLattato = mC1 + mC2
            val nLatt = (mTotLattato / 100).coerceIn(2, 6)
            tratti += TrattoSeduta(
                sezione = "Serie Principale - Qualità Lattacida",
                codice = if (mC2 > mC1) CodiceAllenamento.C2 else CodiceAllenamento.C1,
                metri = nLatt * 100,
                ripetizioni = "$nLatt x 100m",
                descrizione = "50m alla massima velocità sostenibile + 50m tenuta con elevata frequenza.",
                ripartenza = "a 2'30\" (recupero ampio)",
                notaSpecifica = "Resistere all'acidosi mantenendo assetto e idrodinamicità."
            )
        } else if (mB2 > 0) {
            val nB2 = (mB2 / 100).coerceIn(3, 8)
            tratti += TrattoSeduta(
                sezione = "Serie Principale - VO2 Max",
                codice = CodiceAllenamento.B2,
                metri = nB2 * 100,
                ripetizioni = "$nB2 x 100m",
                descrizione = "Intervalli ad alta intensità (pulsazioni 175+ bpm), massimo sforzo aerobico.",
                ripartenza = "a 1'40\"",
                notaSpecifica = "Mantenere costante il numero di bracciate per vasca."
            )
        } else if (mB1 > 0) {
            val nB1 = (mB1 / 100).coerceIn(4, 10)
            tratti += TrattoSeduta(
                sezione = "Serie Principale - Soglia Anaerobica",
                codice = CodiceAllenamento.B1,
                metri = nB1 * 100,
                ripetizioni = "$nB1 x 100m",
                descrizione = "Passo soglia regolare e controllato (frequenza cardiaca ~165 bpm).",
                ripartenza = "a 1'35\"",
                notaSpecifica = "Lavoro fondamentale per l'innalzamento della soglia anaerobica."
            )
        } else if (mA2 > 0) {
            val nA2 = (mA2 / 200).coerceIn(2, 6)
            tratti += TrattoSeduta(
                sezione = "Serie Principale - Fondo e Capacità",
                codice = CodiceAllenamento.A2,
                metri = nA2 * 200,
                ripetizioni = "$nA2 x 200m",
                descrizione = "Stile principale / Misti con palette corte e boccaglio per la continuità del gesto.",
                ripartenza = "a 3'15\"",
                notaSpecifica = "Respirazione regolare e controllo costante dell'andatura."
            )
        }

        // 4. DEFATICAMENTO E DEFATICAZIONE (A1)
        val metriGiaInseriti = tratti.sumOf { it.metri }
        val mDefaticamento = (volumeTotale - metriGiaInseriti).coerceAtLeast(150)
        tratti += TrattoSeduta(
            sezione = "Defaticamento",
            codice = CodiceAllenamento.A1,
            metri = mDefaticamento,
            ripetizioni = "1 x $mDefaticamento m",
            descrizione = "Nuoto rilassato a dorso doppio e stile libero a respirazione 3/5 bracciate per lo smaltimento e il ripristino organico.",
            ripartenza = "Scioglimento libero",
            notaSpecifica = "Decompressione muscolare ed allungamento in acqua."
        )

        return tratti
    }
}
