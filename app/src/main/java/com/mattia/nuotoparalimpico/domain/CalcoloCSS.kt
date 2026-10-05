package com.mattia.nuotoparalimpico.domain

import com.mattia.nuotoparalimpico.data.ContestoTempo
import com.mattia.nuotoparalimpico.data.Stile
import com.mattia.nuotoparalimpico.data.Tempo
import java.time.LocalDate
import java.time.temporal.ChronoUnit
import java.util.Locale
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.roundToInt

// ---- Modelli legacy (compatibilità con le schermate esistenti) ----

data class RisultatoCSS(
    val cssVelocitaMs: Double,
    val passo100mCentesimi: Int,
    val passo100mFormatted: String,
    val spiegazioneMetodologica: String
)

data class RisultatoACWR(
    val caricoAcuto: Int,
    val caricoCronicoMedio: Double,
    val acwrRapporto: Double,
    val livelloRischio: String,
    val avvisoInfortunio: String?
)

// ---- Nuovi modelli ----

data class TestCss(val distanzaMetri: Int, val centesimi: Int)

enum class AffidabilitaCss { ALTA, MEDIA, BASSA }

data class RisultatoCssStandard(
    val cssVelocitaMs: Double,
    val passo100mCentesimi: Int,
    val passo100mFormatted: String,
    val distanzeUsate: Pair<Int, Int>,
    val affidabilita: AffidabilitaCss,
    val avvisi: List<String>,
    val dataRiferimento: LocalDate? = null
)

enum class AncoraZona { CSS, GARA_100 }

/** Zona = ancora (CSS o passo gara 100m) + offset in secondi per 100m + pausa per 100m. */
data class DefinizioneZona(val ancora: AncoraZona, val offsetSecondi: Double, val pausaPer100Secondi: Int)

typealias ConfigurazioneZone = Map<CodiceAllenamento, DefinizioneZona>

data class ZonaAllenamento(
    val codice: CodiceAllenamento,
    val passo100mCentesimi: Int,
    val pausaPer100Secondi: Int,
    val stimata: Boolean
) {
    /** Passo per una vasca: valore da impostare sul pace trainer. */
    fun passoVascaCentesimi(vascaMetri: Int): Int =
        (passo100mCentesimi * vascaMetri / 100.0).roundToInt()

    fun passoPerDistanzaCentesimi(distanzaMetri: Int): Int =
        (passo100mCentesimi * distanzaMetri / 100.0).roundToInt()

    /** Ripartenza (nuoto + recupero) per una serie di [distanzaMetri], arrotondata a 5 secondi. */
    fun ripartenzaSecondi(distanzaMetri: Int): Int {
        val pausa = max(10.0, pausaPer100Secondi * distanzaMetri / 100.0)
        val grezzo = passo100mCentesimi * distanzaMetri / 10000.0 + pausa
        return (grezzo / 5.0).roundToInt() * 5
    }
}

object CalcoloScienzaNuoto {

    /** CSS stimata dal passo gara 100m quando manca un test 400/200. Ipotesi di lavoro: va sostituita dal test. */
    const val FATTORE_CSS_STIMATO = 1.12

    val ZONE_DEFAULT: ConfigurazioneZone = mapOf(
        CodiceAllenamento.A1 to DefinizioneZona(AncoraZona.CSS, 14.0, 15),
        CodiceAllenamento.A2 to DefinizioneZona(AncoraZona.CSS, 8.0, 10),
        CodiceAllenamento.B1 to DefinizioneZona(AncoraZona.CSS, 1.0, 10),
        CodiceAllenamento.B2 to DefinizioneZona(AncoraZona.CSS, -2.0, 20),
        CodiceAllenamento.C1 to DefinizioneZona(AncoraZona.GARA_100, 3.0, 75),
        CodiceAllenamento.C2 to DefinizioneZona(AncoraZona.GARA_100, 1.5, 120),
        CodiceAllenamento.C3 to DefinizioneZona(AncoraZona.GARA_100, 0.0, 90),
        CodiceAllenamento.D to DefinizioneZona(AncoraZona.GARA_100, 0.0, 60)
    )

    /** CSS = (D2 - D1) / (T2 - T1). Standard: 400/200, stesso stile e stessa vasca. */
    fun calcolaCssStandard(lungo: TestCss, corto: TestCss): RisultatoCssStandard? {
        if (lungo.distanzaMetri <= corto.distanzaMetri) return null
        val deltaD = (lungo.distanzaMetri - corto.distanzaMetri).toDouble()
        val deltaT = (lungo.centesimi - corto.centesimi) / 100.0
        if (deltaT <= 0.0) return null
        val vLungo = lungo.distanzaMetri / (lungo.centesimi / 100.0)
        val vCorto = corto.distanzaMetri / (corto.centesimi / 100.0)
        if (vCorto <= vLungo) return null // il test corto deve essere più veloce

        val css = deltaD / deltaT
        val passo = (10000.0 / css).roundToInt()
        val coppia = lungo.distanzaMetri to corto.distanzaMetri
        val avvisi = mutableListOf<String>()
        val affidabilita = when (coppia) {
            400 to 200 -> AffidabilitaCss.ALTA
            400 to 100 -> {
                avvisi += "Con il 100m la CSS è meno affidabile (componente anaerobica): preferire 400/200."
                AffidabilitaCss.MEDIA
            }
            else -> {
                avvisi += "Distanze non standard (${coppia.first}/${coppia.second}): usare con cautela."
                AffidabilitaCss.BASSA
            }
        }
        return RisultatoCssStandard(css, passo, formattaTempo(passo), coppia, affidabilita, avvisi)
    }

    /** Sceglie il test 400 più recente e il 200 (o 100) più vicino nel tempo: stesso stile, stessa vasca, no allenamento. */
    fun calcolaCssDaTempi(
        tempi: List<Tempo>,
        stile: Stile,
        vascaMetri: Int,
        oggi: LocalDate = LocalDate.now(),
        finestraMaxGiorni: Long = 120,
        distanzaMaxTraTestGiorni: Long = 21
    ): RisultatoCssStandard? {
        val validi = tempi.filter {
            it.stile == stile && it.vascaMetri == vascaMetri &&
                it.contesto != ContestoTempo.ALLENAMENTO &&
                ChronoUnit.DAYS.between(it.data, oggi) in 0L..finestraMaxGiorni
        }
        for (lungo in validi.filter { it.distanzaMetri == 400 }.sortedByDescending { it.data }) {
            val corto = listOf(200, 100).firstNotNullOfOrNull { d ->
                validi.filter {
                    it.distanzaMetri == d &&
                        abs(ChronoUnit.DAYS.between(it.data, lungo.data)) <= distanzaMaxTraTestGiorni
                }.minByOrNull { it.centesimi }
            } ?: continue
            calcolaCssStandard(
                TestCss(400, lungo.centesimi),
                TestCss(corto.distanzaMetri, corto.centesimi)
            )?.let { return it.copy(dataRiferimento = lungo.data) }
        }
        return null
    }

    fun stimaCssDaPassoGara(passoGara100Centesimi: Int): Int =
        (passoGara100Centesimi * FATTORE_CSS_STIMATO).roundToInt()

    fun calcolaZone(
        cssPasso100Centesimi: Int,
        garaPasso100Centesimi: Int,
        stimata: Boolean,
        config: ConfigurazioneZone = ZONE_DEFAULT
    ): Map<CodiceAllenamento, ZonaAllenamento> =
        config.mapValues { (codice, def) ->
            val ancora = if (def.ancora == AncoraZona.CSS) cssPasso100Centesimi else garaPasso100Centesimi
            val passo = (ancora + def.offsetSecondi * 100).roundToInt().coerceAtLeast(2000)
            ZonaAllenamento(codice, passo, def.pausaPer100Secondi, stimata)
        }

    /** SWOLF = secondi per vasca + bracciate per vasca. Confrontare solo stesso atleta/stile/vasca. */
    fun calcolaSwolf(tempoVascaCentesimi: Int, bracciateVasca: Int): Double =
        tempoVascaCentesimi / 100.0 + bracciateVasca

    // ---- Compatibilità ----

    fun calcolaCSS(tempo400mCentesimi: Int, tempo100mCentesimi: Int): RisultatoCSS? =
        calcolaCssStandard(TestCss(400, tempo400mCentesimi), TestCss(100, tempo100mCentesimi))?.let {
            RisultatoCSS(
                cssVelocitaMs = it.cssVelocitaMs,
                passo100mCentesimi = it.passo100mCentesimi,
                passo100mFormatted = it.passo100mFormatted,
                spiegazioneMetodologica = "Velocità Critica CSS = ${String.format(Locale.ROOT, "%.2f", it.cssVelocitaMs)} m/s " +
                    "(stima da 400/100). " + it.avvisi.joinToString(" ")
            )
        }

    @Deprecated("Usa CalcoloAcwr.calcola (finestre mobili 7/28 giorni)")
    fun calcolaACWR(caricoSettimanaCorrente: Int, carichiPrecedenti: List<Int>): RisultatoACWR {
        val ultime4 = carichiPrecedenti.take(4)
        val cronico = (if (ultime4.isEmpty()) caricoSettimanaCorrente.toDouble() else ultime4.average()).coerceAtLeast(1.0)
        val rapporto = caricoSettimanaCorrente / cronico
        val testo = String.format(Locale.ITALY, "%.2f", rapporto)
        val (livello, avviso) = when {
            rapporto > 1.5 -> "Rischio Elevato ⚠️" to "ACWR $testo: picco di carico, valuta uno scarico."
            rapporto > 1.3 -> "Attenzione ⚡" to "ACWR $testo: incremento significativo, monitora il recupero."
            rapporto >= 0.8 -> "Ottimale ✅" to null
            else -> "Sotto-allenamento 🔵" to "ACWR $testo: volume ridotto rispetto alla media."
        }
        return RisultatoACWR(caricoSettimanaCorrente, cronico, rapporto, livello, avviso)
    }
}