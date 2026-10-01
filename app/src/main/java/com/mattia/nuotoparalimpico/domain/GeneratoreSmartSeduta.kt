package com.mattia.nuotoparalimpico.domain

import com.mattia.nuotoparalimpico.data.Atleta
import com.mattia.nuotoparalimpico.data.CondizioneMedica
import com.mattia.nuotoparalimpico.data.ContestoTempo
import com.mattia.nuotoparalimpico.data.FaseMesociclo
import com.mattia.nuotoparalimpico.data.LogSeduta
import com.mattia.nuotoparalimpico.data.Mesociclo
import com.mattia.nuotoparalimpico.data.Stile
import com.mattia.nuotoparalimpico.data.Tempo
import com.mattia.nuotoparalimpico.data.TipoMicrociclo
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.Period
import java.util.Locale
import kotlin.math.pow
import kotlin.math.roundToInt

/** Arrotonda i volumi (metri) a multipli di 50m. */
fun Int.arrotondaA50m(): Int = ((this + 25) / 50) * 50

data class TrattoSeduta(
    val sezione: String,
    val codice: CodiceAllenamento,
    val metri: Int,
    val ripetizioni: String,
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
    val volumeTotaleMetri: Int,
    val ripartizioneCodici: Map<CodiceAllenamento, Int>,
    val tratti: List<TrattoSeduta>,
    val adattamentiEta: List<String>,
    val avvertenzeMediche: List<String>,
    val tempiUtilizzati: List<Tempo> = emptyList(),
    val noteCalibrazione: List<String> = emptyList(),
    val tipoSeduta: String = ""
)

private class SerieDef(
    val codice: CodiceAllenamento,
    val sezione: String,
    val lunghezza: Int,
    var n: Int,
    val descrizione: String,
    val notaDefault: String
)

private class Riferimento(val tempo: Tempo, val centesimi100: Int, val stimato: Boolean, val datato: Boolean)

object GeneratoreSmartSeduta {

    private val ORDINE_SERIE = listOf(
        CodiceAllenamento.A2, CodiceAllenamento.B1, CodiceAllenamento.B2,
        CodiceAllenamento.C1, CodiceAllenamento.C2, CodiceAllenamento.C3
    )

    private val RECUPERO_FISSO = mapOf(
        CodiceAllenamento.A2 to 20, CodiceAllenamento.B1 to 15, CodiceAllenamento.B2 to 30,
        CodiceAllenamento.C1 to 60, CodiceAllenamento.C2 to 90, CodiceAllenamento.C3 to 120,
        CodiceAllenamento.D to 45
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
        mesocicloCorrente: Mesociclo? = null,
        giorniAllenamento: Set<DayOfWeek> = emptySet()
    ): SchedaSeduta {
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
        val avvertenze = mutableListOf<String>()
        val note = mutableListOf<String>()

        // 1. Quote base per codice
        val quote = calcolaQuoteBase(fase, tipoMicro).toMutableMap()
        fun sposta(da: CodiceAllenamento, a: CodiceAllenamento, frazione: Double) {
            val q = quote[da] ?: return
            val m = q * frazione
            quote[da] = q - m
            quote[a] = (quote[a] ?: 0.0) + m
        }

        // 2. Tipo di seduta nella settimana (qualità / mista / aerobica) in base ai giorni di allenamento
        var tipoSeduta = ""
        if (tipoMicro == TipoMicrociclo.CARICO && data != null && giorniAllenamento.size >= 2 &&
            data.dayOfWeek in giorniAllenamento
        ) {
            val ordinati = giorniAllenamento.sortedBy { it.value }
            val idx = ordinati.indexOf(data.dayOfWeek)
            when {
                idx == 0 -> {
                    sposta(CodiceAllenamento.A2, CodiceAllenamento.B1, 0.35)
                    tipoSeduta = "Seduta di qualità"
                }
                idx == ordinati.size - 1 -> {
                    listOf(CodiceAllenamento.B2, CodiceAllenamento.C1, CodiceAllenamento.C2)
                        .forEach { sposta(it, CodiceAllenamento.A2, 0.4) }
                    tipoSeduta = "Seduta aerobica"
                }
                else -> tipoSeduta = "Seduta mista"
            }
        }

        // 3. Età
        if (eta != null) {
            when {
                eta < 12 -> {
                    listOf(CodiceAllenamento.C1, CodiceAllenamento.C2).forEach {
                        sposta(it, CodiceAllenamento.A1, 0.6)
                        sposta(it, CodiceAllenamento.D, 1.0)
                    }
                    adattamentiEta += "Atleta under 12: escluse serie ad alto accumulo lattacido (C1/C2). Enfasi su tecnica (A1) e reattività/giochi veloci (D)."
                }
                eta >= 35 -> {
                    listOf(CodiceAllenamento.C1, CodiceAllenamento.C2).forEach { sposta(it, CodiceAllenamento.A1, 0.5) }
                    adattamentiEta += "Atleta master (35+): più riscaldamento/scioglimento A1 e recuperi ampi per la protezione articolare."
                }
                eta in 12..14 -> {
                    sposta(CodiceAllenamento.C2, CodiceAllenamento.B1, 0.5)
                    adattamentiEta += "Categoria 12-14 anni: introduzione graduale della potenza lattacida, priorità allo sviluppo della soglia (B1)."
                }
            }
        }

        // 4. Condizioni mediche (segnali dall'analisi FINP)
        val attive = condizioniMediche.filter { it.attiva }
        fun nomi(filtro: (FlagMedici) -> Boolean): String =
            attive.filter { filtro(FINPSpecialistAI.flagMedici("${it.descrizione} ${it.limitazioni}")) }
                .joinToString(", ") { it.descrizione }

        val flag = FINPSpecialistAI.flagMedici(attive.joinToString(" | ") { "${it.descrizione} ${it.limitazioni}" })
        if (flag.spalla) {
            sposta(CodiceAllenamento.B2, CodiceAllenamento.A1, 0.4)
            avvertenze += "⚠️ Spalla/articolazioni (${nomi { it.spalla }}): ridotte le serie B2, evitare palette rigide, più esercizi di sensibilità e gambe."
        }
        if (flag.neurologica) {
            listOf(CodiceAllenamento.C1, CodiceAllenamento.C2).forEach {
                sposta(it, CodiceAllenamento.A2, 0.7)
                sposta(it, CodiceAllenamento.A1, 1.0)
            }
            avvertenze += "⚠️ Condizione neurologica/funzionale (${nomi { it.neurologica }}): azzerate le serie C1/C2 per prevenire spasticità e fatica centrale; recuperi ampi."
        }
        if (flag.cardiorespiratoria) {
            sposta(CodiceAllenamento.C2, CodiceAllenamento.A2, 1.0)
            sposta(CodiceAllenamento.C1, CodiceAllenamento.A2, 0.5)
            sposta(CodiceAllenamento.B2, CodiceAllenamento.A2, 0.7)
            avvertenze += "⚠️ Cardiovascolare/respiratoria (${nomi { it.cardiorespiratoria }}): evitare apnee prolungate e picchi massimali, ritmo costante A2/B1."
        }
        if (flag.visiva) {
            avvertenze += "👁️ Disabilità visiva (${nomi { it.visiva }}): tapper per arrivi e virate nelle serie veloci, conteggio costante delle bracciate."
        }
        if (flag.epilessia) {
            avvertenze += "⚠️ Epilessia (${nomi { it.epilessia }}): sorveglianza continua a bordo vasca, mai in acqua da soli, evitare iperventilazione e apnee."
        }
        if (flag.termoregolazione) {
            avvertenze += "🌡️ Termoregolazione alterata (${nomi { it.termoregolazione }}): controllare la temperatura dell'acqua e prevedere pause di recupero."
        }
        attive.filter { !FINPSpecialistAI.flagMedici("${it.descrizione} ${it.limitazioni}").coperta }.forEach {
            avvertenze += "ℹ️ Adattamento personalizzato (${it.descrizione}): " +
                    (if (it.limitazioni.isNotBlank()) it.limitazioni else "monitorare recupero e resistenza.")
        }

        // 5. Volume, corretto sul carico recente dell'atleta (ACWR)
        var volume = metriTarget.coerceAtLeast(400).arrotondaA50m()
        val (fattoreCarico, notaCarico) = fattoreDaCarico(logSedute, oggi)
        if (fattoreCarico < 1.0) {
            volume = (volume * fattoreCarico).roundToInt().arrotondaA50m().coerceAtLeast(400)
        }
        notaCarico?.let { note += it }

        // 6. Tempi di riferimento -> tabella ritmi
        val rif = scegliRiferimento(tempi, oggi)
        val tabella = rif?.let {
            CalcoloRitmiRipartenze.calcolaTabellaRitmi(
                atletaId = atleta?.id ?: 0L,
                tempo100mCentesimi = it.centesimi100,
                stile = it.tempo.stile,
                vascaMetri = 25
            )
        }
        if (rif != null) {
            val t = rif.tempo
            note += "Ritmi calcolati su ${formattaTempo(t.centesimi)} nei ${t.distanzaMetri}m ${nomeStile(t.stile)}" +
                    (if (rif.stimato) " (convertito in ${formattaTempo(rif.centesimi100)} sui 100m)" else "") +
                    (if (t.vascaMetri == 50) ", corretto per la vasca da 25m" else "")
            if (rif.datato) note += "Il tempo di riferimento ha più di 8 mesi: fai un test per aggiornare i ritmi."
        } else if (atleta != null) {
            note += "Nessun tempo di riferimento: ripartenze a recupero fisso. Inserisci un tempo di gara o test per calcolarle."
        } else {
            note += "Scheda di squadra: ripartenze a recupero fisso. Seleziona un atleta per ritmi personalizzati."
        }

        // 7. Metri per codice e costruzione della seduta
        val somma = quote.values.sum().coerceAtLeast(0.01)
        val metriCodice = quote
            .mapValues { (_, q) -> ((q / somma) * volume).roundToInt().arrotondaA50m() }
            .filterValues { it > 0 }
        val tratti = costruisciTratti(volume, metriCodice, fase, tabella)

        val nomeAtleta = atleta?.let { "${it.nome} ${it.cognome}" }
        val titoloBase = if (nomeAtleta != null) "Scheda Personalizzata · $nomeAtleta" else "Scheda di Squadra"

        return SchedaSeduta(
            titolo = if (tipoSeduta.isNotEmpty()) "$titoloBase · $tipoSeduta" else titoloBase,
            data = data,
            nomeAtleta = nomeAtleta,
            etaAtleta = eta,
            categoriaEta = categoria,
            faseStagione = fase,
            tipoMicrociclo = tipoMicro,
            volumeTotaleMetri = tratti.sumOf { it.metri },
            ripartizioneCodici = tratti.groupBy { it.codice }.mapValues { (_, l) -> l.sumOf { it.metri } },
            tratti = tratti,
            adattamentiEta = adattamentiEta,
            avvertenzeMediche = avvertenze,
            tempiUtilizzati = listOfNotNull(rif?.tempo),
            noteCalibrazione = note,
            tipoSeduta = tipoSeduta
        )
    }

    // ---------------------------------------------------------------- RIFERIMENTO TEMPI

    private fun nomeStile(s: Stile) = s.name.replace("_", " ").lowercase()

    private fun scegliRiferimento(tempi: List<Tempo>, oggi: LocalDate): Riferimento? {
        val candidati = tempi.filter { it.stile != Stile.MISTI && it.distanzaMetri in 50..400 }
        if (candidati.isEmpty()) return null
        val base = candidati.filter { it.contesto != ContestoTempo.ALLENAMENTO }.ifEmpty { candidati }
        val recenti = base.filter { it.data.isAfter(oggi.minusDays(240)) }
        val pool = recenti.ifEmpty { base }
        val stile = if (pool.any { it.stile == Stile.STILE_LIBERO }) Stile.STILE_LIBERO
        else pool.groupingBy { it.stile }.eachCount().maxByOrNull { it.value }!!.key
        val delloStile = pool.filter { it.stile == stile }

        fun a100(t: Tempo): Int {
            val esponente = if (t.distanzaMetri < 100) 1.10 else 1.06
            val vasca = if (t.vascaMetri == 50) 0.97 else 1.0
            return (t.centesimi * vasca * (100.0 / t.distanzaMetri).pow(esponente)).roundToInt()
        }

        val esatti = delloStile.filter { it.distanzaMetri == 100 }
        val migliore = if (esatti.isNotEmpty()) esatti.minByOrNull { a100(it) }!! else delloStile.minByOrNull { a100(it) }!!
        return Riferimento(migliore, a100(migliore), migliore.distanzaMetri != 100, recenti.isEmpty())
    }

    // ---------------------------------------------------------------- CARICO (ACWR)

    private fun fattoreDaCarico(log: List<LogSeduta>, oggi: LocalDate): Pair<Double, String?> {
        fun carico(da: LocalDate, a: LocalDate) = log
            .filter { it.presente && it.rpe != null && !it.data.isBefore(da) && it.data.isBefore(a) }
            .sumOf { (it.rpe ?: 0) * it.durataMin }

        val acuto = carico(oggi.minusDays(7), oggi)
        val cronici = (1..4).map { w -> carico(oggi.minusDays(7L * (w + 1)), oggi.minusDays(7L * w)) }.filter { it > 0 }
        if (acuto == 0 || cronici.size < 2) return 1.0 to null

        val r = CalcoloScienzaNuoto.calcolaACWR(acuto, cronici).acwrRapporto
        val rs = String.format(Locale.ROOT, "%.2f", r)
        return when {
            r > 1.45 -> 0.80 to "Carico recente molto alto (ACWR $rs): volume ridotto del 20% per proteggere spalle e recupero."
            r > 1.25 -> 0.90 to "Carico recente alto (ACWR $rs): volume ridotto del 10%."
            else -> 1.0 to null
        }
    }

    // ---------------------------------------------------------------- QUOTE

    private fun calcolaQuoteBase(fase: FaseMesociclo, tipo: TipoMicrociclo): Map<CodiceAllenamento, Double> = when (tipo) {
        TipoMicrociclo.ADATTAMENTO, TipoMicrociclo.RECUPERO -> mapOf(
            CodiceAllenamento.A1 to 0.50, CodiceAllenamento.A2 to 0.40, CodiceAllenamento.D to 0.10
        )
        TipoMicrociclo.SCARICO -> mapOf(
            CodiceAllenamento.A1 to 0.45, CodiceAllenamento.A2 to 0.25,
            CodiceAllenamento.B2 to 0.15, CodiceAllenamento.D to 0.15
        )
        TipoMicrociclo.GARA -> mapOf(
            CodiceAllenamento.A1 to 0.45, CodiceAllenamento.C3 to 0.30, CodiceAllenamento.D to 0.25
        )
        TipoMicrociclo.PAUSA -> mapOf(CodiceAllenamento.A1 to 1.0)
        TipoMicrociclo.CARICO -> when (fase) {
            FaseMesociclo.PREPARAZIONE_GENERALE -> mapOf(
                CodiceAllenamento.A1 to 0.30, CodiceAllenamento.A2 to 0.45,
                CodiceAllenamento.B1 to 0.20, CodiceAllenamento.D to 0.05
            )
            FaseMesociclo.PREPARAZIONE_SPECIFICA -> mapOf(
                CodiceAllenamento.A1 to 0.25, CodiceAllenamento.A2 to 0.30, CodiceAllenamento.B1 to 0.20,
                CodiceAllenamento.B2 to 0.15, CodiceAllenamento.D to 0.10
            )
            FaseMesociclo.PRE_GARA -> mapOf(
                CodiceAllenamento.A1 to 0.30, CodiceAllenamento.A2 to 0.20, CodiceAllenamento.B2 to 0.20,
                CodiceAllenamento.C1 to 0.15, CodiceAllenamento.D to 0.15
            )
            FaseMesociclo.COMPETITIVA -> mapOf(
                CodiceAllenamento.A1 to 0.35, CodiceAllenamento.A2 to 0.15, CodiceAllenamento.C2 to 0.20,
                CodiceAllenamento.C3 to 0.15, CodiceAllenamento.D to 0.15
            )
        }
    }

    // ---------------------------------------------------------------- COSTRUZIONE SEDUTA

    private fun maxRipetizioni(c: CodiceAllenamento) = when (c) {
        CodiceAllenamento.A2 -> 8
        CodiceAllenamento.B1 -> 12
        CodiceAllenamento.B2 -> 10
        CodiceAllenamento.C3 -> 6
        else -> 8
    }

    private fun sezioneSerie(c: CodiceAllenamento) = when (c) {
        CodiceAllenamento.A2 -> "Serie Principale - Fondo e Capacità"
        CodiceAllenamento.B1 -> "Serie Principale - Soglia Anaerobica"
        CodiceAllenamento.B2 -> "Serie Principale - VO2 Max"
        CodiceAllenamento.C1 -> "Serie Principale - Tolleranza Lattacida"
        CodiceAllenamento.C2 -> "Serie Principale - Potenza Lattacida"
        CodiceAllenamento.C3 -> "Serie Principale - Ritmo Gara"
        else -> "Serie"
    }

    private fun descrizioneSerie(c: CodiceAllenamento, lunghezza: Int) = when (c) {
        CodiceAllenamento.A2 -> "Stile principale o misti a ritmo costante, palette corte e boccaglio per la continuità del gesto."
        CodiceAllenamento.B1 -> "Passo soglia regolare e controllato (FC ~165 bpm), numero di bracciate costante."
        CodiceAllenamento.B2 -> "Intervalli ad alta intensità (FC 175+ bpm): massimo sforzo aerobico senza perdere tecnica."
        CodiceAllenamento.C1 ->
            if (lunghezza >= 100) "Prima metà alla massima velocità sostenibile, seconda metà in tenuta ad alta frequenza."
            else "Velocità elevata sostenuta con tenuta tecnica."
        CodiceAllenamento.C2 -> "Sforzo massimale con recupero ampio: la qualità viene prima della quantità."
        CodiceAllenamento.C3 -> "Passo gara obiettivo con precisione cronometrica al decimo di secondo."
        else -> "Velocità: 15m massimi (partenza o virata esplosiva) + 35m di scioglimento A1."
    }

    private fun notaDefault(c: CodiceAllenamento) = when (c) {
        CodiceAllenamento.A2 -> "Respirazione regolare e controllo costante dell'andatura."
        CodiceAllenamento.B1 -> "Lavoro fondamentale per innalzare la soglia anaerobica."
        CodiceAllenamento.B2 -> "Mantenere costante il numero di bracciate per vasca."
        CodiceAllenamento.C1 -> "Resistere all'acidosi mantenendo assetto e idrodinamicità."
        CodiceAllenamento.C2 -> "Se il passo cala o il gesto si rompe, fermarsi."
        CodiceAllenamento.C3 -> "Massima concentrazione sul ritmo di bracciata della gara prioritaria."
        else -> "Focus sulla reattività dei primi metri e sulla frequenza di bracciata."
    }

    /** Ripartenza per una serie di una data lunghezza: tempo di nuotata scalato + recupero del codice. */
    private fun ripartenzaPer(ritmo: RitmoCodice, lunghezza: Int): Pair<String, String> {
        val passoRepCentesimi = (ritmo.passo100mCentesimi * lunghezza / 100.0).roundToInt()
        val rip = (((passoRepCentesimi / 100.0) + ritmo.pausaSecondi) / 5.0).roundToInt() * 5
        val min = rip / 60
        val sec = rip % 60
        val testo = if (min > 0) String.format(Locale.ROOT, "a %d'%02d\"", min, sec) else "a $sec\""
        return testo to formattaTempo(passoRepCentesimi)
    }

    private fun costruisciTratti(
        volume: Int,
        metriCodice: Map<CodiceAllenamento, Int>,
        fase: FaseMesociclo,
        tabella: TabellaRitmiAtleta?
    ): List<TrattoSeduta> {
        val serie = mutableListOf<SerieDef>()

        val mD = metriCodice[CodiceAllenamento.D] ?: 0
        if (mD >= 50) {
            val n = (mD / 50).coerceIn(2, 8)
            serie += SerieDef(
                CodiceAllenamento.D, "Attivazione e Velocità", 50, n,
                descrizioneSerie(CodiceAllenamento.D, 50), notaDefault(CodiceAllenamento.D)
            )
        }

        for (c in ORDINE_SERIE) {
            val m = metriCodice[c] ?: continue
            if (m < 50) continue
            var len = when (c) {
                CodiceAllenamento.A2 -> if (m >= 1200) 400 else 200
                CodiceAllenamento.B1 -> if (m >= 1000) 200 else 100
                CodiceAllenamento.C2 -> 50
                CodiceAllenamento.C3 ->
                    if ((fase == FaseMesociclo.COMPETITIVA || fase == FaseMesociclo.PRE_GARA) && m >= 400) 100 else 50
                else -> 100
            }
            while (len > m && len > 50) len /= 2
            val n = (m / len).coerceIn(1, maxRipetizioni(c))
            serie += SerieDef(c, sezioneSerie(c), len, n, descrizioneSerie(c, len), notaDefault(c))
        }

        // Il resto del volume è A1 (riscaldamento + defaticamento), mai meno di 300m
        fun metriSerie() = serie.sumOf { it.n * it.lunghezza }
        while (volume - metriSerie() < 300) {
            val s = serie.filter { it.n > 1 }.maxByOrNull { it.n * it.lunghezza } ?: break
            s.n -= 1
        }
        val a1 = (volume - metriSerie()).coerceAtLeast(300)
        val riscaldamento = ((a1 * 0.65).roundToInt().arrotondaA50m()).coerceIn(150, a1 - 100)
        val defaticamento = a1 - riscaldamento

        val ritmoA1 = tabella?.ritmi?.get(CodiceAllenamento.A1)
        val tratti = mutableListOf<TrattoSeduta>()

        tratti += TrattoSeduta(
            sezione = "Riscaldamento",
            codice = CodiceAllenamento.A1,
            metri = riscaldamento,
            ripetizioni = "1 x $riscaldamento m",
            descrizione = "Stile libero e dorso a scelta, con esercizi di sensibilità (bracciata singola, cagnolino) e scivolamento.",
            ripartenza = "Pausa libera",
            notaSpecifica = ritmoA1?.let { "Passo target: ${it.passo100mFormatted} per 100m · ${it.noteTecniche}" }
                ?: "Ritmo sciolto e respirazione bilanciata."
        )

        for (s in serie) {
            val ritmo = tabella?.ritmi?.get(s.codice)
            val (ripartenza, nota) = if (ritmo != null) {
                val (r, passoRep) = ripartenzaPer(ritmo, s.lunghezza)
                r to "Passo target: $passoRep su ${s.lunghezza}m · ${ritmo.noteTecniche}"
            } else {
                "recupero ${RECUPERO_FISSO[s.codice] ?: 30}\"" to s.notaDefault
            }
            tratti += TrattoSeduta(
                sezione = s.sezione,
                codice = s.codice,
                metri = s.n * s.lunghezza,
                ripetizioni = "${s.n} x ${s.lunghezza}m",
                descrizione = s.descrizione,
                ripartenza = ripartenza,
                notaSpecifica = nota
            )
        }

        tratti += TrattoSeduta(
            sezione = "Defaticamento",
            codice = CodiceAllenamento.A1,
            metri = defaticamento,
            ripetizioni = "1 x $defaticamento m",
            descrizione = "Nuoto rilassato a dorso e stile libero con respirazione 3/5 per smaltire e ripristinare.",
            ripartenza = "Scioglimento libero",
            notaSpecifica = "Decompressione muscolare e allungamento in acqua."
        )
        return tratti
    }
}