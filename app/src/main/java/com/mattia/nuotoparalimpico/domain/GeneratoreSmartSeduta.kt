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
import kotlin.math.floor
import kotlin.math.roundToInt

/** Arrotonda i volumi (metri) a multipli di 50m. */
fun Int.arrotondaA50m(): Int = ((this + 25) / 50) * 50

data class TrattoSeduta(
    val sezione: String,
    val codice: CodiceAllenamento,
    val metri: Int,               // multiplo di 50m
    val ripetizioni: String,      // es. "4 x 100m"
    val descrizione: String,
    val ripartenza: String? = null,
    val notaSpecifica: String? = null,
    val distanzaRipetizione: Int = 0,
    val numeroRipetizioni: Int = 1,
    val durataStimataSec: Int = 0
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
    val ripartizioneCodici: Map<CodiceAllenamento, Int>,
    val tratti: List<TrattoSeduta>,
    val adattamentiEta: List<String>,
    val avvertenzeMediche: List<String>,
    val tempiUtilizzati: List<Tempo> = emptyList(),
    val noteCalibrazione: List<String> = emptyList(),
    val durataStimataMin: Int = 0,
    val caricoStimatoSrpe: Int = 0
)

object GeneratoreSmartSeduta {

    private class Regola(val distanze: List<Int>, val minN: Int, val maxN: Int)

    private val REGOLE = mapOf(
        CodiceAllenamento.A2 to Regola(listOf(400, 200, 100, 50), 2, 8),
        CodiceAllenamento.B1 to Regola(listOf(200, 100, 50), 3, 12),
        CodiceAllenamento.B2 to Regola(listOf(100, 50), 3, 12),
        CodiceAllenamento.C1 to Regola(listOf(100, 200, 50), 2, 8),
        CodiceAllenamento.C2 to Regola(listOf(50, 100), 2, 8),
        CodiceAllenamento.C3 to Regola(listOf(50, 100), 2, 10)
    )

    private val ORDINE_SERIE = listOf(
        CodiceAllenamento.A2, CodiceAllenamento.B1, CodiceAllenamento.B2,
        CodiceAllenamento.C1, CodiceAllenamento.C2, CodiceAllenamento.C3
    )

    fun genera(
        data: LocalDate?,
        metriTarget: Int,
        fase: FaseMesociclo,
        tipoMicro: TipoMicrociclo,
        atleta: Atleta? = null,
        condizioniMediche: List<CondizioneMedica> = emptyList(),
        tempi: List<Tempo> = emptyList(),
        logSedute: List<LogSeduta> = emptyList(),
        mesocicloCorrente: Mesociclo? = null
    ): SchedaSeduta {
        val adesso = LocalDate.now()
        val dataRif = data ?: adesso
        val volumeBase = metriTarget.coerceAtLeast(400).arrotondaA50m()
        val eta = atleta?.dataNascita?.let { Period.between(it, dataRif).years }
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
        val noteCalibrazione = mutableListOf<String>()

        // 1. Volume tarato sulla capacità reale dell'atleta
        val profilo = CalcoloCarico.profilo(logSedute, adesso)
        var volume = volumeBase
        if (atleta != null) {
            val racc = CalcoloCarico.volumeRaccomandato(volumeBase, atleta, profilo, tipoMicro)
            volume = racc.metri.arrotondaA50m().coerceAtLeast(400)
            noteCalibrazione += racc.note
            if (profilo.sedute < CalcoloCarico.SEDUTE_MINIME) {
                noteCalibrazione += "Dati insufficienti per tarare il volume sulla capacità reale (${profilo.sedute} sedute negli ultimi 28 giorni, ne servono almeno ${CalcoloCarico.SEDUTE_MINIME}): registra le sedute nel Registro."
            } else if (racc.note.isEmpty()) {
                noteCalibrazione += "Volume coerente con il carico recente (${profilo.metriMedi} m medi a seduta negli ultimi 28 giorni)."
            }
        } else {
            noteCalibrazione += "Scheda di squadra: scegli un atleta per volume e ripartenze personalizzati."
        }

        // 2. Ritmi e ripartenze dai tempi dell'atleta
        val rif = if (atleta != null) CalcoloRitmiRipartenze.scegliRiferimento(tempi, adesso) else null
        val tabella = if (atleta != null && rif != null) {
            CalcoloRitmiRipartenze.calcolaTabellaRitmi(atleta.id, rif.centesimi25, rif.tempo.stile, 25, rif.cssPasso100Centesimi)
        } else null
        if (rif != null) {
            noteCalibrazione += "Ritmi calibrati sul 100m ${nomeStile(rif.tempo.stile)} ${formattaTempo(rif.tempo.centesimi)}."
            noteCalibrazione += rif.note
        } else if (atleta != null) {
            noteCalibrazione += "Nessun 100m registrato: ripartenze non calcolate. Inserisci un tempo di gara o test sui 100m."
        }

        // 3. Quote base per codice
        val quoteBase = calcolaQuoteBase(fase, tipoMicro).toMutableMap()

        // 4. Modifiche in base all'età
        if (eta != null) {
            when {
                eta < 12 -> {
                    val lattato = (quoteBase[CodiceAllenamento.C1] ?: 0.0) + (quoteBase[CodiceAllenamento.C2] ?: 0.0)
                    quoteBase[CodiceAllenamento.C1] = 0.0
                    quoteBase[CodiceAllenamento.C2] = 0.0
                    quoteBase[CodiceAllenamento.A1] = (quoteBase[CodiceAllenamento.A1] ?: 0.3) + lattato * 0.6
                    quoteBase[CodiceAllenamento.D] = (quoteBase[CodiceAllenamento.D] ?: 0.05) + lattato * 0.4
                    adattamentiEta += "Atleta under 12: escluse serie ad alto accumulo lattacido (C1/C2). Enfasi su tecnica (A1) e reattività/giochi veloci (D)."
                }
                eta >= 35 -> {
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

        // 5. Condizioni mediche attive
        val condizioniAttive = condizioniMediche.filter { it.attiva }
        condizioniAttive.forEach { c ->
            val desc = "${c.descrizione} ${c.limitazioni}".lowercase()
            when {
                desc.contains("spalla") || desc.contains("articolare") || desc.contains("cuffia") || desc.contains("rotator") -> {
                    val riduzioneB2 = (quoteBase[CodiceAllenamento.B2] ?: 0.0) * 0.4
                    quoteBase[CodiceAllenamento.B2] = (quoteBase[CodiceAllenamento.B2] ?: 0.0) - riduzioneB2
                    quoteBase[CodiceAllenamento.A1] = (quoteBase[CodiceAllenamento.A1] ?: 0.3) + riduzioneB2
                    avvertenzeMediche += "⚠️ Condizione spalla/articolare (${c.descrizione}): evitate palette rigide nelle serie B2/C, inseriti esercizi di sensibilità e gambe."
                }
                desc.contains("affaticament") || desc.contains("neurolog") || desc.contains("spastic") || desc.contains("sclerosi") ||
                    desc.contains("midoll") || desc.contains("parapleg") || desc.contains("tetrapleg") -> {
                    val lattacidi = (quoteBase[CodiceAllenamento.C1] ?: 0.0) + (quoteBase[CodiceAllenamento.C2] ?: 0.0)
                    quoteBase[CodiceAllenamento.C1] = 0.0
                    quoteBase[CodiceAllenamento.C2] = 0.0
                    quoteBase[CodiceAllenamento.A2] = (quoteBase[CodiceAllenamento.A2] ?: 0.3) + lattacidi * 0.7
                    quoteBase[CodiceAllenamento.A1] = (quoteBase[CodiceAllenamento.A1] ?: 0.3) + lattacidi * 0.3
                    avvertenzeMediche += "⚠️ Condizione neurologica/funzionale (${c.descrizione}): azzerate le serie C1/C2 per prevenire blocchi muscolari e fatica centrale."
                }
                desc.contains("cardio") || desc.contains("cuore") || desc.contains("pressione") || desc.contains("iperten") -> {
                    quoteBase[CodiceAllenamento.C2] = 0.0
                    quoteBase[CodiceAllenamento.B2] = (quoteBase[CodiceAllenamento.B2] ?: 0.0) * 0.3
                    quoteBase[CodiceAllenamento.A2] = (quoteBase[CodiceAllenamento.A2] ?: 0.3) + 0.15
                    avvertenzeMediche += "⚠️ Attenzione cardiovascolare (${c.descrizione}): evitate apnee prolungate e picchi C2, ritmo costante A2/B1."
                }
                desc.contains("visiv") || desc.contains("cecit") || desc.contains("vedent") -> {
                    avvertenzeMediche += "👁️ Disabilità visiva (${c.descrizione}): garantire la presenza del tapper per gli arrivi C1/C2/D e conteggio costante bracciate."
                }
                else -> {
                    avvertenzeMediche += "ℹ️ Adattamento Medico Personalizzato (${c.descrizione}): ${if (c.limitazioni.isNotBlank()) c.limitazioni else "Monitorare il recupero e regolare la resistenza."}"
                }
            }
        }

        // 6. Distribuzione esatta dei metri (la somma è sempre il volume)
        val metri = distribuisci(quoteBase, volume)
        garantisciA1(metri, volume)
        val mD = metri[CodiceAllenamento.D] ?: 0
        if (mD in 1..99) {
            metri[CodiceAllenamento.A1] = (metri[CodiceAllenamento.A1] ?: 0) + mD
            metri.remove(CodiceAllenamento.D)
        } else if (mD > 400) {
            metri[CodiceAllenamento.A1] = (metri[CodiceAllenamento.A1] ?: 0) + (mD - 400)
            metri[CodiceAllenamento.D] = 400
        }

        // 7. Costruzione dei tratti
        val secPer100 = (profilo.minutiPer100m ?: 2.4) * 60.0
        val tratti = costruisciTratti(metri, tabella, secPer100)

        // 8. Stima di durata e carico (teorica)
        val durataSec = tratti.sumOf { it.durataStimataSec }
        val minuti = (durataSec / 60.0).roundToInt().coerceAtLeast(1)
        val secPerCodice = tratti.groupBy { it.codice }.mapValues { e -> e.value.sumOf { it.durataStimataSec } }
        val rpePesato = if (durataSec > 0) secPerCodice.entries.sumOf { it.value * CalcoloCarico.rpeCodice(it.key) } / durataSec else 0.0
        val rpeMax = tratti.filter { it.metri >= 100 }.maxOfOrNull { CalcoloCarico.rpeCodice(it.codice) } ?: rpePesato
        val rpeSessione = 0.6 * rpePesato + 0.4 * rpeMax
        val sRpe = (rpeSessione * minuti).roundToInt()

        val durataIndicativa = if (tabella == null && profilo.minutiPer100m == null) " (approssimativa: mancano tempi e storico)" else ""
        noteCalibrazione += "Durata stimata ~$minuti min$durataIndicativa · RPE stimato ${"%.1f".format(rpeSessione)} · carico teorico ~$sRpe sRPE (stima indicativa)."
        val abituale = profilo.sRpeMedioSeduta
        if (abituale != null && profilo.seduteConRpe >= CalcoloCarico.SEDUTE_MINIME && abituale > 0) {
            val diff = ((sRpe - abituale) / abituale * 100).roundToInt()
            if (diff > 30) noteCalibrazione += "Seduta più impegnativa del solito: carico abituale ~${abituale.roundToInt()} sRPE a seduta (+$diff%)."
            else if (diff < -30) noteCalibrazione += "Seduta più leggera del solito: carico abituale ~${abituale.roundToInt()} sRPE a seduta ($diff%)."
        }

        val nomeAtleta = atleta?.let { "${it.nome} ${it.cognome}" }
        val titolo = if (nomeAtleta != null) "Scheda Personalizzata · $nomeAtleta" else "Scheda di Squadra"
        val ripartizione = CodiceAllenamento.entries
            .associateWith { c -> tratti.filter { it.codice == c }.sumOf { it.metri } }
            .filterValues { it > 0 }

        return SchedaSeduta(
            titolo = titolo,
            data = data,
            nomeAtleta = nomeAtleta,
            etaAtleta = eta,
            categoriaEta = categoria,
            faseStagione = fase,
            tipoMicrociclo = tipoMicro,
            volumeTotaleMetri = tratti.sumOf { it.metri },
            ripartizioneCodici = ripartizione,
            tratti = tratti,
            adattamentiEta = adattamentiEta,
            avvertenzeMediche = avvertenzeMediche,
            tempiUtilizzati = listOfNotNull(rif?.tempo, rif?.tempo400UsatoPerCss),
            noteCalibrazione = noteCalibrazione,
            durataStimataMin = minuti,
            caricoStimatoSrpe = sRpe
        )
    }

    // ---------------------------------------------------------------- distribuzione

    private fun distribuisci(quote: Map<CodiceAllenamento, Double>, volume: Int): MutableMap<CodiceAllenamento, Int> {
        val positive = quote.filterValues { it > 0.0 }
        if (positive.isEmpty()) return mutableMapOf(CodiceAllenamento.A1 to volume)
        val somma = positive.values.sum()
        val unita = volume / 50
        val raw = positive.mapValues { it.value / somma * unita }
        val base = raw.mapValues { floor(it.value).toInt() }.toMutableMap()
        var resto = unita - base.values.sum()
        for (e in raw.entries.sortedByDescending { it.value - floor(it.value) }) {
            if (resto <= 0) break
            base[e.key] = (base[e.key] ?: 0) + 1
            resto--
        }
        return base.mapValues { it.value * 50 }.filterValues { it > 0 }.toMutableMap()
    }

    /** Riscaldamento e defaticamento devono sempre esistere: si preleva dal codice più grande. */
    private fun garantisciA1(m: MutableMap<CodiceAllenamento, Int>, volume: Int) {
        val minA1 = when {
            volume >= 1000 -> 400
            volume >= 600 -> 300
            else -> 200
        }
        var mancano = minA1 - (m[CodiceAllenamento.A1] ?: 0)
        while (mancano > 0) {
            val donatore = m.filterKeys { it != CodiceAllenamento.A1 }.maxByOrNull { it.value } ?: break
            if (donatore.value <= 0) break
            val prelievo = minOf(mancano, donatore.value)
            m[donatore.key] = donatore.value - prelievo
            m[CodiceAllenamento.A1] = (m[CodiceAllenamento.A1] ?: 0) + prelievo
            mancano -= prelievo
        }
        m.keys.toList().forEach { if ((m[it] ?: 0) <= 0) m.remove(it) }
    }

    private fun pianifica(codice: CodiceAllenamento, metri: Int): Pair<Int, Int> {
        val r = REGOLE.getValue(codice)
        for (d in r.distanze) if (metri % d == 0 && metri / d in r.minN..r.maxN) return d to metri / d
        for (d in r.distanze) if (metri % d == 0) return d to metri / d
        return 50 to metri / 50
    }

    // ---------------------------------------------------------------- tratti

    private fun costruisciTratti(
        metri: Map<CodiceAllenamento, Int>,
        tabella: TabellaRitmiAtleta?,
        secPer100: Double
    ): List<TrattoSeduta> {
        val tratti = mutableListOf<TrattoSeduta>()
        val a1 = metri[CodiceAllenamento.A1] ?: 0

        val cool: Int
        val warm: Int
        when {
            a1 >= 300 -> {
                cool = ((a1 * 0.35).roundToInt().arrotondaA50m()).coerceAtLeast(100)
                warm = a1 - cool
            }
            a1 >= 100 -> { cool = 50; warm = a1 - 50 }
            else -> { cool = 0; warm = a1 }
        }

        if (warm > 0) {
            tratti += creaTratto(
                "Riscaldamento", CodiceAllenamento.A1, warm, 1,
                "A scelta tra Stile Libero e Dorso con esercizi di sensibilità (bracciata singola / cagnolino) e scivolamento.",
                tabella, secPer100, continuo = true
            )
        }

        val mD = metri[CodiceAllenamento.D] ?: 0
        if (mD >= 100) {
            tratti += creaTratto(
                "Attivazione e Velocità", CodiceAllenamento.D, 50, mD / 50,
                "15m velocità massima (partenza / virata esplosiva) + 35m scioglimento A1.",
                tabella, secPer100
            )
        }

        for (codice in ORDINE_SERIE) {
            val m = metri[codice] ?: 0
            if (m <= 0) continue
            val (dist, n) = pianifica(codice, m)
            tratti += creaTratto(titoloSerie(codice), codice, dist, n, descrizioneSerie(codice), tabella, secPer100)
        }

        if (cool > 0) {
            tratti += creaTratto(
                "Defaticamento", CodiceAllenamento.A1, cool, 1,
                "Nuoto rilassato a dorso e stile libero a respirazione ampia per lo smaltimento e il ripristino organico.",
                tabella, secPer100, continuo = true
            )
        }
        return tratti
    }

    private fun titoloSerie(c: CodiceAllenamento) = when (c) {
        CodiceAllenamento.A2 -> "Serie A2 · Fondo e Capacità"
        CodiceAllenamento.B1 -> "Serie B1 · Soglia Anaerobica"
        CodiceAllenamento.B2 -> "Serie B2 · VO2 Max"
        CodiceAllenamento.C1 -> "Serie C1 · Tolleranza Lattacida"
        CodiceAllenamento.C2 -> "Serie C2 · Potenza Lattacida"
        CodiceAllenamento.C3 -> "Serie C3 · Ritmo Gara"
        else -> c.nome
    }

    private fun descrizioneSerie(c: CodiceAllenamento) = when (c) {
        CodiceAllenamento.A2 -> "Nuoto continuo a stile principale con controllo del numero di bracciate; attrezzi solo se compatibili con le limitazioni."
        CodiceAllenamento.B1 -> "Passo soglia regolare e controllato (frequenza cardiaca ~165 bpm)."
        CodiceAllenamento.B2 -> "Intervalli ad alta intensità (pulsazioni 175+ bpm), massimo sforzo aerobico."
        CodiceAllenamento.C1 -> "Tenuta dell'acidosi a passo gara, mantenendo assetto e idrodinamicità."
        CodiceAllenamento.C2 -> "Massima velocità sostenibile con recupero ampio: qualità prima della quantità."
        CodiceAllenamento.C3 -> "Passo gara obiettivo con precisione cronometrica al decimo di secondo."
        else -> ""
    }

    private fun creaTratto(
        sezione: String,
        codice: CodiceAllenamento,
        distanza: Int,
        ripetizioni: Int,
        descrizione: String,
        tabella: TabellaRitmiAtleta?,
        secPer100: Double,
        continuo: Boolean = false
    ): TrattoSeduta {
        val metri = distanza * ripetizioni
        val ritmo = tabella?.ritmi?.get(codice)

        if (continuo) {
            val sec = if (ritmo != null) (metri / 100.0 * ritmo.passo100mCentesimi / 100.0).roundToInt()
            else (metri / 100.0 * secPer100).roundToInt()
            return TrattoSeduta(
                sezione = sezione, codice = codice, metri = metri,
                ripetizioni = "1 x $metri m", descrizione = descrizione,
                ripartenza = if (ritmo != null) "Continuo · passo ${ritmo.passo100mFormatted}/100m" else "Continuo, ritmo sciolto",
                notaSpecifica = ritmo?.noteTecniche,
                distanzaRipetizione = metri, numeroRipetizioni = 1, durataStimataSec = sec
            )
        }

        val rip = tabella?.let { CalcoloRitmiRipartenze.ripartenzaPer(it, codice, distanza) }
        val durata = if (rip != null) rip.ripartenzaSecondi * ripetizioni else (metri / 100.0 * secPer100).roundToInt()
        return TrattoSeduta(
            sezione = sezione, codice = codice, metri = metri,
            ripetizioni = "$ripetizioni x ${distanza}m", descrizione = descrizione,
            ripartenza = rip?.ripartenzaFormatted ?: "Ritmi non calcolabili: inserisci un 100m",
            notaSpecifica = if (rip != null && ritmo != null) {
                "Passo ${rip.passoFormatted} sui ${distanza}m · recupero effettivo ~${rip.pausaEffettivaSecondi}\" · ${ritmo.noteTecniche}"
            } else null,
            distanzaRipetizione = distanza, numeroRipetizioni = ripetizioni, durataStimataSec = durata
        )
    }

    // ---------------------------------------------------------------- quote

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
            TipoMicrociclo.PAUSA -> mapOf(CodiceAllenamento.A1 to 1.0)
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
}