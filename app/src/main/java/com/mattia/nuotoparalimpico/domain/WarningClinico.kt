package com.mattia.nuotoparalimpico.domain

import com.mattia.nuotoparalimpico.data.Atleta
import com.mattia.nuotoparalimpico.data.CondizioneMedica
import java.text.Normalizer
import java.util.Locale

const val DISCLAIMER_CLINICO =
    "Indicazione di supporto al tecnico, basata solo sui dati inseriti. Non è una diagnosi e non sostituisce " +
        "la valutazione del medico o del fisioterapista dell'atleta."

enum class TipoWarning(val etichetta: String) {
    DISREFLESSIA_AUTONOMICA("Disreflessia autonomica"),
    SPASTICITA("Spasticità"),
    IPOTERMIA("Termoregolazione / ipotermia"),
    SOVRACCARICO_SPALLA("Sovraccarico di spalla"),
    LESIONI_DA_PRESSIONE("Lesioni da pressione")
}

enum class LivelloWarning { INFO, ATTENZIONE, ALTO }

data class WarningClinico(
    val tipo: TipoWarning,
    val livello: LivelloWarning,
    val motivazione: String,
    val azioniTecnico: List<String>,
    val disclaimer: String = DISCLAIMER_CLINICO
)

/** Dati di contesto facoltativi: migliorano la gradazione dei warning. */
data class ContestoWarning(
    val temperaturaAcquaC: Double? = null,
    val durataSedutaMin: Int? = null,
    val livelloAcwr: LivelloAcwr? = null
)

data class ProfiloClinico(
    val lesioneMidollare: Boolean,
    val tetraplegia: Boolean,
    val livelloLesione: String?,
    val lesioneT6OSopra: Boolean?,   // null = livello non determinabile dal testo
    val spinaBifida: Boolean,
    val carrozzina: Boolean,
    val sensibilitaRidotta: Boolean,
    val neuroSpastico: Boolean,
    val sclerosiMultipla: Boolean,
    val amputazioneArtoSuperiore: Boolean,
    val problemaSpalla: Boolean
)

object AnalisiWarningClinici {

    private val REGEX_LIVELLO = Regex("""\b([ctl])\s?-?\s?(\d{1,2})\b""")

    private fun normalizza(s: String): String =
        Normalizer.normalize(s.lowercase(Locale.ITALIAN), Normalizer.Form.NFD)
            .replace(Regex("\\p{Mn}+"), "")

    private fun String.ha(vararg pattern: String) = pattern.any { Regex(it).containsMatchIn(this) }

    fun profilo(atleta: Atleta, condizioni: List<CondizioneMedica>): ProfiloClinico {
        val t = normalizza(
            condizioni.filter { it.attiva }.joinToString(" ") { "${it.descrizione} ${it.limitazioni}" } + " " + atleta.note
        )
        val tetra = t.ha("""\btetrapleg""", """\btetraplegia""")
        val lesione = tetra || t.ha("""\bmidoll""", """\bparapleg""", """\bmielolesi""", """lesione spinale""", """\bsci\b""")
        val spina = t.ha("""spina bifida""", """mielomeningocele""")
        val carrozzina = t.ha("""\bcarrozzin""", """sedia a rotelle""", """wheelchair""")

        // Livello più craniale tra quelli citati (C < T < L), solo se c'è una lesione/spina bifida
        val livelli = if (lesione || spina) REGEX_LIVELLO.findAll(t).map { it.groupValues[1] to it.groupValues[2].toInt() }.toList() else emptyList()
        val ordine = { l: Pair<String, Int> -> (when (l.first) { "c" -> 0; "t" -> 1; else -> 2 }) * 100 + l.second }
        val piuAlto = livelli.minByOrNull(ordine)
        val t6OSopra: Boolean? = when {
            tetra -> true
            piuAlto == null -> null
            piuAlto.first == "c" -> true
            piuAlto.first == "t" -> piuAlto.second <= 6
            else -> false
        }

        val sm = t.ha("""sclerosi multipla""")
        val neuro = sm || t.ha("""paralisi cerebral""", """\bspastic""", """emipares""", """dipleg""", """tetrapares""", """\bictus\b""", """atassi""", """distoni""")

        return ProfiloClinico(
            lesioneMidollare = lesione,
            tetraplegia = tetra,
            livelloLesione = piuAlto?.let { it.first.uppercase() + it.second },
            lesioneT6OSopra = t6OSopra,
            spinaBifida = spina,
            carrozzina = carrozzina,
            sensibilitaRidotta = lesione || spina || t.ha("""sensibilit""", """neuropatia"""),
            neuroSpastico = neuro,
            sclerosiMultipla = sm,
            amputazioneArtoSuperiore = t.ha("""amput""", """agenesi""", """mancanza""") &&
                t.ha("""\bbracc""", """\bomer""", """gomit""", """avambrac""", """\bmano\b""", """arto superiore"""),
            problemaSpalla = t.ha("""\bspall""", """cuffia""", """rotator""", """impingement""")
        )
    }

    fun genera(
        atleta: Atleta,
        condizioni: List<CondizioneMedica>,
        contesto: ContestoWarning = ContestoWarning()
    ): List<WarningClinico> {
        val p = profilo(atleta, condizioni)
        val out = mutableListOf<WarningClinico>()
        val freddo = contesto.temperaturaAcquaC?.let { it < 28.0 } == true
        val lunga = (contesto.durataSedutaMin ?: 0) > 75

        // 1. Disreflessia autonomica (rilevante per lesioni a T6 o superiori)
        if (p.lesioneMidollare || p.spinaBifida) {
            val livello = when {
                p.lesioneT6OSopra == true -> LivelloWarning.ALTO
                p.lesioneT6OSopra == null && p.lesioneMidollare -> LivelloWarning.ATTENZIONE
                else -> null
            }
            if (livello != null) {
                out += WarningClinico(
                    TipoWarning.DISREFLESSIA_AUTONOMICA, livello,
                    if (p.lesioneT6OSopra == true) "Lesione a livello ${p.livelloLesione ?: "alto"} (T6 o superiore): la disreflessia può comparire da stimoli dolorosi o fastidiosi sotto la lesione."
                    else "Lesione midollare con livello non indicato: verifica con lo staff sanitario se rientra nel rischio (T6 o superiore).",
                    listOf(
                        "Concorda con il medico un piano scritto: segnali da riconoscere, cosa fare e chi chiamare (118 se necessario).",
                        "Conosci i segnali segnalati dall'atleta (cefalea improvvisa, sudorazione o rossore sopra la lesione, brividi).",
                        "Prima della seduta chiedi all'atleta se ci sono fastidi noti (indumenti stretti, vescica, cute).",
                        "In caso di sintomi interrompi la seduta e attiva il protocollo concordato."
                    )
                )
            }
        }

        // 2. Spasticità
        if (p.neuroSpastico || p.lesioneMidollare) {
            out += WarningClinico(
                TipoWarning.SPASTICITA, if (freddo) LivelloWarning.ALTO else LivelloWarning.ATTENZIONE,
                "Condizione con possibile spasticità: freddo, fatica e alto accumulo di lattato possono accentuarla." +
                    if (freddo) " Acqua sotto i 28 °C." else "",
                listOf(
                    "Riscaldamento progressivo e più lungo del solito.",
                    "Se gli spasmi aumentano, riduci o sospendi le serie C1/C2 e preferisci A2/B1.",
                    "Annota le sedute con spasmi per mostrarle al medico/fisioterapista."
                )
            )
        }

        // 3. Termoregolazione / ipotermia
        val termoreg = p.lesioneMidollare || p.sclerosiMultipla || p.tetraplegia
        if (termoreg) {
            out += WarningClinico(
                TipoWarning.IPOTERMIA,
                if (freddo || lunga) LivelloWarning.ALTO else LivelloWarning.ATTENZIONE,
                "Termoregolazione possibilmente alterata." +
                    (if (freddo) " Acqua sotto i 28 °C." else "") + (if (lunga) " Seduta oltre 75 minuti." else "") +
                    if (contesto.temperaturaAcquaC == null) " Temperatura dell'acqua non registrata." else "",
                listOf(
                    "Registra la temperatura dell'acqua a ogni seduta.",
                    "Prevedi pause fuori dall'acqua, abbigliamento caldo a bordo vasca e asciugatura rapida.",
                    "Con brividi o pelle fredda e pallida interrompi e riscalda l'atleta."
                )
            )
        }

        // 4. Sovraccarico di spalla
        if (p.carrozzina || p.lesioneMidollare || p.amputazioneArtoSuperiore || p.problemaSpalla) {
            val carichiAlti = contesto.livelloAcwr == LivelloAcwr.ATTENZIONE || contesto.livelloAcwr == LivelloAcwr.RISCHIO
            out += WarningClinico(
                TipoWarning.SOVRACCARICO_SPALLA,
                if (carichiAlti || p.problemaSpalla) LivelloWarning.ALTO else LivelloWarning.ATTENZIONE,
                "Le spalle sostengono sia la propulsione in acqua sia le attività fuori dall'acqua." +
                    if (carichiAlti) " Il carico recente è in aumento marcato (ACWR)." else "",
                listOf(
                    "Limita palette rigide e serie ad alta intensità se compare dolore.",
                    "Includi lavoro di stabilizzazione scapolare e cuffia dei rotatori.",
                    "Chiedi all'atleta il dolore a fine seduta e annotalo."
                )
            )
        }

        // 5. Lesioni da pressione
        if (p.carrozzina || p.sensibilitaRidotta) {
            out += WarningClinico(
                TipoWarning.LESIONI_DA_PRESSIONE, LivelloWarning.ATTENZIONE,
                "Sensibilità ridotta e/o uso di carrozzina: la cute è più esposta a pressione, attrito e umidità.",
                listOf(
                    "Controllo cutaneo prima e dopo la seduta (anche da parte di atleta o caregiver).",
                    "Attenzione a superfici ruvide, trasferimenti e bordo vasca; asciugatura accurata.",
                    "Segnala arrossamenti che non scompaiono al medico/fisioterapista."
                )
            )
        }
        return out.sortedByDescending { it.livello.ordinal }
    }
}