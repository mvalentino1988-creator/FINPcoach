package com.mattia.nuotoparalimpico.domain

import com.mattia.nuotoparalimpico.data.Atleta
import com.mattia.nuotoparalimpico.data.ContestoTempo
import com.mattia.nuotoparalimpico.data.FaseMesociclo
import com.mattia.nuotoparalimpico.data.LogSeduta
import com.mattia.nuotoparalimpico.data.Mesociclo
import com.mattia.nuotoparalimpico.data.Stile
import com.mattia.nuotoparalimpico.data.Tempo
import java.time.LocalDate
import java.time.temporal.ChronoUnit
import java.text.Normalizer
import java.util.Locale
import kotlin.math.abs
import kotlin.math.ceil
import kotlin.math.roundToInt

data class RitmoCodice(
    val codice: CodiceAllenamento,
    val passo100mCentesimi: Int,        // Tempo target a 100m
    val passo100mFormatted: String,     // es. "1:08.35"
    val ripartenzaSecondi: Int,         // ripartenza su 100m, es. 85 secondi (1'25")
    val ripartenzaFormatted: String,    // es. "a 1'25\""
    val pausaSecondi: Int,               // es. 15 secondi
    val pausaFormatted: String,         // es. "recupero 15\""
    val noteTecniche: String
)

data class TabellaRitmiAtleta(
    val atletaId: Long,
    val tempoRiferimento100mCentesimi: Int,
    val stileRiferimento: Stile,
    val vascaMetri: Int,
    val ritmi: Map<CodiceAllenamento, RitmoCodice>
)

data class TempoImportato(
    val stile: Stile?,
    val distanzaMetri: Int,
    val centesimi: Int,
    val formatted: String,
    val contesto: ContestoTempo,
    val rigaOriginale: String,
    val stileNonRiconosciuto: Boolean = stile == null,
    val note: String = ""
)

data class RiferimentoTempo(val tempo: Tempo, val datato: Boolean)

data class FormCheckConsiglio(
    val necessario: Boolean,
    val titoloTest: String,
    val motivazione: String,
    val istruzioniVasca: String
)

object CalcoloRitmiRipartenze {

    /** Miglior riferimento 100m recente (o assoluto), mantenendo la compatibilità con il generatore. */
    fun tempoRiferimento100(tempi: List<Tempo>, oggi: LocalDate = LocalDate.now()): Tempo? =
        tempoRiferimento100(tempi, stile = null, vascaMetri = null, oggi = oggi)?.tempo

    fun tempoRiferimento100(
        tempi: List<Tempo>,
        stile: Stile?,
        vascaMetri: Int?,
        oggi: LocalDate = LocalDate.now()
    ): RiferimentoTempo? {
        val validi = tempi.filter {
            it.distanzaMetri == 100 &&
                it.contesto != ContestoTempo.ALLENAMENTO &&
                (vascaMetri == null || it.vascaMetri == vascaMetri) &&
                !it.data.isAfter(oggi)
        }
        val candidati = if (stile != null) validi.filter { it.stile == stile }.ifEmpty { validi } else validi
        val recenti = candidati.filter { ChronoUnit.DAYS.between(it.data, oggi) in 0L..180L }
        val scelto = (recenti.ifEmpty { candidati }).minByOrNull { it.centesimi } ?: return null
        return RiferimentoTempo(
            tempo = scelto,
            datato = ChronoUnit.DAYS.between(scelto.data, oggi) > 180
        )
    }

    /** Miglior 400 dello stesso stile e vasca, entro 90 giorni dal 100 di riferimento. */
    fun tempoRiferimento400(tempi: List<Tempo>, riferimento100: Tempo): Tempo? =
        tempi.filter {
            it.distanzaMetri == 400 &&
                it.stile == riferimento100.stile &&
                it.vascaMetri == riferimento100.vascaMetri &&
                it.contesto != ContestoTempo.ALLENAMENTO &&
                abs(ChronoUnit.DAYS.between(it.data, riferimento100.data)) <= 90
        }.minByOrNull { it.centesimi }

    fun isTempoDuplicato(
        tempi: List<Tempo>,
        atletaId: Long,
        data: LocalDate,
        stile: Stile,
        distanzaMetri: Int,
        vascaMetri: Int,
        centesimi: Int
    ): Boolean = tempi.any {
        it.atletaId == atletaId &&
            it.data == data &&
            it.stile == stile &&
            it.distanzaMetri == distanzaMetri &&
            it.vascaMetri == vascaMetri &&
            it.centesimi == centesimi
    }

    /** Ripartenza per una ripetuta, sempre almeno 5 secondi dopo il tempo di nuoto. */
    fun ripartenzaSecondi(ritmo: RitmoCodice, distanzaMetri: Int): Int {
        require(distanzaMetri > 0) { "La distanza della ripetuta deve essere positiva" }
        val tempoNuoto = ritmo.passo100mCentesimi * distanzaMetri / 10_000.0
        val recuperoDesiderato = ritmo.pausaSecondi * distanzaMetri / 100.0
        return arrotondaRipartenza(tempoNuoto, recuperoDesiderato)
    }

    /**
     * Unico arrotondamento delle ripartenze: al multiplo di 5 successivo, con almeno 5"
     * effettivi di recupero anche quando il passo non corrisponde a secondi interi.
     */
    private fun arrotondaRipartenza(tempoNuotoSecondi: Double, recuperoDesideratoSecondi: Double): Int {
        val conRecupero = ceil((tempoNuotoSecondi + recuperoDesideratoSecondi) / 5.0) * 5
        val minimo = ceil((tempoNuotoSecondi + 5.0) / 5.0) * 5
        return maxOf(conRecupero, minimo).toInt()
    }

    private fun formattaRipartenza(secondiTotali: Int): String {
        val minuti = secondiTotali / 60
        val secondi = secondiTotali % 60
        return if (minuti > 0) String.format(Locale.ROOT, "a %d'%02d\"", minuti, secondi)
        else String.format(Locale.ROOT, "a %d\"", secondi)
    }

    /**
     * Ripartenza per una ripetizione di [distanzaMetri], calcolata sul passo del codice e
     * arrotondata con la stessa regola della tabella dei ritmi.
     */
    fun ripartenzaPer(ritmo: RitmoCodice, distanzaMetri: Int): String =
        formattaRipartenza(ripartenzaSecondi(ritmo, distanzaMetri))

    /**
     * Calcola i ritmi di allenamento, le ripartenze ed il recupero preciso per tutti i codici A1-D
     * partendo dal miglior tempo sui 100m di gara o test dell'atleta.
     */
    fun calcolaTabellaRitmi(
        atletaId: Long,
        tempo100mCentesimi: Int,
        stile: Stile = Stile.STILE_LIBERO,
        vascaMetri: Int = 25
    ): TabellaRitmiAtleta {
        require(vascaMetri == 25 || vascaMetri == 50) { "La vasca deve essere da 25 o 50 metri" }
        val base = tempo100mCentesimi.coerceAtLeast(4000) // minimo 40"
        val passoCss = CalcoloScienzaNuoto.stimaCssDaPassoGara(base)
        val ritmiMap = mutableMapOf<CodiceAllenamento, RitmoCodice>()

        CodiceAllenamento.entries.forEach { codice ->
            val zona = when (codice) {
                CodiceAllenamento.A1 -> Triple(1.20, 0.15, "Nuoto rilassato e coordinato, frequenza cardiaca contenuta.")
                CodiceAllenamento.A2 -> Triple(1.12, 0.12, "Passo fondo costante, controllo del numero di bracciate.")
                CodiceAllenamento.B1 -> Triple(1.05, 0.10, "Passo soglia: mantenere costante per tutta la serie.")
                CodiceAllenamento.B2 -> Triple(1.00, 0.20, "Passo VO2 Max: sforzo ad alta frequenza cardiaca.")
                CodiceAllenamento.C1 -> Triple(1.05, 0.75, "Passo lattacido controllato, con ampio recupero.")
                CodiceAllenamento.C2 -> Triple(1.02, 1.20, "Potenza lattacida al passo CSS, senza sovrastimare la velocità.")
                CodiceAllenamento.C3 -> Triple(1.0, 0.90, "Simulazione al passo gara personale.")
                CodiceAllenamento.D -> Triple(0.95, 0.75, "Velocità alattacida individuale sui primi 15m-25m.")
            }

            val riferimentoCentesimi = if (codice == CodiceAllenamento.C3 || codice == CodiceAllenamento.D) {
                base
            } else {
                passoCss
            }
            val passoCentesimi = (riferimentoCentesimi * zona.first).roundToInt().coerceAtLeast(2500)
            val tempoNuoto100 = passoCentesimi / 100.0
            val ripartenzaSecArrotondata = arrotondaRipartenza(
                tempoNuotoSecondi = tempoNuoto100,
                recuperoDesideratoSecondi = tempoNuoto100 * zona.second
            )
            val pausaSecArrotondata = ripartenzaSecArrotondata - ceil(tempoNuoto100).toInt()

            val strRipartenza = formattaRipartenza(ripartenzaSecArrotondata)

            ritmiMap[codice] = RitmoCodice(
                codice = codice,
                passo100mCentesimi = passoCentesimi,
                passo100mFormatted = formattaTempo(passoCentesimi),
                ripartenzaSecondi = ripartenzaSecArrotondata,
                ripartenzaFormatted = strRipartenza,
                pausaSecondi = pausaSecArrotondata,
                pausaFormatted = "recupero $pausaSecArrotondata\"",
                noteTecniche = zona.third
            )
        }

        return TabellaRitmiAtleta(
            atletaId = atletaId,
            tempoRiferimento100mCentesimi = base,
            stileRiferimento = stile,
            vascaMetri = vascaMetri,
            ritmi = ritmiMap
        )
    }

    /**
     * Parser intelligente per importare i tempi da testo (OCR screenshot, file o incolla).
     */
    fun parseImportaTempi(testo: String, cognome: String, nome: String? = null): List<TempoImportato> {
        val cognomeNormalizzato = normalizzaTesto(cognome).trim()
        if (cognomeNormalizzato.isBlank()) return emptyList()
        val risultati = mutableListOf<TempoImportato>()
        val cognomePattern = Regex("(?<![\\p{L}\\p{N}])${Regex.escape(cognomeNormalizzato)}(?![\\p{L}\\p{N}])")
        val nomeNormalizzato = nome?.let(::normalizzaTesto)?.trim().orEmpty()
        val nomePattern = nomeNormalizzato.takeIf { it.isNotBlank() }
            ?.let { Regex("(?<![\\p{L}\\p{N}])${Regex.escape(it)}(?![\\p{L}\\p{N}])") }
        val distanzaPattern = Regex(
            """(?<![\p{L}\p{N}])(1500|800|400|200|100|50)(?=\s*(?:m|metri)\b|[^\p{L}\p{N}]|$)"""
        )
        val stilePattern = Regex(
            """(?<![\p{L}\p{N}])(stile\s+libero|freestyle|libero|sl|dorso|backstroke|back|do|rana|breaststroke|breast|br|farfalla|delfino|butterfly|fly|fa|misti|individuale|medley|im|mi)(?![\p{L}\p{N}])"""
        )
        val datePattern = Regex("""\b\d{1,2}[./]\d{1,2}[./]\d{2,4}\b""")
        val clockPattern = Regex("""\b(?:[01]?\d|2[0-3]):[0-5]\d(?::[0-5]\d)?\b(?![.,]\d)""")
        val tempoPattern = Regex("""(?<![\p{L}\p{N}])(?:\d{1,2}:\d{1,2}(?:[.,]\d{1,2})?|\d{1,3}[.,]\d{1,2})(?![\p{L}\p{N}])""")

        var distanzaCorrente: Int? = null
        var stileCorrente: Stile? = null
        var stileIntestazioneNonRiconosciuto = false
        var contestoCorrente = ContestoTempo.GARA

        for (riga in testo.lines()) {
            if (riga.isBlank()) continue
            val normalizzata = normalizzaTesto(riga)
            val matchDistanza = distanzaPattern.find(normalizzata)
            val distanzaEsplicita = matchDistanza?.let { match ->
                val seguitoDaUnita = Regex("""^\s*(?:m|metri)\b""")
                    .containsMatchIn(normalizzata.substring(match.range.last + 1))
                match.value.toInt().takeIf { seguitoDaUnita }
            }
            val stileMatch = stilePattern.find(normalizzata)
            val intestazioneStileSconosciuto =
                Regex("""\bstile\b""").containsMatchIn(normalizzata) && stileMatch == null
            val stileIntestazione = stileMatch?.let { match ->
                when (match.value) {
                    "stile libero", "freestyle", "libero", "sl" -> Stile.STILE_LIBERO
                    "dorso", "backstroke", "back", "do" -> Stile.DORSO
                    "rana", "breaststroke", "breast", "br" -> Stile.RANA
                    "farfalla", "delfino", "butterfly", "fly", "fa" -> Stile.FARFALLA
                    "misti", "individuale", "medley", "im", "mi" -> Stile.MISTI
                    else -> null
                }
            }
            val haTempo = estraiTempo(normalizzata, datePattern, clockPattern, tempoPattern) != null
            val intestazioneConDistanza = distanzaEsplicita != null ||
                (matchDistanza != null && stileMatch != null && !haTempo)

            if (intestazioneConDistanza) {
                distanzaCorrente = (distanzaEsplicita ?: matchDistanza?.value?.toInt())
                    ?.takeIf { it in setOf(50, 100, 200, 400, 800, 1500) }
                if (stileMatch != null || intestazioneStileSconosciuto) {
                    stileCorrente = stileIntestazione
                    stileIntestazioneNonRiconosciuto = stileIntestazione == null
                }
            }

            when {
                Regex("""\btest\b""").containsMatchIn(normalizzata) -> contestoCorrente = ContestoTempo.TEST
                Regex("""\ballenamento\b""").containsMatchIn(normalizzata) -> contestoCorrente = ContestoTempo.ALLENAMENTO
                Regex("""\bgara\b""").containsMatchIn(normalizzata) -> contestoCorrente = ContestoTempo.GARA
            }

            val cognomeMatch = cognomePattern.find(normalizzata) ?: continue
            if (nomePattern != null && !nomePattern.containsMatchIn(normalizzata)) {
                val primaDelCognome = normalizzata.substring(0, cognomeMatch.range.first)
                    .trim().substringAfterLast(' ').trimEnd('.')
                val dopoIlCognome = normalizzata.substring(cognomeMatch.range.last + 1)
                    .trim().substringBefore(' ').trimEnd('.')
                val nomeCompletoEsplicito = listOf(primaDelCognome, dopoIlCognome)
                    .firstOrNull { it.length > 1 && it.all(Char::isLetter) }
                if (nomeCompletoEsplicito != null) continue
            }
            val distanza = distanzaCorrente ?: continue
            val centesimi = estraiTempo(normalizzata, datePattern, clockPattern, tempoPattern) ?: continue
            val contestoRiga = when {
                Regex("""\btest\b""").containsMatchIn(normalizzata) -> ContestoTempo.TEST
                Regex("""\ballenamento\b""").containsMatchIn(normalizzata) -> ContestoTempo.ALLENAMENTO
                else -> contestoCorrente
            }
            risultati += TempoImportato(
                stile = stileCorrente,
                distanzaMetri = distanza,
                centesimi = centesimi,
                formatted = formattaTempo(centesimi),
                contesto = contestoRiga,
                rigaOriginale = riga,
                stileNonRiconosciuto = stileIntestazioneNonRiconosciuto || stileCorrente == null,
                note = "Importato da testo/OCR"
            )
        }

        return risultati
    }

    private fun estraiTempo(testo: String, datePattern: Regex, clockPattern: Regex, tempoPattern: Regex): Int? {
        val senzaDate = datePattern.replace(testo) { " ".repeat(it.value.length) }
        val senzaOrari = clockPattern.replace(senzaDate) { " ".repeat(it.value.length) }
        return tempoPattern.findAll(senzaOrari)
            .mapNotNull { parseTempo(it.value) }
            .filter { it >= 1500 }
            .lastOrNull()
    }

    private fun normalizzaTesto(testo: String): String =
        Normalizer.normalize(testo.lowercase(Locale.ROOT), Normalizer.Form.NFD)
            .replace(Regex("\\p{M}+"), "")

    /**
     * Valuta se l'atleta necessita di un Form Check (Test in Vasca) per aggiornare i ritmi.
     */
    fun valutaNecessitaFormCheck(
        atleta: Atleta,
        tempi: List<Tempo>,
        log: List<LogSeduta>,
        mesocicloCorrente: Mesociclo?,
        oggi: LocalDate
    ): FormCheckConsiglio {
        val tempiAtleta = tempi.filter { it.atletaId == atleta.id }
        val ultimoTempoData = tempiAtleta.maxOfOrNull { it.data }

        val giorniDallUltimoTempo = if (ultimoTempoData != null) ChronoUnit.DAYS.between(ultimoTempoData, oggi) else 999L

        return when {
            // Caso 1: Nessun tempo registrato negli ultimi 60 giorni
            giorniDallUltimoTempo > 60 -> FormCheckConsiglio(
                necessario = true,
                titoloTest = "⚡ Form Check Necessario: Test T30 / 100m Passo",
                motivazione = "Non ci sono tempi di gara o test registrati da oltre 60 giorni per ${atleta.nome}. È necessario un test per calibrare le ripartenze.",
                istruzioniVasca = "Esegui un Test T30 (30 minuti continui a passo costante A2/B1) oppure 3 x 100m B1 con ripartenza a 2' per determinare la velocità di soglia."
            )

            // Caso 2: Cambio di fase del Mesociclo verso la Preparazione Specifica o Pre-Gara
            mesocicloCorrente?.fase == FaseMesociclo.PREPARAZIONE_SPECIFICA && giorniDallUltimoTempo > 30 -> FormCheckConsiglio(
                necessario = true,
                titoloTest = "⚡ Check della Forma: Test 100m Soglia B1",
                motivazione = "Inizio della fase di Preparazione Specifica: occorre verificare la velocità di soglia anaerobica B1 prima delle serie VO2 Max B2.",
                istruzioniVasca = "Esegui 4 x 100m B1 alla massima velocità sostenibile regolare. Registra il tempo medio dei 100m."
            )

            // Caso 3: Inizio della fase Pre-Gara
            mesocicloCorrente?.fase == FaseMesociclo.PRE_GARA && giorniDallUltimoTempo > 21 -> FormCheckConsiglio(
                necessario = true,
                titoloTest = "⚡ Check della Forma: Test Ritmo Gara C3 (50m / 100m)",
                motivazione = "Fase Pre-Gara: verifica il passo gara sui 50m o 100m per perfezionare le ripartenze della fase di tapering.",
                istruzioniVasca = "Esegui 2 x 50m C3 al passo gara obiettivo con 3 minuti di recupero passivo."
            )

            else -> FormCheckConsiglio(
                necessario = false,
                titoloTest = "Forma e Ritmi Aggiornati",
                motivazione = "I tempi dell'atleta sono recenti e calibrati correttamente.",
                istruzioniVasca = "Prosegui la programmazione standard con la tabella dei ritmi corrente."
            )
        }
    }
}