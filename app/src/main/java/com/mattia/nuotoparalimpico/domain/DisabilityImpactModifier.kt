package com.mattia.nuotoparalimpico.domain

import com.mattia.nuotoparalimpico.data.Atleta
import com.mattia.nuotoparalimpico.data.CondizioneMedica

enum class TipologiaCodice {
    PRIMARIO, SECONDARIO_COMPLEMENTARE
}

data class SpecificaCodice(
    val codice: String,
    val nome: String,
    val capMassimoMetri: Int,
    val tipologia: TipologiaCodice,
    val moltiplicatoreRecupero: Float = 1.0f,
    val descrizione: String = nome
)

object ArchivioCodiciFisiologici {
    val catalog = mapOf(
        "A1" to SpecificaCodice("A1", "Aerobico Rigenerativo / Tecnica", 1500, TipologiaCodice.SECONDARIO_COMPLEMENTARE, 1.0f, "Nuoto rilassato e coordinato."),
        "A2" to SpecificaCodice("A2", "Fondo / Capacità Aerobica", 3000, TipologiaCodice.PRIMARIO, 1.0f, "Passo fondo costante, controllo dell'andatura."),
        "B1" to SpecificaCodice("B1", "Soglia Anaerobica / CSS", 1200, TipologiaCodice.PRIMARIO, 1.2f, "Passo soglia anaerobica costante."),
        "B2" to SpecificaCodice("B2", "VO2 Max / Potenza Aerobica", 800, TipologiaCodice.PRIMARIO, 1.5f, "Sforzo ad alta frequenza cardiaca."),
        "C1" to SpecificaCodice("C1", "Tolleranza Lattacida", 500, TipologiaCodice.SECONDARIO_COMPLEMENTARE, 2.0f, "Tolleranza all'acidosi con ampio recupero."),
        "C2" to SpecificaCodice("C2", "Potenza Lattacida Esplosiva", 300, TipologiaCodice.SECONDARIO_COMPLEMENTARE, 2.5f, "Picco di potenza lattacida massimale."),
        "C3" to SpecificaCodice("C3", "Passo Gara Specifico", 600, TipologiaCodice.PRIMARIO, 1.8f, "Simulazione esatta passo gara prioritaria."),
        "D" to SpecificaCodice("D", "Velocità / Forza Alattacida", 200, TipologiaCodice.SECONDARIO_COMPLEMENTARE, 3.0f, "Sprint alattacido ed esplosività.")
    )
}

data class ProfiloImpattoDisabilita(
    val fattoreVolume: Float,
    val codiciEsclusi: Set<String>,
    val moltiplicatoreRecupero: Float,
    val densitaMicrociclo: Float
)

object DisabilityImpactAnalyzer {
    fun analizza(atleta: Atleta?, condizioni: List<CondizioneMedica>): ProfiloImpattoDisabilita {
        val classeS = atleta?.classeS ?: 9
        val haCondizioniCritiche = conditions(condizioni)

        return when {
            classeS in 1..3 -> ProfiloImpattoDisabilita(
                fattoreVolume = 0.70f,
                codiciEsclusi = setOf("C2", "D"),
                moltiplicatoreRecupero = 1.6f,
                densitaMicrociclo = 0.6f
            )
            classeS in 4..6 || haCondizioniCritiche -> ProfiloImpattoDisabilita(
                fattoreVolume = 0.85f,
                codiciEsclusi = setOf("C2"),
                moltiplicatoreRecupero = 1.3f,
                densitaMicrociclo = 0.8f
            )
            else -> ProfiloImpattoDisabilita(
                fattoreVolume = 1.0f,
                codiciEsclusi = emptySet(),
                moltiplicatoreRecupero = 1.0f,
                densitaMicrociclo = 1.0f
            )
        }
    }

    private fun conditions(condizioni: List<CondizioneMedica>): Boolean {
        return condizioni.any { it.attiva && (it.limitazioni.contains("spasticità", true) || it.limitazioni.contains("spalla", true)) }
    }
}
