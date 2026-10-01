package com.mattia.nuotoparalimpico.domain

import java.util.Locale
import kotlin.math.roundToInt

data class RisultatoCSS(
    val cssVelocitaMs: Double,          // Velocità critica in m/s (es. 1.35 m/s)
    val passo100mCentesimi: Int,        // Tempo target a 100m in centesimi (es. 7400 = 1:14.00)
    val passo100mFormatted: String,     // es. "1:14.00"
    val spiegazioneMetodologica: String
)

data class RisultatoACWR(
    val caricoAcuto: Int,               // Carico della settimana corrente (sRPE x min)
    val caricoCronicoMedio: Double,     // Media carico ultime 4 settimane
    val acwrRapporto: Double,           // Rapporto Acuto:Cronico
    val livelloRischio: String,          // "Ottimale", "Attenzione", "Rischio Elevato"
    val avvisoInfortunio: String?
)

object CalcoloScienzaNuoto {

    /**
     * Calcola la Velocità Critica di Nuotata (CSS - Critical Swim Speed), il benchmark scientifico
     * gold-standard nel nuoto agonistico per determinare la soglia anaerobica (B1).
     *
     * @param tempo400mCentesimi tempo sui 400m stile libero
     * @param tempo100mCentesimi tempo sui 100m stile libero
     */
    fun calcolaCSS(tempo400mCentesimi: Int, tempo100mCentesimi: Int): RisultatoCSS? {
        val t400Sec = tempo400mCentesimi / 100.0
        val t100Sec = tempo100mCentesimi / 100.0
        val deltaTempo = t400Sec - t100Sec
        if (deltaTempo <= 0) return null

        // CSS (m/s) = (400 - 100) / (t400 - t100)
        val cssMs = 300.0 / deltaTempo
        val passo100Sec = 100.0 / cssMs
        val passo100Centesimi = (passo100Sec * 100).roundToInt()

        return RisultatoCSS(
            cssVelocitaMs = cssMs,
            passo100mCentesimi = passo100Centesimi,
            passo100mFormatted = formattaTempo(passo100Centesimi),
            spiegazioneMetodologica = "Velocità Critica CSS = ${String.format(Locale.ROOT, "%.2f", cssMs)} m/s. Rappresenta la massima velocità aerobica sostenibile senza accumulo esponenziale di lattato (Passo Soglia B1)."
        )
    }

    /**
     * Calcola il rapporto di carico Acuto:Cronico (ACWR - Acute:Chronic Workload Ratio)
     * utilizzato in medicina dello sport per prevenire infortuni alla spalla ed overtraining.
     */
    fun calcolaACWR(caricoSettimanaCorrente: Int, carichiPrecedenti: List<Int>): RisultatoACWR {
        val ultime4 = carichiPrecedenti.take(4)
        val cronicoMedio = if (ultime4.isEmpty()) caricoSettimanaCorrente.toDouble().coerceAtLeast(1.0) else ultime4.average().coerceAtLeast(1.0)
        val rapporto = caricoSettimanaCorrente / cronicoMedio

        val (livello, avviso) = when {
            rapporto > 1.45 -> "Rischio Elevato ⚠️" to "Rapporto carico ACWR = ${String.format("%.2f", rapporto)}. Aumento del carico troppo brusco rispetto alle ultime 4 settimane. Rischio infortunio/spalla alto: consigliato microciclo di scarico."
            rapporto > 1.25 -> "Attenzione ⚡" to "Rapporto carico ACWR = ${String.format("%.2f", rapporto)}. Incremento del carico significativo, monitorare il recupero dell'atleta."
            rapporto in 0.8..1.25 -> "Ottimale ✅" to null
            else -> "Sotto-allenamento 🔵" to "Rapporto carico ACWR = ${String.format("%.2f", rapporto)}. Volume significativamente ridotto rispetto alla media abituale."
        }

        return RisultatoACWR(
            caricoAcuto = caricoSettimanaCorrente,
            caricoCronicoMedio = cronicoMedio,
            acwrRapporto = rapporto,
            livelloRischio = livello,
            avvisoInfortunio = avviso
        )
    }
}
