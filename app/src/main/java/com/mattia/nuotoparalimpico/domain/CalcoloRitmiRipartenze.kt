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
    val passo100mCentesimi: Int,        // Passo su 100m
    val passo100mFormatted: String,     // es. "1:08.35"
    val ripartenzaSecondi: Int,         // ripartenza su base 100m, multiplo di 5"
    val ripartenzaFormatted: String,    // es. "a 1'25\""
    val pausaSecondi: Int,              // recupero nominale su base 100m
    val pausaFormatted: String,         // es. "recupero 15\""
    val noteTecniche: String
)

/** Ripartenza calcolata per la distanza REALE della ripetizione (es. 50m, 200m). */
data class RipartenzaDistanza(
    val distanzaMetri: Int,
    val passoCentesimi: Int,
    val passoFormatted: String,
    val ripartenzaSecondi: Int,
    val ripartenzaFormatted: String,
    val pausaEffettivaSecondi: Int
)

data class TabellaRitmiAtleta(
    val atletaId: Long,
    val tempoRiferimento100mCentesimi: Int,
    val stileRiferimento: Stile,
    val vascaMetri: Int,
    val ritmi: Map<CodiceAllenamento, RitmoCodice>,
    val origine: String = "100m"
)

data class RiferimentoRitmi(
    val tempo: Tempo,
    /** Tempo 100m riportato alla vasca da 25m. */
    val centesimi25: Int,
    val cssPasso100Centesimi: Int?,
    val tempo400UsatoPerCss: Tempo?,
    val note: List<String>
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

    /** Oltre questa età (giorni) un tempo non è più considerato rappresentativo. */
    const val GIORNI_VALIDITA = 120

    /** Stima: i tempi in vasca da 50m sono circa 1,5% più lenti che in 25m (meno virate). */
    private const val FATTORE_50_A_25 = 0.985

    private class Param(val delta: Double, val pausa100: Int, val nota: String)

    // delta = scarto percentuale rispetto al miglior 100m recente (scala con il livello dell'atleta)
    private val PARAM = mapOf(
        CodiceAllenamento.A1 to Param(0.23, 15, "Nuoto rilassato e coordinato, frequenza cardiaca contenuta."),
        CodiceAllenamento.A2 to Param(0.17, 10, "Passo fondo costante, controllo del numero di bracciate."),
        CodiceAllenamento.B1 to Param(0.09, 10, "Passo Soglia Anaerobica: mantenere costante per tutta la serie."),
        CodiceAllenamento.B2 to Param(0.045, 20, "Passo VO2 Max: sforzo ad alta frequenza cardiaca."),
        CodiceAllenamento.C1 to Param(0.0, 75, "Passo Gara 100m: tolleranza all'acidosi con ampio recupero."),
        CodiceAllenamento.C2 to Param(-0.03, 120, "Sforzo Massimale: picco di potenza lattacida."),
        CodiceAllenamento.C3 to Param(0.0, 90, "Simulazione esatta passo gara prioritaria."),
        CodiceAllenamento.D to Param(-0.07, 60, "Velocità pura alattacida sui primi 15m-25m.")
    )

    private fun arrotonda5(x: Int): Int = ((x + 2) / 5) * 5

    private fun su5(x: Double): Int = (ceil(x / 5.0) * 5).toInt()

    /** Il passo non cresce in modo perfettamente lineare con la distanza (stima prudenziale). */
    private fun fattoreDistanza(d: Int): Double = when {
        d <= 25 -> 0.96
        d <= 50 -> 0.98
        d <= 100 -> 1.0
        d <= 200 -> 1.015
        d <= 400 -> 1.03
        else -> 1.045
    }

    fun formattaRipartenza(sec: Int): String {
        val m = sec / 60
        val s = sec % 60
        return if (m > 0) String.format(Locale.ROOT, "a %d'%02d\"", m, s) else String.format(Locale.ROOT, "a %d\"", s)
    }

    /**
     * Tabella ritmi su base 100m. Se è disponibile la velocità critica (CSS) A1, A2, B1 e B2
     * si ancorano a quella; le zone di gara (C, D) restano ancorate al miglior 100m.
     */
    fun calcolaTabellaRitmi(
        atletaId: Long,
        tempo100mCentesimi: Int,
        stile: Stile = Stile.STILE_LIBERO,
        vascaMetri: Int = 25,
        cssPasso100Centesimi: Int? = null
    ): TabellaRitmiAtleta {
        val base = tempo100mCentesimi.coerceAtLeast(4000)
        val ritmiMap = mutableMapOf<CodiceAllenamento, RitmoCodice>()

        CodiceAllenamento.entries.forEach { codice ->
            val p = PARAM.getValue(codice)
            val passoD: Double = when {
                cssPasso100Centesimi != null && codice == CodiceAllenamento.B1 -> cssPasso100Centesimi.toDouble()
                cssPasso100Centesimi != null && codice == CodiceAllenamento.A2 -> cssPasso100Centesimi * 1.06
                cssPasso100Centesimi != null && codice == CodiceAllenamento.A1 -> cssPasso100Centesimi * 1.14
                cssPasso100Centesimi != null && codice == CodiceAllenamento.B2 -> cssPasso100Centesimi * 0.97
                else -> base * (1.0 + p.delta)
            }
            val passo = passoD.roundToInt().coerceAtLeast(2500)
            val pausa = arrotonda5(p.pausa100)
            // la D è un'attivazione: il tratto non di velocità si nuota a passo A1
            val passoRipartenza = if (codice == CodiceAllenamento.D) {
                ritmiMap[CodiceAllenamento.A1]?.passo100mCentesimi ?: passo
            } else passo
            val ripartenza = su5(passoRipartenza / 100.0 + pausa)

            ritmiMap[codice] = RitmoCodice(
                codice = codice,
                passo100mCentesimi = passo,
                passo100mFormatted = formattaTempo(passo),
                ripartenzaSecondi = ripartenza,
                ripartenzaFormatted = formattaRipartenza(ripartenza),
                pausaSecondi = pausa,
                pausaFormatted = "recupero $pausa\"",
                noteTecniche = p.nota
            )
        }

        return TabellaRitmiAtleta(
            atletaId = atletaId,
            tempoRiferimento100mCentesimi = base,
            stileRiferimento = stile,
            vascaMetri = vascaMetri,
            ritmi = ritmiMap,
            origine = if (cssPasso100Centesimi != null) "100m + CSS" else "100m"
        )
    }

    /**
     * Passo e ripartenza per una ripetizione di [distanza] metri (50, 100, 200...).
     * Il recupero delle zone aerobiche scala con la distanza; quello delle zone lattacide
     * e di velocità è fisso, perché è l'obiettivo della serie.
     */
    fun ripartenzaPer(tabella: TabellaRitmiAtleta, codice: CodiceAllenamento, distanza: Int): RipartenzaDistanza? {
        val r = tabella.ritmi[codice] ?: return null
        val passoRif = if (codice == CodiceAllenamento.D) {
            tabella.ritmi[CodiceAllenamento.A1]?.passo100mCentesimi ?: r.passo100mCentesimi
        } else r.passo100mCentesimi

        val passo = (passoRif * distanza / 100.0 * fattoreDistanza(distanza)).roundToInt()
        val pausa = when (codice) {
            CodiceAllenamento.A1, CodiceAllenamento.A2, CodiceAllenamento.B1, CodiceAllenamento.B2 ->
                arrotonda5((r.pausaSecondi * (distanza / 100.0).coerceIn(0.5, 2.0)).roundToInt()).coerceAtLeast(5)
            CodiceAllenamento.D -> 45
            else -> r.pausaSecondi
        }
        val ripartenza = su5(passo / 100.0 + pausa)
        return RipartenzaDistanza(
            distanzaMetri = distanza,
            passoCentesimi = passo,
            passoFormatted = formattaTempo(passo),
            ripartenzaSecondi = ripartenza,
            ripartenzaFormatted = formattaRipartenza(ripartenza),
            pausaEffettivaSecondi = (ripartenza - passo / 100.0).roundToInt()
        )
    }

    private fun giorni(t: Tempo, oggi: LocalDate): Long = ChronoUnit.DAYS.between(t.data, oggi)

    private fun adatta25(t: Tempo): Int =
        if (t.vascaMetri >= 50) (t.centesimi * FATTORE_50_A_25).roundToInt() else t.centesimi

    /**
     * Sceglie il tempo di riferimento per i ritmi: 100m, preferibilmente stile libero, di gara o test,
     * degli ultimi [GIORNI_VALIDITA] giorni (il migliore). Restituisce null se non esiste nessun 100m.
     */
    fun scegliRiferimento(tempi: List<Tempo>, oggi: LocalDate = LocalDate.now()): RiferimentoRitmi? {
        val c100 = tempi.filter { it.distanzaMetri == 100 }
        if (c100.isEmpty()) return null
        val note = mutableListOf<String>()

        val ufficiali = c100.filter { it.contesto != ContestoTempo.ALLENAMENTO }
        val pool = if (ufficiali.isNotEmpty()) ufficiali else {
            note += "Solo tempi di allenamento: i ritmi potrebbero essere prudenziali."
            c100
        }
        val liberi = pool.filter { it.stile == Stile.STILE_LIBERO }
        val candidati = if (liberi.isNotEmpty()) liberi else {
            val s = pool.first().stile
            note += "Nessun 100m stile libero: ritmi ricavati da un 100m ${nomeStile(s)}, da verificare."
            pool
        }
        val recenti = candidati.filter { giorni(it, oggi) <= GIORNI_VALIDITA }
        val scelto = recenti.minByOrNull { it.centesimi }
            ?: candidati.maxByOrNull { it.data }!!.also {
                note += "Tempo di riferimento datato (${giorni(it, oggi)} giorni): aggiorna con un test."
            }
        if (scelto.vascaMetri >= 50) note += "Tempo in vasca da ${scelto.vascaMetri}m riportato a 25m (stima −1,5%)."

        // Velocità critica: 400 e 100 stile libero recenti, di gara o test
        val t400 = tempi.filter {
            it.distanzaMetri == 400 && it.stile == Stile.STILE_LIBERO &&
                it.contesto != ContestoTempo.ALLENAMENTO && giorni(it, oggi) <= GIORNI_VALIDITA
        }.minByOrNull { it.centesimi }
        val t100css = liberi.filter { giorni(it, oggi) <= GIORNI_VALIDITA }.minByOrNull { it.centesimi }

        var cssPasso: Int? = null
        var t400Usato: Tempo? = null
        if (t400 != null && t100css != null) {
            val css = CalcoloScienzaNuoto.calcolaCSS(adatta25(t400), adatta25(t100css))
            if (css != null && css.passo100mCentesimi > adatta25(t100css)) {
                cssPasso = css.passo100mCentesimi
                t400Usato = t400
                note += "Soglia B1 ancorata alla velocità critica (CSS ${css.passo100mFormatted}/100m, da 400m e 100m)."
            }
        }
        return RiferimentoRitmi(scelto, adatta25(scelto), cssPasso, t400Usato, note)
    }

    private val REGEX_TEMPO_IMPORT = Regex("""\b(?:(\d{1,2}):)?(\d{1,2})[.,](\d{1,2})\b""")
    private val REGEX_DISTANZA = Regex("""\b(1500|800|400|200|100|50)\b""")
    private val REGEX_PAROLE = Regex("""[a-zà-ú]+""")

    /**
     * Importa i tempi da testo (OCR, risultati incollati). Il tempo viene estratto per primo,
     * poi distanza e stile si cercano nel resto della riga (così "1:50.20" non diventa "50 m").
     */
    fun parseImportaTempi(testo: String): List<TempoImportato> {
        val risultati = mutableListOf<TempoImportato>()
        for (riga in testo.lines()) {
            val r = riga.trim().lowercase()
            if (r.isBlank()) continue
            val match = REGEX_TEMPO_IMPORT.find(r) ?: continue
            val centesimi = parseTempo(match.value) ?: continue

            val resto = r.removeRange(match.range)
            val parole = REGEX_PAROLE.findAll(resto).map { it.value }.toSet()

            val stile = when {
                parole.any { it in setOf("dorso", "back", "backstroke", "do", "ds") } -> Stile.DORSO
                parole.any { it in setOf("rana", "breast", "breaststroke", "br", "ra") } -> Stile.RANA
                parole.any { it in setOf("farfalla", "fly", "delfino", "butterfly", "fa", "fl") } -> Stile.FARFALLA
                parole.any { it in setOf("misti", "misto", "im", "medley", "mi") } -> Stile.MISTI
                else -> Stile.STILE_LIBERO
            }
            val distanza = REGEX_DISTANZA.find(resto)?.value?.toInt() ?: 100
            val contesto = if (parole.any { it in setOf("test", "allenamento") }) ContestoTempo.TEST else ContestoTempo.GARA

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
        val ultimoTempoData = tempi
            .filter { it.atletaId == atleta.id && it.contesto != ContestoTempo.ALLENAMENTO }
            .maxOfOrNull { it.data }
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