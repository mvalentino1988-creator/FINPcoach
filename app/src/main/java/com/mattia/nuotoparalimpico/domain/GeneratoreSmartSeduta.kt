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
import kotlin.math.roundToInt
import kotlin.random.Random

/** Arrotonda i volumi (metri) a multipli di 50m (es. 400m, 450m, 500m). */
fun Int.arrotondaA50m(): Int = ((this + 25) / 50) * 50

data class TrattoSeduta(
    val sezione: String,          // es. "Riscaldamento", "Tecnica", "Serie - Soglia Anaerobica", "Defaticamento"
    val codice: CodiceAllenamento,
    val metri: Int,
    val ripetizioni: String,      // es. "4 x 100m", "8 x 50m"
    val descrizione: String,
    val ripartenza: String? = null,
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
    val volumeTotaleMetri: Int,     // somma reale dei tratti
    val ripartizioneCodici: Map<CodiceAllenamento, Int>, // metri per codice, calcolati dai tratti
    val tratti: List<TrattoSeduta>,
    val adattamentiEta: List<String>,
    val avvertenzeMediche: List<String>,
    val tempiUtilizzati: List<Tempo> = emptyList(),
    val noteCalibrazione: List<String> = emptyList()
)

// ------------------------------------------------------------------ ARCHIVIO ESERCIZI

private class Variante(
    val unita: Int,        // metri della singola ripetizione
    val maxRip: Int,
    val descrizione: String,
    val nota: String
)

private val SEZIONI_SERIE = mapOf(
    CodiceAllenamento.A2 to "Serie - Fondo e Capacità",
    CodiceAllenamento.B1 to "Serie - Soglia Anaerobica",
    CodiceAllenamento.B2 to "Serie - VO2 Max",
    CodiceAllenamento.C1 to "Serie - Tolleranza Lattacida",
    CodiceAllenamento.C2 to "Serie - Potenza Lattacida",
    CodiceAllenamento.C3 to "Serie - Ritmo Gara"
)

/** Usate solo se l'atleta non ha ancora un tempo sui 100m con cui calcolare le ripartenze. */
private val RIPARTENZA_BASE = mapOf(
    CodiceAllenamento.A2 to "recupero 15\"",
    CodiceAllenamento.B1 to "recupero 15\"-20\"",
    CodiceAllenamento.B2 to "recupero 20\"-30\"",
    CodiceAllenamento.C1 to "recupero 1'30\"-2'",
    CodiceAllenamento.C2 to "recupero 2'-3' completo",
    CodiceAllenamento.C3 to "recupero 2' completo"
)

private val VARIANTI: Map<CodiceAllenamento, List<Variante>> = mapOf(
    CodiceAllenamento.A2 to listOf(
        Variante(200, 6, "Stile principale continuo, respirazione regolare e conteggio delle bracciate.", "Stesso tempo su ogni ripetizione."),
        Variante(400, 3, "Nuotata continua a passo costante: secondo 200 leggermente più veloce del primo (split negativo).", "Controlla il passo ai 200m."),
        Variante(100, 12, "Ogni 100: primi 25 in sensibilità/tecnica e 75 a passo fondo costante.", "Qualità del gesto prima della velocità."),
        Variante(300, 4, "Nuotata lunga con respirazione bilaterale (3/5 bracciate) e passo regolare.", "Respirazione bilaterale per equilibrare la bracciata."),
        Variante(150, 8, "100 a passo fondo + 50 più sciolti in tecnica, senza fermarsi.", "Cambio di ritmo morbido nei 50 finali.")
    ),
    CodiceAllenamento.B1 to listOf(
        Variante(100, 10, "Passo soglia regolare e controllato (FC ~165 bpm).", "Lavoro fondamentale per alzare la soglia."),
        Variante(200, 6, "Soglia su 200: secondo 100 allo stesso passo del primo.", "Non partire troppo forte."),
        Variante(300, 4, "Soglia lunga su 300 con respirazione bilaterale.", "Tieni costante il numero di bracciate."),
        Variante(50, 16, "Serie di 50 a ritmo soglia con recupero breve: stesso tempo a ogni ripetizione.", "Cerca la regolarità, non la velocità."),
        Variante(100, 8, "Ogni 100: 25 a ritmo soglia alto + 75 a soglia regolare, alternando gli stili secondo la classe.", "Cambia stile ogni ripetizione.")
    ),
    CodiceAllenamento.B2 to listOf(
        Variante(100, 8, "Intervalli ad alta intensità (175+ bpm), massimo sforzo aerobico.", "Mantieni costante il numero di bracciate per vasca."),
        Variante(50, 16, "50 veloci con frequenza alta, accelerazione nella seconda vasca.", "Frequenza alta, ampiezza mantenuta."),
        Variante(200, 4, "200 a ritmo VO2: 150 costanti e ultimi 50 in progressione.", "Resisti nella seconda metà."),
        Variante(150, 6, "150 a ritmo VO2 con respirazione controllata e virata veloce.", "Virate e uscite pulite.")
    ),
    CodiceAllenamento.C1 to listOf(
        Variante(100, 6, "50 alla massima velocità sostenibile + 50 tenuta con elevata frequenza.", "Resisti all'acidosi mantenendo assetto e idrodinamicità."),
        Variante(200, 4, "Ritmo gara 200: costante, ultimi 50 senza calo di frequenza.", "Gestisci il primo 100."),
        Variante(50, 10, "50 a ritmo gara 100 con recupero incompleto, controllo del tempo.", "Stesso tempo su tutte le ripetizioni.")
    ),
    CodiceAllenamento.C2 to listOf(
        Variante(50, 10, "50 massimali con partenza dal blocco o dall'acqua, recupero ampio.", "Qualità massima, recupero completo."),
        Variante(100, 4, "100 a tutta, ultimi 25 senza calo di frequenza.", "Non calare nell'ultima vasca."),
        Variante(50, 8, "25 esplosivi + 25 di mantenimento di frequenza, variando stile.", "Cambia stile ogni due ripetizioni.")
    ),
    CodiceAllenamento.C3 to listOf(
        Variante(50, 6, "Passo gara con precisione cronometrica al decimo di secondo.", "Concentrazione sul ritmo di bracciata della gara prioritaria."),
        Variante(100, 4, "Simulazione di gara: partenza, virate e finale come in gara.", "Cura i dettagli tecnici di partenza e virata."),
        Variante(100, 4, "100 con split: primi 50 a ritmo gara, secondi 50 entro 1\" dal primo.", "Controlla lo split.")
    )
)

private val DESCRIZIONI_D = listOf(
    "15m a velocità massima (partenza / virata esplosiva) + 35m scioglimento A1.",
    "Partenza dal blocco o dall'acqua: 15m esplosivi e poi nuoto facile fino al muro.",
    "Uscita dalla virata: spinta e prime bracciate a tutta per 15m + 35m facili.",
    "10m di ondulazioni/scivolamento spinto + 15m a tutta frequenza + 25m sciolti.",
    "Sprint reattivo: 20m massimali con partenza a comando + 30m di recupero attivo."
)

private val WARMUP = listOf(
    "Misto libero: 100 stile + 50 dorso + il resto a stile libero, respirazione rilassata.",
    "Progressivo: ogni 100 un po' più veloce, ultime 50 di ogni blocco a ritmo A2.",
    "Alternare 50 nuoto / 50 gambe con scivolamento lungo.",
    "Stile libero con conteggio delle bracciate: una bracciata in meno per vasca ogni 100.",
    "Stili a scelta in base alla classe, 25 per stile per mobilità, poi stile libero sciolto."
)

private val DEFATICAMENTO = listOf(
    "Nuoto molto lento alternando dorso e stile libero, respirazione ampia.",
    "Dorso lento con rotazione del busto e mani rilassate, 25 stile libero soffice.",
    "Alternare 50 stile libero e 50 dorso con bracciata lunga e senza fretta.",
    "Scioglimento libero con scivolamenti lunghi e respirazione 3/5."
)

private val TECNICA = listOf(
    "Catch-up: una mano attende l'altra davanti, controllo dell'allungamento",
    "6-3-6: 6 colpi di gambe sul fianco, 3 bracciate, 6 colpi sull'altro fianco",
    "Bracciata singola alternata (3 dx + 3 sx) per sensibilità e presa",
    "Pugni chiusi: nuoto a pugni chiusi per sentire l'avambraccio come superficie propulsiva",
    "Scivolamento in assetto + 3 bracciate per massimizzare la distanza per bracciata",
    "Respirazione 3/5/7 bracciate, bilaterale",
    "Dorso: rotazione delle spalle e braccio dritto, 25 gambe + 25 nuoto",
    "Delfino: 25 ondulazioni + 25 nuoto facile",
    "Rana: 3 gambe + 1 bracciata, controllo della traiettoria",
    "Cagnolino: bracciata corta con gomito alto",
    "Fingertip drag: strisciare la punta delle dita sull'acqua nel recupero",
    "Gambe senza tavoletta, 25 a pancia + 25 a dorso"
)

private val TECNICA_SPALLA = listOf(
    "Gambe in assetto (braccia lungo i fianchi o tavoletta), 25 pancia + 25 dorso",
    "Scivolamento e sensibilità con bracciata ad ampiezza ridotta, sotto la soglia del dolore",
    "Nuoto con boccaglio frontale a ritmo A1, senza palette",
    "Respirazione bilaterale lenta, bracciata corta e rilassata",
    "Dorso lento con rotazione del busto e mani rilassate",
    "Galleggiamento e scivolamento in linea, 3 bracciate lente e di nuovo scivolamento"
)

// ------------------------------------------------------------------ GENERATORE

object GeneratoreSmartSeduta {

    /**
     * Genera la scheda di una seduta. Gli esercizi sono scelti con un seme che dipende dalla data
     * (e dall'atleta): lo stesso giorno dà sempre la stessa scheda, giorni diversi danno esercizi
     * diversi. [variante] permette di ottenere un'altra scheda per lo stesso giorno.
     */
    fun genera(
        data: LocalDate?,
        metriTarget: Int,
        fase: FaseMesociclo,
        tipoMicro: TipoMicrociclo,
        atleta: Atleta? = null,
        condizioniMediche: List<CondizioneMedica> = emptyList(),
        tempi: List<Tempo> = emptyList(),
        logSedute: List<LogSeduta> = emptyList(),
        mesocicloCorrente: Mesociclo? = null,
        variante: Int = 0
    ): SchedaSeduta {
        val volumeValido = metriTarget.coerceAtLeast(400).arrotondaA50m()
        val oggi = data ?: LocalDate.now()
        val rnd = Random((oggi.toEpochDay() * 1_000_003L) + (atleta?.id ?: 0L) * 7_919L + variante * 104_729L)

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
        val noteCalibrazione = mutableListOf<String>()

        // 0. Tempo di riferimento: serve solo a calcolare passi e ripartenze.
        // Il volume NON viene modificato qui: le fasi lo hanno già ridotto nel piano.
        val tempoRiferimento = CalcoloRitmiRipartenze.tempoRiferimento100(tempi, oggi)
        val tabellaRitmi = if (tempoRiferimento != null && atleta != null) {
            CalcoloRitmiRipartenze.calcolaTabellaRitmi(
                atletaId = atleta.id,
                tempo100mCentesimi = tempoRiferimento.centesimi,
                stile = tempoRiferimento.stile,
                vascaMetri = 25
            )
        } else null
        if (tempoRiferimento != null && tabellaRitmi != null) {
            noteCalibrazione += "Ritmi e ripartenze calcolati sul miglior 100m ${tempoRiferimento.stile.name.replace("_", " ").lowercase()}: ${formattaTempo(tempoRiferimento.centesimi)}"
        }

        // 1. Quote percentuali per codice
        val quoteBase = calcolaQuoteBase(fase, tipoMicro).toMutableMap()

        // 2. Modifiche in base all'età
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

        // 3. Modifiche per condizioni mediche e limitazioni attive
        val condizioniAttive = condizioniMediche.filter { it.attiva }
        var spalla = false
        condizioniAttive.forEach { c ->
            val desc = "${c.descrizione} ${c.limitazioni}".lowercase()
            when {
                desc.contains("spalla") || desc.contains("articolare") || desc.contains("cuffia") || desc.contains("rotator") -> {
                    spalla = true
                    val riduzioneB2 = (quoteBase[CodiceAllenamento.B2] ?: 0.0) * 0.4
                    quoteBase[CodiceAllenamento.B2] = (quoteBase[CodiceAllenamento.B2] ?: 0.0) - riduzioneB2
                    quoteBase[CodiceAllenamento.A1] = (quoteBase[CodiceAllenamento.A1] ?: 0.3) + riduzioneB2
                    avvertenzeMediche += "⚠️ Condizione spalla/articolare (${c.descrizione}): evitate palette rigide nelle serie B2/C, esercizi tecnici scelti tra quelli di sensibilità e gambe."
                }
                desc.contains("affaticament") || desc.contains("neurolog") || desc.contains("spastic") || desc.contains("sclerosi") || desc.contains("midoll") || desc.contains("parapleg") || desc.contains("tetrapleg") -> {
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

        // 4. Metri per codice (multipli di 50m)
        val sommaQuote = quoteBase.values.sum().coerceAtLeast(0.01)
        val metriPerCodice = quoteBase.mapValues { (_, q) ->
            ((q / sommaQuote) * volumeValido).roundToInt().arrotondaA50m()
        }.filterValues { it > 0 }

        // 5. Costruzione dei tratti
        val tratti = costruisciTratti(metriPerCodice, spalla, tabellaRitmi, rnd)

        // La ripartizione e il volume derivano dai tratti realmente inseriti
        val perCodice = tratti.groupBy { it.codice }.mapValues { (_, l) -> l.sumOf { it.metri } }
        val ripartizione = CodiceAllenamento.entries.filter { it in perCodice }.associateWith { perCodice.getValue(it) }

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
            ripartizioneCodici = ripartizione,
            tratti = tratti,
            adattamentiEta = adattamentiEta,
            avvertenzeMediche = avvertenzeMediche,
            tempiUtilizzati = if (tabellaRitmi != null && tempoRiferimento != null) listOf(tempoRiferimento) else emptyList(),
            noteCalibrazione = noteCalibrazione
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

    /**
     * Ordine della seduta: riscaldamento, tecnica, attivazione D, una serie per ogni codice
     * previsto (dal più aerobico al più intenso), defaticamento. Il quota A1 viene divisa tra
     * riscaldamento, tecnica e defaticamento; ogni altro codice diventa una propria serie.
     */
    private fun costruisciTratti(
        metriCodice: Map<CodiceAllenamento, Int>,
        spalla: Boolean,
        tabella: TabellaRitmiAtleta?,
        rnd: Random
    ): List<TrattoSeduta> {
        val tratti = mutableListOf<TrattoSeduta>()
        val ritmoA1 = tabella?.ritmi?.get(CodiceAllenamento.A1)
        fun notaRitmo(r: RitmoCodice?, fallback: String) =
            if (r != null) "Passo target: ${r.passo100mFormatted} per 100m · ${r.noteTecniche}" else fallback

        // ---- A1: riscaldamento + tecnica + defaticamento
        val mA1 = metriCodice[CodiceAllenamento.A1] ?: 0
        val mRisc = maxOf(200, (mA1 * 0.5).roundToInt().arrotondaA50m())
        val mDefat = maxOf(100, (mA1 * 0.25).roundToInt().arrotondaA50m())
        val mTecnica = (mA1 - mRisc - mDefat).coerceAtLeast(0).arrotondaA50m()

        tratti += TrattoSeduta(
            sezione = "Riscaldamento",
            codice = CodiceAllenamento.A1,
            metri = mRisc,
            ripetizioni = "1 x $mRisc m",
            descrizione = WARMUP.random(rnd),
            ripartenza = "Continuo",
            notaSpecifica = notaRitmo(ritmoA1, "Ritmo sciolto e respirazione bilanciata.")
        )

        if (mTecnica >= 100) {
            val n = mTecnica / 50
            val drill = (if (spalla) TECNICA_SPALLA else TECNICA).shuffled(rnd).take(2)
            tratti += TrattoSeduta(
                sezione = "Tecnica",
                codice = CodiceAllenamento.A1,
                metri = n * 50,
                ripetizioni = "$n x 50m",
                descrizione = "Alterna: ${drill.joinToString(" / ")}.",
                ripartenza = ritmoA1?.let { CalcoloRitmiRipartenze.ripartenzaPer(it, 50) } ?: "recupero 15\"",
                notaSpecifica = "Per atleti senza gambata o con gambata limitata: sostituire gli esercizi di gambe con scivolamento, sensibilità o pull con boccaglio."
            )
        }

        // ---- D: attivazione e velocità
        val mD = metriCodice[CodiceAllenamento.D] ?: 0
        if (mD >= 50) {
            val n = (mD / 50).coerceIn(2, 8)
            val ritmoD = tabella?.ritmi?.get(CodiceAllenamento.D)
            tratti += TrattoSeduta(
                sezione = "Attivazione e Velocità",
                codice = CodiceAllenamento.D,
                metri = n * 50,
                ripetizioni = "$n x 50m",
                descrizione = DESCRIZIONI_D.random(rnd),
                ripartenza = ritmoD?.let { CalcoloRitmiRipartenze.ripartenzaPer(it, 50) } ?: "recupero 45\"",
                notaSpecifica = notaRitmo(ritmoD, "Focus su reattività dei primi metri e frequenza di bracciata.")
            )
        }

        // ---- Serie: una per ogni codice presente
        listOf(
            CodiceAllenamento.A2, CodiceAllenamento.B1, CodiceAllenamento.B2,
            CodiceAllenamento.C1, CodiceAllenamento.C2, CodiceAllenamento.C3
        ).forEach { codice ->
            val m = metriCodice[codice] ?: 0
            if (m < 50) return@forEach
            val lista = VARIANTI.getValue(codice)
            val candidate = lista.filter { it.unita * 2 <= m }
                .ifEmpty { lista.filter { it.unita <= m } }
                .ifEmpty { listOf(lista.minBy { it.unita }) }
            val v = candidate.random(rnd)
            val rip = (m / v.unita).coerceIn(1, v.maxRip)
            val ritmo = tabella?.ritmi?.get(codice)
            tratti += TrattoSeduta(
                sezione = SEZIONI_SERIE.getValue(codice),
                codice = codice,
                metri = rip * v.unita,
                ripetizioni = "$rip x ${v.unita}m",
                descrizione = v.descrizione,
                ripartenza = ritmo?.let { CalcoloRitmiRipartenze.ripartenzaPer(it, v.unita) }
                    ?: RIPARTENZA_BASE.getValue(codice),
                notaSpecifica = notaRitmo(ritmo, v.nota)
            )
        }

        // ---- Defaticamento
        tratti += TrattoSeduta(
            sezione = "Defaticamento",
            codice = CodiceAllenamento.A1,
            metri = mDefat,
            ripetizioni = "1 x $mDefat m",
            descrizione = DEFATICAMENTO.random(rnd),
            ripartenza = "Scioglimento libero",
            notaSpecifica = "Decompressione muscolare e allungamento in acqua."
        )

        return tratti
    }
}