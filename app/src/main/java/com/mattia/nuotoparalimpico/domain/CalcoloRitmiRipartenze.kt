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
import java.util.Locale
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
    val stile: Stile,
    val distanzaMetri: Int,
    val centesimi: Int,
    val formatted: String,
    val contesto: ContestoTempo,
    val note: String = ""
)

data class FormCheckConsiglio(
    val necessario: Boolean,
    val titoloTest: String,
    val motivazione: String,
    val istruzioniVasca: String
)

object CalcoloRitmiRipartenze {

    /**
     * Tempo di riferimento sui 100m per calibrare i ritmi: il MIGLIOR tempo (gara o test, mai
     * allenamento) degli ultimi 180 giorni, preferendo lo stile libero. Se non ce ne sono di
     * recenti si usa il migliore in assoluto.
     */
    fun tempoRiferimento100(tempi: List<Tempo>, oggi: LocalDate = LocalDate.now()): Tempo? {
        val validi = tempi.filter { it.distanzaMetri == 100 && it.contesto != ContestoTempo.ALLENAMENTO }
        val liberi = validi.filter { it.stile == Stile.STILE_LIBERO }.ifEmpty { validi }
        val recenti = liberi.filter { ChronoUnit.DAYS.between(it.data, oggi) <= 180 }
        return recenti.ifEmpty { liberi }.minByOrNull { it.centesimi }
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
    fun parseImportaTempi(testo: String): List<TempoImportato> {
        val risultati = mutableListOf<TempoImportato>()
        val righe = testo.lines()

        for (riga in righe) {
            val r = riga.trim().lowercase()
            if (r.isBlank()) continue

            val stile = when {
                r.contains("stile") || r.contains("sl") || r.contains("freestyle") -> Stile.STILE_LIBERO
                r.contains("dorso") || r.contains("do") || r.contains("back") -> Stile.DORSO
                r.contains("rana") || r.contains("br") || r.contains("breast") -> Stile.RANA
                r.contains("farfalla") || r.contains("fa") || r.contains("delfino") || r.contains("fly") -> Stile.FARFALLA
                r.contains("misti") || r.contains("mi") || r.contains("im") -> Stile.MISTI
                else -> Stile.STILE_LIBERO
            }

            val distanza = when {
                r.contains("50") -> 50
                r.contains("100") -> 100
                r.contains("200") -> 200
                r.contains("400") -> 400
                r.contains("800") -> 800
                r.contains("1500") -> 1500
                else -> 100
            }

            val contesto = if (r.contains("test") || r.contains("allenamento")) ContestoTempo.TEST else ContestoTempo.GARA

            // Cerca sequenza tempo mm:ss.cc o ss.cc
            val regex = Regex("""(?:\b)(\d{1,2}:)?(\d{1,2})[.,](\d{1,2})(?:\b)""")
            val match = regex.find(riga)
            if (match != null) {
                val centesimi = parseTempo(match.value)
                if (centesimi != null && centesimi > 0) {
                    risultati += TempoImportato(
                        stile = stile,
                        distanzaMetri = distanza,
                        centesimi = centesimi,
                        formatted = formattaTempo(centesimi),
                        contesto = contesto,
                        note = "Importato da testo/OCR"
                    )
                }
            }
        }

        return risultati
    }

    /**
     * Valuta se l'atleta necessita di un Form Check (Test in Vasca) per aggiornare i ritmi.
     */
    fun valutaNecessitaFormCheck(
        atleta: Atleta,
        tempi: List<Tempo>,
        log: List<LogSeduta>,
        mesocicloCorrente: Mesociclo?
    ): FormCheckConsiglio {
        val oggi = LocalDate.now()
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