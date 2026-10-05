package com.mattia.nuotoparalimpico.domain

data class StimaClassiFINP(
    val classeS: Int,    // Stile libero, Dorso, Farfalla
    val classeSB: Int,   // Rana (SB10 non esiste)
    val classeSM: Int,   // Misti
    val motivazione: String
)

/** Categorie cliniche riconosciute. L'ordine è la priorità: vince il tag con ordinal minore. */
enum class TagClinico {
    MIDOLLARE_ALTO, MIDOLLARE_DORSALE, MIDOLLARE_LOMBARE, SPINA_BIFIDA,
    NEURO_GRAVE, NEURO_MODERATO, NEURO_LIEVE,
    AMPUTAZIONE_COMBINATA, NANISMO, AMPUTAZIONE_SUPERIORE, AMPUTAZIONE_INFERIORE, LIMITAZIONE_ARTICOLARE,
    VISIVA_TOTALE, VISIVA_PARZIALE, INTELLETTIVA,
    GENERICA
}

data class AnalisiMedicaResult(
    val condizione: String,
    val riassuntoIdrodinamico: String,
    val fattoriNuotata: List<String>,
    val stimaClassi: StimaClassiFINP,
    val raccomandazioniAllenamento: List<String>,
    val tag: Set<TagClinico> = emptySet()
)

private class ProfiloTag(
    val riassunto: String,
    val fattori: List<String>,
    val raccomandazioni: List<String>,
    val s: Int, val sb: Int, val sm: Int,
    val motivazione: String
)

private const val NOTA_STIMA = " Stima indicativa: la classificazione ufficiale spetta ai classificatori World Para Swimming."

private val RACC_MIDOLLARE = listOf(
    "Utilizzo del boccaglio frontale per ridurre la resistenza di torsione durante la respirazione.",
    "Esercizi dedicati alla cuffia dei rotatori e stabilizzatori della spalla."
)
private val RACC_NEURO = listOf(
    "Mantenere ritmi aerobici regolari (A2/B1) ed evitare serie ad altissimo lattato (C1/C2) che possono accentuare la spasticità.",
    "Includere fasi di allungamento muscolare passivo prima e dopo la seduta."
)

private val PROFILI: Map<TagClinico, ProfiloTag> = mapOf(
    TagClinico.MIDOLLARE_ALTO to ProfiloTag(
        "Tetraplegia / lesione cervicale: forte riduzione della forza propulsiva degli arti superiori, assenza di controllo del tronco e degli arti inferiori.",
        listOf(
            "Assetto idrodinamico: affondamento del bacino, maggiore resistenza di forma.",
            "Propulsione affidata alle braccia (frequenza contenuta).",
            "Termoregolazione alterata: sensibile alla temperatura dell'acqua."
        ),
        RACC_MIDOLLARE, 2, 1, 2, "Lesione cervicale alta con severa compromissione."
    ),
    TagClinico.MIDOLLARE_DORSALE to ProfiloTag(
        "Paraplegia dorsale: nessuna spinta dagli arti inferiori, controllo parziale del tronco.",
        listOf(
            "Assetto: arti inferiori passivi, serve rollio controllato del tronco.",
            "Propulsione: bracciata efficiente con buona stabilità scapolare."
        ),
        RACC_MIDOLLARE, 4, 3, 4, "Paraplegia dorsale senza gambata e con tronco parzialmente controllato."
    ),
    TagClinico.MIDOLLARE_LOMBARE to ProfiloTag(
        "Paraplegia lombare: tronco stabile, gambata assente o molto ridotta.",
        listOf(
            "Assetto: posizione orizzontale favorita dal pull-buoy in allenamento.",
            "Propulsione: arti superiori con forza normale."
        ),
        RACC_MIDOLLARE, 6, 5, 6, "Paraplegia lombare con tronco stabile e arti inferiori non propulsivi."
    ),
    TagClinico.SPINA_BIFIDA to ProfiloTag(
        "Spina bifida: stabilità del tronco in genere conservata, gambata ridotta o assente.",
        listOf(
            "Assetto: posizione orizzontale favorita dal pull-buoy in allenamento.",
            "Propulsione: forza normale degli arti superiori."
        ),
        RACC_MIDOLLARE, 6, 5, 6, "Spina bifida con arti inferiori poco propulsivi."
    ),
    TagClinico.NEURO_GRAVE to ProfiloTag(
        "Compromissione neuromotoria severa: spasticità o ipertonia estesa con alterazione coordinativa globale.",
        listOf(
            "Asimmetria propulsiva: deviazione della traiettoria.",
            "Svincolo dell'arto affetto rallentato dalla rigidità muscolare."
        ),
        RACC_NEURO, 3, 2, 3, "Compromissione neuromotoria estesa a quattro arti."
    ),
    TagClinico.NEURO_MODERATO to ProfiloTag(
        "Emiparesi / diplegia spastica: asimmetria di forza tra lato sano e lato affetto, ipertono accentuato dalla fatica.",
        listOf(
            "Traiettoria: compenso del tronco per mantenere la linea di galleggiamento.",
            "L'accumulo di lattato ad alta intensità può accentuare gli spasmi."
        ),
        RACC_NEURO, 7, 6, 7, "Emiparesi o diplegia moderata."
    ),
    TagClinico.NEURO_LIEVE to ProfiloTag(
        "Lieve compromissione coordinativa o paresi parziale: lieve asimmetria di spinta con buona biomeccanica.",
        listOf("Coordinazione braccia-gambe conservata con minima perdita di trazione."),
        RACC_NEURO, 8, 7, 8, "Lieve paresi, ipotono o monoparesi."
    ),
    TagClinico.AMPUTAZIONE_COMBINATA to ProfiloTag(
        "Amputazione o agenesia combinata: perdita di punti propulsivi su arti superiori e inferiori.",
        listOf("Galleggiamento: alterazione della spinta idrostatica e del baricentro."),
        listOf("Rinforzo della muscolatura core per prevenire squilibri posturali."),
        5, 4, 5, "Amputazione o agenesia di arto superiore e inferiore."
    ),
    TagClinico.NANISMO to ProfiloTag(
        "Acondroplasia / statura ridotta: proporzioni ridotte con forza muscolare relativa normale.",
        listOf(
            "Frequenza di bracciata alta per compensare la minore ampiezza.",
            "Buona posizione orizzontale in acqua."
        ),
        listOf("Rinforzo della muscolatura core per prevenire squilibri posturali."),
        6, 5, 6, "Statura ridotta secondo i criteri di misurazione WPS."
    ),
    TagClinico.AMPUTAZIONE_SUPERIORE to ProfiloTag(
        "Amputazione o agenesia dell'arto superiore: propulsione asimmetrica con forte lavoro del tronco.",
        listOf("Rollio accentuato verso il lato privo dell'arto per respirare."),
        listOf("Rinforzo della muscolatura core per prevenire squilibri posturali."),
        8, 7, 8, "Amputazione di un arto superiore."
    ),
    TagClinico.AMPUTAZIONE_INFERIORE to ProfiloTag(
        "Amputazione o agenesia dell'arto inferiore: gambata ridotta con asimmetria nel rollio.",
        listOf("Assetto: lieve affondamento dal lato dell'arto mancante."),
        listOf("Rinforzo della muscolatura core per prevenire squilibri posturali."),
        9, 8, 9, "Amputazione di un arto inferiore."
    ),
    TagClinico.LIMITAZIONE_ARTICOLARE to ProfiloTag(
        "Limitazione articolare o posturale: mobilità o forza ridotte in uno o più distretti.",
        listOf("Ampiezza di bracciata adattata per evitare sovraccarichi o dolore."),
        listOf("Rinforzo della muscolatura core per prevenire squilibri posturali."),
        10, 9, 10, "Lieve limitazione funzionale (S10/SB9/SM10)."
    ),
    TagClinico.VISIVA_TOTALE to ProfiloTag(
        "Disabilità visiva totale (S11): nessuna percezione visiva; occhialini oscurati e tapper per le virate.",
        listOf(
            "Orientamento tramite contatto con le corsie.",
            "Virata segnalata dal tapper con l'asta imbottita."
        ),
        listOf("Mantenere costante il conteggio delle bracciate per vasca."),
        11, 11, 11, "Non vedente totale (classe 11)."
    ),
    TagClinico.VISIVA_PARZIALE to ProfiloTag(
        "Disabilità visiva parziale (S12/S13): acuità o campo visivo ridotti.",
        listOf("Orientamento su linee di fondo e blocchi di partenza."),
        listOf("Mantenere costante il conteggio delle bracciate per vasca."),
        12, 12, 12, "Ipovedente con residuo visivo limitato (12/13)."
    ),
    TagClinico.INTELLETTIVA to ProfiloTag(
        "Disabilità intellettivo-relazionale (S14): capacità fisiche conservate, servono consegne semplici.",
        listOf(
            "Nuotata efficiente con potenziale propulsivo analogo a un atleta non disabile.",
            "Supporto per regolarità di ripartenze e passo."
        ),
        listOf("Utilizzare tabelle con tempi tondi sul cronometro (ripartenze a multipli di 5 s)."),
        14, 14, 14, "Disabilità intellettiva (classe 14, criteri INAS/Virtus)."
    ),
    TagClinico.GENERICA to ProfiloTag(
        "Condizione non riconosciuta automaticamente: adattare frequenza cardiaca e recupero alla risposta dell'atleta.",
        listOf(
            "Preservare posizione orizzontale e bilanciamento.",
            "Adattare i volumi alle risposte individuali."
        ),
        listOf("Regolare le ripartenze a multipli di 5 s e monitorare la frequenza cardiaca."),
        10, 9, 10, "Nessuna categoria riconosciuta: valore indicativo S10/SB9/SM10, da verificare."
    )
)

object FINPSpecialistAI {

    private val R_LIVELLO = Regex("""\b(c[1-8]|t(?:[1-9]|1[0-2])|l[1-5])\b""")
    private val R_MIDOLLARE = Regex("""\b(midoll\w*|tetrapleg\w*|parapleg\w*|mielit\w*|lesione spinale)\b""")
    private val R_TETRA = Regex("""\btetrapleg\w*""")
    private val R_SPINA_BIFIDA = Regex("""\b(spina bifida|mielomeningocele)\b""")
    private val R_NEURO = Regex("""\b(emipares\w*|paralisi cerebral\w*|spastic\w*|dipleg\w*|tetrapares\w*|distoni\w*|atass\w*|poliomielit\w*|ipoton\w*|sclerosi|parkinson|ictus)\b""")
    private val R_NEURO_GRAVE = Regex("""\b(grave|gravi|severa|severo|tetrapares\w*)\b""")
    private val R_NEURO_MOD = Regex("""\b(emipares\w*|dipleg\w*)\b""")
    private val R_AMPUTAZIONE = Regex("""\b(amputaz\w*|agenesi\w*|moncon\w*|ipoplasi\w*)\b""")
    private val R_SUPERIORE = Regex("""\b(bracci\w*|arto superiore|arti superiori|mano|omero|avambraccio|gomito)\b""")
    private val R_INFERIORE = Regex("""\b(gamb\w*|arto inferiore|arti inferiori|piede|femore|femorale|tibia\w*|ginocchio)\b""")
    private val R_NANISMO = Regex("""\b(nanism\w*|acondroplasi\w*|bassa statura|statura ridotta)\b""")
    private val R_ARTICOLARE = Regex("""\b(spalla|ginocchi\w*|anca|lussazion\w*|scolios\w*|protesi)\b""")
    private val R_VISIVA = Regex("""\b(visiv\w*|cecit\w*|cieco|non vedent\w*|ipovedent\w*|retin\w*|glaucom\w*|s11|s12|s13)\b""")
    private val R_VISIVA_TOT = Regex("""\b(s11|cieco|non vedent\w*|cecit\w* total\w*|visiv\w* total\w*)\b""")
    private val R_INTELLETTIVA = Regex("""\b(intellet\w*|cognitiv\w*|autis\w*|sindrome di down|down|ritard\w*|s14)\b""")

    /** Rileva i tag clinici dal testo libero (parole intere, niente sottostringhe). */
    fun rilevaTag(condizione: String, limitazioni: String): Set<TagClinico> {
        val t = "$condizione $limitazioni".lowercase().trim()
        val tag = mutableSetOf<TagClinico>()

        val livello = R_LIVELLO.find(t)?.value
        if (R_MIDOLLARE.containsMatchIn(t) || livello != null) {
            val num = livello?.drop(1)?.toIntOrNull()
            tag += when {
                R_TETRA.containsMatchIn(t) || (livello?.startsWith("c") == true && (num ?: 8) <= 7) -> TagClinico.MIDOLLARE_ALTO
                livello?.startsWith("t") == true && (num ?: 13) <= 8 -> TagClinico.MIDOLLARE_DORSALE
                else -> TagClinico.MIDOLLARE_LOMBARE
            }
        }
        if (R_SPINA_BIFIDA.containsMatchIn(t)) tag += TagClinico.SPINA_BIFIDA
        if (R_NEURO.containsMatchIn(t)) {
            tag += when {
                R_NEURO_GRAVE.containsMatchIn(t) -> TagClinico.NEURO_GRAVE
                R_NEURO_MOD.containsMatchIn(t) -> TagClinico.NEURO_MODERATO
                else -> TagClinico.NEURO_LIEVE
            }
        }
        if (R_AMPUTAZIONE.containsMatchIn(t)) {
            val sup = R_SUPERIORE.containsMatchIn(t)
            val inf = R_INFERIORE.containsMatchIn(t)
            tag += when {
                sup && inf -> TagClinico.AMPUTAZIONE_COMBINATA
                sup -> TagClinico.AMPUTAZIONE_SUPERIORE
                inf -> TagClinico.AMPUTAZIONE_INFERIORE
                else -> TagClinico.LIMITAZIONE_ARTICOLARE
            }
        }
        if (R_NANISMO.containsMatchIn(t)) tag += TagClinico.NANISMO
        if (R_ARTICOLARE.containsMatchIn(t)) tag += TagClinico.LIMITAZIONE_ARTICOLARE
        if (R_VISIVA.containsMatchIn(t)) {
            tag += if (R_VISIVA_TOT.containsMatchIn(t)) TagClinico.VISIVA_TOTALE else TagClinico.VISIVA_PARZIALE
        }
        if (R_INTELLETTIVA.containsMatchIn(t)) tag += TagClinico.INTELLETTIVA
        return if (tag.isEmpty()) setOf(TagClinico.GENERICA) else tag
    }

    /**
     * Analisi orientativa per condizione. La stima delle classi segue il tag a priorità più alta
     * ed è indicativa: non sostituisce la classificazione ufficiale.
     */
    fun analizza(condizione: String, limitazioni: String, eta: Int? = null): AnalisiMedicaResult {
        val tag = rilevaTag(condizione, limitazioni)
        val principale = tag.minByOrNull { it.ordinal } ?: TagClinico.GENERICA
        val p = PROFILI.getValue(principale)

        val altri = tag.filter { it != principale }
        val riassunto = if (principale == TagClinico.GENERICA) {
            val nome = condizione.trim().ifEmpty { "condizione indicata" }
            "Analisi per '$nome': ${p.riassunto}"
        } else if (altri.isEmpty()) p.riassunto
        else p.riassunto + " Rilevate anche: " + altri.joinToString(", ") { it.name.lowercase().replace('_', ' ') } + "."

        return AnalisiMedicaResult(
            condizione = condizione.trim().ifEmpty { "Condizione Fisica" },
            riassuntoIdrodinamico = riassunto,
            fattoriNuotata = p.fattori,
            stimaClassi = StimaClassiFINP(p.s, p.sb, p.sm, p.motivazione + NOTA_STIMA),
            raccomandazioniAllenamento = p.raccomandazioni,
            tag = tag
        )
    }
}