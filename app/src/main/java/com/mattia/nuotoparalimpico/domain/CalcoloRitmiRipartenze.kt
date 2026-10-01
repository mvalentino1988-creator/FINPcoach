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

data class RitmoCodice(
    val codice: CodiceAllenamento,
    val passo100mCentesimi: Int,        // Tempo target a 100m
    val passo100mFormatted: String,     // es. "1:08.35"
    val ripartenzaSecondi: Int,         // es. 85 secondi (1'25")
    val ripartenzaFormatted: String,    // es. "a 1'25\""
    val pausaSecondi: Int,              // es. 15 secondi
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
     * Calcola i ritmi di allenamento, le ripartenze ed il recupero per tutti i codici A1-D
     * partendo dal tempo sui 100m dell'atleta.
     */
    fun calcolaTabellaRitmi(
        atletaId: Long,
        tempo100mCentesimi: Int,
        stile: Stile = Stile.STILE_LIBERO,
        vascaMetri: Int = 25
    ): TabellaRitmiAtleta {
        val base = tempo100mCentesimi.coerceAtLeast(4000) // minimo 40"
        val ritmiMap = mutableMapOf<CodiceAllenamento, RitmoCodice>()

        CodiceAllenamento.entries.forEach { codice ->
            val (deltaPasso100Sec, deltaRipartenzaSec, pausaSec, nota) = when (codice) {
                CodiceAllenamento.A1 -> Quadruple(16, 15, 15, "Nuoto rilassato e coordinato, frequenza cardiaca contenuta.")
                CodiceAllenamento.A2 -> Quadruple(12, 10, 12, "Passo fondo costante, controllo del numero di bracciate.")
                CodiceAllenamento.B1 -> Quadruple(6, 8, 10, "Passo Soglia Anaerobica: mantenere costante per tutta la serie.")
                CodiceAllenamento.B2 -> Quadruple(3, 20, 20, "Passo VO2 Max: sforzo ad alta frequenza cardiaca.")
                CodiceAllenamento.C1 -> Quadruple(0, 75, 75, "Passo Gara 100m: tolleranza all'acidosi con ampio recupero.")
                CodiceAllenamento.C2 -> Quadruple(-2, 120, 120, "Sforzo Massimale: picco di potenza lattacida.")
                CodiceAllenamento.C3 -> Quadruple(0, 90, 90, "Simulazione esatta passo gara prioritaria.")
                CodiceAllenamento.D  -> Quadruple(-5, 60, 60, "Velocità pura alattacida sui primi 15m-25m.")
            }

            val passoCentesimi = (base + deltaPasso100Sec * 100).coerceAtLeast(2500)
            val ripartenzaSec = ((passoCentesimi / 100) + deltaRipartenzaSec)
            // Arrotonda ripartenza e pausa a multipli di 5 secondi
            val ripartenzaSecArrotondata = ((ripartenzaSec + 2) / 5) * 5
            val pausaSecArrotondata = ((pausaSec + 2) / 5) * 5

            val minRip = ripartenzaSecArrotondata / 60
            val secRip = ripartenzaSecArrotondata % 60
            val strRipartenza = if (minRip > 0) String.format("a %d'%02d\"", minRip, secRip) else String.format("a %d\"", secRip)

            ritmiMap[codice] = RitmoCodice(
                codice = codice,
                passo100mCentesimi = passoCentesimi,
                passo100mFormatted = formattaTempo(passoCentesimi),
                ripartenzaSecondi = ripartenzaSecArrotondata,
                ripartenzaFormatted = strRipartenza,
                pausaSecondi = pausaSecArrotondata,
                pausaFormatted = "recupero $pausaSecArrotondata\"",
                noteTecniche = nota
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

    /** Importa tempi da testo/OCR. Per riga: sceglie il tempo più alto (finale, non i parziali), distanza e stile per parole intere. */
    fun parseImportaTempi(testo: String): List<TempoImportato> {
        val regexTempo = Regex("""(?<![\d:.,])(?:(\d{1,2}):)?(\d{1,2})[.,](\d{1,2})(?!\d)(?![.,]\d)""")
        val regexDistanza = Regex("""(?<!\d)(1500|800|400|200|100|50)(?!\d)""")
        val regexParole = Regex("""[a-zà-ÿ]+""")
        val risultati = mutableListOf<TempoImportato>()

        for (riga in testo.lines()) {
            val centesimi = regexTempo.findAll(riga).mapNotNull { parseTempo(it.value) }.toList().maxOrNull() ?: continue
            if (centesimi < 1500) continue

            val resto = regexTempo.replace(riga, " ").lowercase()
            val distanza = regexDistanza.find(resto)?.value?.toInt() ?: 100
            val parole = regexParole.findAll(resto).map { it.value }.toSet()

            val stile = when {
                parole.any { it in setOf("misti", "im", "medley", "sm") } -> Stile.MISTI
                parole.any { it in setOf("rana", "br", "breast", "breaststroke", "ra") } -> Stile.RANA
                parole.any { it in setOf("farfalla", "fa", "fly", "delfino", "butterfly", "df") } -> Stile.FARFALLA
                parole.any { it in setOf("dorso", "do", "back", "backstroke") } -> Stile.DORSO
                else -> Stile.STILE_LIBERO
            }
            val contesto = when {
                parole.any { it.startsWith("allenam") } -> ContestoTempo.ALLENAMENTO
                "test" in parole -> ContestoTempo.TEST
                else -> ContestoTempo.GARA
            }

            risultati += TempoImportato(
                stile = stile,
                distanzaMetri = distanza,
                centesimi = centesimi,
                formatted = formattaTempo(centesimi),
                contesto = contesto,
                note = "Importato da testo/OCR"
            )
        }
        return risultati
    }

    /** Valuta se l'atleta necessita di un Form Check (test in vasca) per aggiornare i ritmi. */
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
            giorniDallUltimoTempo > 60 -> FormCheckConsiglio(
                necessario = true,
                titoloTest = "⚡ Form Check Necessario: Test T30 / 100m Passo",
                motivazione = "Non ci sono tempi di gara o test registrati da oltre 60 giorni per ${atleta.nome}. È necessario un test per calibrare le ripartenze.",
                istruzioniVasca = "Esegui un Test T30 (30 minuti continui a passo costante A2/B1) oppure 3 x 100m B1 con ripartenza a 2' per determinare la velocità di soglia."
            )

            mesocicloCorrente?.fase == FaseMesociclo.PREPARAZIONE_SPECIFICA && giorniDallUltimoTempo > 30 -> FormCheckConsiglio(
                necessario = true,
                titoloTest = "⚡ Check della Forma: Test 100m Soglia B1",
                motivazione = "Inizio della fase di Preparazione Specifica: occorre verificare la velocità di soglia anaerobica B1 prima delle serie VO2 Max B2.",
                istruzioniVasca = "Esegui 4 x 100m B1 alla massima velocità sostenibile regolare. Registra il tempo medio dei 100m."
            )

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

private data class Quadruple<A, B, C, D>(val first: A, val second: B, val third: C, val fourth: D)