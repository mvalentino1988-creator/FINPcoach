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

data class RitmoCodice(
    val codice: CodiceAllenamento,
    val passo100mCentesimi: Int,
    val passo100mFormatted: String,
    val ripartenzaSecondi: Int,        // riferita a serie da 100m
    val ripartenzaFormatted: String,   // es. a 1'25"
    val pausaSecondi: Int,             // pausa nominale per 100m
    val pausaFormatted: String,
    val noteTecniche: String,
    val zona: ZonaAllenamento
) {
    /** Ripartenza corretta per la distanza della serie (50, 100, 200...). */
    fun ripartenzaPer(distanzaMetri: Int): String =
        formattaRipartenza(zona.ripartenzaSecondi(distanzaMetri))

    fun passoPer(distanzaMetri: Int): String =
        formattaTempo(zona.passoPerDistanzaCentesimi(distanzaMetri))
}

data class TabellaRitmiAtleta(
    val atletaId: Long,
    val tempoRiferimento100mCentesimi: Int,
    val stileRiferimento: Stile,
    val vascaMetri: Int,
    val ritmi: Map<CodiceAllenamento, RitmoCodice>,
    val cssPasso100mCentesimi: Int = 0,
    val cssStimata: Boolean = true
)

data class TempoImportato(
    val stile: Stile,
    val distanzaMetri: Int,
    val centesimi: Int,
    val formatted: String,
    val contesto: ContestoTempo,
    val note: String = "",
    val data: LocalDate? = null
)

data class FormCheckConsiglio(
    val necessario: Boolean,
    val titoloTest: String,
    val motivazione: String,
    val istruzioniVasca: String
)

fun formattaRipartenza(secondi: Int): String {
    val m = secondi / 60
    val s = secondi % 60
    return if (m > 0) String.format(Locale.ROOT, "a %d'%02d\"", m, s) else String.format(Locale.ROOT, "a %d\"", s)
}

object CalcoloRitmiRipartenze {

    private val NOTE = mapOf(
        CodiceAllenamento.A1 to "Nuoto rilassato e coordinato, frequenza cardiaca contenuta.",
        CodiceAllenamento.A2 to "Passo fondo costante, controllo del numero di bracciate.",
        CodiceAllenamento.B1 to "Passo soglia (CSS): mantenere costante per tutta la serie.",
        CodiceAllenamento.B2 to "Passo VO2 Max: sforzo ad alta frequenza cardiaca.",
        CodiceAllenamento.C1 to "Tolleranza all'acidosi su 100-200m con ampio recupero.",
        CodiceAllenamento.C2 to "Sforzo massimale con recupero ampio: non attendersi di battere il PB.",
        CodiceAllenamento.C3 to "Simulazione del passo gara con precisione cronometrica.",
        CodiceAllenamento.D to "Velocità pura 15-25m: il passo per 100m è solo indicativo, non cronometrare sul 100."
    )

    /** Miglior 100m recente (gara/test), stesso stile e vasca se indicati. Mai tempi di allenamento. */
    fun selezionaTempoRiferimento100(
        tempi: List<Tempo>,
        stile: Stile? = null,
        vascaMetri: Int? = null,
        oggi: LocalDate = LocalDate.now(),
        finestraGiorni: Long = 120
    ): Tempo? = tempi.filter {
        it.distanzaMetri == 100 &&
            it.contesto != ContestoTempo.ALLENAMENTO &&
            (stile == null || it.stile == stile) &&
            (vascaMetri == null || it.vascaMetri == vascaMetri) &&
            ChronoUnit.DAYS.between(it.data, oggi) in 0L..finestraGiorni
    }.minByOrNull { it.centesimi }

    fun calcolaTabellaRitmi(
        atletaId: Long,
        tempo100mCentesimi: Int,
        stile: Stile = Stile.STILE_LIBERO,
        vascaMetri: Int = 25,
        cssPasso100mCentesimi: Int? = null,
        config: ConfigurazioneZone = CalcoloScienzaNuoto.ZONE_DEFAULT
    ): TabellaRitmiAtleta {
        val base = tempo100mCentesimi.coerceAtLeast(4000)
        val cssStimata = cssPasso100mCentesimi == null
        val css = cssPasso100mCentesimi ?: CalcoloScienzaNuoto.stimaCssDaPassoGara(base)
        val zone = CalcoloScienzaNuoto.calcolaZone(css, base, cssStimata, config)

        val ritmi = CodiceAllenamento.entries.associateWith { codice ->
            val z = zone.getValue(codice)
            val rip100 = z.ripartenzaSecondi(100)
            RitmoCodice(
                codice = codice,
                passo100mCentesimi = z.passo100mCentesimi,
                passo100mFormatted = formattaTempo(z.passo100mCentesimi),
                ripartenzaSecondi = rip100,
                ripartenzaFormatted = formattaRipartenza(rip100),
                pausaSecondi = z.pausaPer100Secondi,
                pausaFormatted = "recupero ${z.pausaPer100Secondi}\"",
                noteTecniche = NOTE.getValue(codice) + if (cssStimata && codice.ordinal <= CodiceAllenamento.B2.ordinal) " (CSS stimata: esegui un test 400/200)" else "",
                zona = z
            )
        }
        return TabellaRitmiAtleta(atletaId, base, stile, vascaMetri, ritmi, css, cssStimata)
    }

    // ---------------- Parser import ----------------

    private val REGEX_DATA = Regex("""\b(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})\b""")
    private val REGEX_TEMPO = Regex("""\b(?:\d{1,2}:\d{2}[.,]\d{1,2}|\d{2,3}[.,]\d{2})\b""")
    private val REGEX_DISTANZA = Regex("""\b(1500|800|400|200|100|50)\b""")
    private val R_MISTI = Regex("""\b(misti|medley|im|mi)\b""")
    private val R_FARFALLA = Regex("""\b(farfalla|delfino|butterfly|fly|fa|df)\b""")
    private val R_DORSO = Regex("""\b(dorso|backstroke|back|do)\b""")
    private val R_RANA = Regex("""\b(rana|breaststroke|breast|ra|br)\b""")
    private val R_LIBERO = Regex("""\b(stile|libero|freestyle|free|sl)\b""")

    private fun riconosciStile(r: String): Stile? = when {
        R_MISTI.containsMatchIn(r) -> Stile.MISTI
        R_FARFALLA.containsMatchIn(r) -> Stile.FARFALLA
        R_DORSO.containsMatchIn(r) -> Stile.DORSO
        R_RANA.containsMatchIn(r) -> Stile.RANA
        R_LIBERO.containsMatchIn(r) -> Stile.STILE_LIBERO
        else -> null
    }

    private fun leggiData(m: MatchResult): LocalDate? = try {
        val anno = m.groupValues[3].toInt().let { if (it < 100) it + 2000 else it }
        LocalDate.of(anno, m.groupValues[2].toInt(), m.groupValues[1].toInt())
    } catch (e: Exception) {
        null
    }

    /** Importa tempi da testo/OCR. Ciò che viene assunto (stile, distanza) è dichiarato nelle note. */
    fun parseImportaTempi(testo: String): List<TempoImportato> {
        val risultati = mutableListOf<TempoImportato>()
        for (riga in testo.lines()) {
            var r = riga.trim().lowercase()
            if (r.isBlank()) continue

            val dataRiga = REGEX_DATA.find(r)?.let { leggiData(it) }
            r = r.replace(REGEX_DATA, " ")

            val mTempo = REGEX_TEMPO.find(r) ?: continue
            val centesimi = parseTempo(mTempo.value) ?: continue
            if (centesimi < 1500) continue // < 15" non plausibile: probabile data/numero d'ordine

            val resto = r.removeRange(mTempo.range)
            val distanza = REGEX_DISTANZA.find(resto)?.groupValues?.get(1)?.toInt()
            val stile = riconosciStile(resto)
            val contesto = when {
                Regex("""\b(test)\b""").containsMatchIn(resto) -> ContestoTempo.TEST
                Regex("""\b(allenamento|training)\b""").containsMatchIn(resto) -> ContestoTempo.ALLENAMENTO
                else -> ContestoTempo.GARA
            }
            val note = buildString {
                append("Importato da testo/OCR")
                if (distanza == null) append(" · distanza assunta 100m")
                if (stile == null) append(" · stile assunto: stile libero")
                if (dataRiga == null) append(" · data non rilevata")
            }
            risultati += TempoImportato(
                stile = stile ?: Stile.STILE_LIBERO,
                distanzaMetri = distanza ?: 100,
                centesimi = centesimi,
                formatted = formattaTempo(centesimi),
                contesto = contesto,
                note = note,
                data = dataRiga
            )
        }
        return risultati
    }

    // ---------------- Form check ----------------

    fun valutaNecessitaFormCheck(
        atleta: Atleta,
        tempi: List<Tempo>,
        log: List<LogSeduta>,
        mesocicloCorrente: Mesociclo?
    ): FormCheckConsiglio {
        val oggi = LocalDate.now()
        val ultimo = tempi.filter { it.atletaId == atleta.id && it.contesto != ContestoTempo.ALLENAMENTO }
            .maxOfOrNull { it.data }
        val giorni = if (ultimo != null) ChronoUnit.DAYS.between(ultimo, oggi) else 999L

        return when {
            giorni > 60 -> FormCheckConsiglio(
                true, "⚡ Form Check necessario: test 400/200",
                "Nessun tempo di gara o test negli ultimi 60 giorni per ${atleta.nome}: le ripartenze vanno ricalibrate.",
                "Esegui un 400m e un 200m (stesso stile, stessa vasca, a pochi giorni di distanza) per calcolare la CSS."
            )
            mesocicloCorrente?.fase == FaseMesociclo.PREPARAZIONE_SPECIFICA && giorni > 30 -> FormCheckConsiglio(
                true, "⚡ Check della forma: soglia B1",
                "Fase di preparazione specifica: verifica la soglia prima delle serie VO2 Max (B2).",
                "Ripeti il test 400/200 o 4 x 100m B1 a passo regolare e registra il tempo medio."
            )
            mesocicloCorrente?.fase == FaseMesociclo.PRE_GARA && giorni > 21 -> FormCheckConsiglio(
                true, "⚡ Check della forma: ritmo gara C3",
                "Fase pre-gara: verifica il passo gara per rifinire le ripartenze del tapering.",
                "Esegui 2 x 50m C3 al passo gara obiettivo con 3 minuti di recupero passivo."
            )
            else -> FormCheckConsiglio(
                false, "Forma e ritmi aggiornati",
                "I tempi dell'atleta sono recenti e calibrati correttamente.",
                "Prosegui con la tabella dei ritmi corrente."
            )
        }
    }
}