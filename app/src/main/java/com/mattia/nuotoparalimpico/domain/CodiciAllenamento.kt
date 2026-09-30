package com.mattia.nuotoparalimpico.domain

import androidx.compose.ui.graphics.Color

/**
 * Codici di allenamento della metodologia FIN / FINP (Federazione Italiana Nuoto Paralimpico).
 * Rappresentano le zone energetiche e gli obiettivi fisiologici.
 */
enum class CodiceAllenamento(
    val codice: String,
    val nome: String,
    val ambito: String,
    val hrBpm: String,
    val lattato: String,
    val coloreContainerHex: Long,
    val coloreTestoHex: Long
) {
    A1(
        codice = "A1",
        nome = "Aerobico di Base / Scioglimento",
        ambito = "Riscaldamento, recupero attivo, tecnica di bracciata e mobilità.",
        hrBpm = "120-140 bpm",
        lattato = "< 2 mmol/L",
        coloreContainerHex = 0xFFE0F2FE, // Aqua Chiaro
        coloreTestoHex = 0xFF0369A1
    ),
    A2(
        codice = "A2",
        nome = "Resistenza Aerobica (Fondo)",
        ambito = "Capacità aerobica generale, continuità di andatura, resistenza fondamentale.",
        hrBpm = "140-160 bpm",
        lattato = "2-3 mmol/L",
        coloreContainerHex = 0xFFCCFBF1, // Teal Chiaro
        coloreTestoHex = 0xFF0F766E
    ),
    B1(
        codice = "B1",
        nome = "Soglia Anaerobica",
        ambito = "Innalzamento della soglia anaerobica, andature sottomassimali prolungate.",
        hrBpm = "160-175 bpm",
        lattato = "~4 mmol/L",
        coloreContainerHex = 0xFFDBEAFE, // Blu Chiaro
        coloreTestoHex = 0xFF1D4ED8
    ),
    B2(
        codice = "B2",
        nome = "VO2 Max / Potenza Aerobica",
        ambito = "Massimo consumo di ossigeno, serie ad intervalli (HIIT), frequenza elevata.",
        hrBpm = "175-190 bpm",
        lattato = "6-8 mmol/L",
        coloreContainerHex = 0xFFE0E7FF, // Indaco Chiaro
        coloreTestoHex = 0xFF4338CA
    ),
    C1(
        codice = "C1",
        nome = "Tolleranza Lattacida",
        ambito = "Capacità di tollerare l'acidosi muscolare su sforzi di 100m-200m.",
        hrBpm = "> 185 bpm",
        lattato = "8-12 mmol/L",
        coloreContainerHex = 0xFFFEF3C7, // Amber / Giallo
        coloreTestoHex = 0xFFB45309
    ),
    C2(
        codice = "C2",
        nome = "Potenza Lattacida",
        ambito = "Produzione e smaltimento di massimo lattato, velocità prolungata su 50m-100m.",
        hrBpm = "Massimale",
        lattato = "> 12 mmol/L",
        coloreContainerHex = 0xFFFFEDD5, // Arancio
        coloreTestoHex = 0xFFC2410C
    ),
    C3(
        codice = "C3",
        nome = "Ritmo Gara (Peak)",
        ambito = "Simulazione passo gara con ampi recuperi e massima precisione di andatura.",
        hrBpm = "Gara",
        lattato = "Variabile",
        coloreContainerHex = 0xFFFCE7F3, // Rosa / Viola
        coloreTestoHex = 0xFFBE185D
    ),
    D(
        codice = "D",
        nome = "Velocità / Forza Alattacida",
        ambito = "Sforzi massimi brevissimi (< 15s), partenze, virate, reattività senza lattato.",
        hrBpm = "Massima reattività",
        lattato = "< 3 mmol/L",
        coloreContainerHex = 0xFFFEE2E2, // Rosso Chiaro
        coloreTestoHex = 0xFFB91C1C
    );

    val coloreContainer: Color get() = Color(coloreContainerHex)
    val coloreTesto: Color get() = Color(coloreTestoHex)
}
