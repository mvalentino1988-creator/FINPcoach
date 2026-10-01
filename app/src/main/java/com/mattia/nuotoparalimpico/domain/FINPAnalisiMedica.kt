package com.mattia.nuotoparalimpico.domain

import java.util.Locale

data class StimaClassiFINP(
    val classeS: Int,    // Stile libero, Dorso, Farfalla (1-10 fisici, 11-13 visivi, 14 intellettivo)
    val classeSB: Int,   // Rana (1-9 fisici, 11-13 visivi, 14 intellettivo; nota: SB10 non esiste)
    val classeSM: Int,   // Misti (1-10 fisici, 11-13 visivi, 14 intellettivo)
    val motivazione: String,
    /** false = la descrizione non indica una menomazione classificabile: la stima è solo indicativa. */
    val eleggibile: Boolean = true,
    /** "Alta", "Media" o "Bassa". */
    val affidabilita: String = "Media"
)

data class AnalisiMedicaResult(
    val condizione: String,
    val riassuntoIdrodinamico: String,
    val fattoriNuotata: List<String>,
    val stimaClassi: StimaClassiFINP,
    val raccomandazioniAllenamento: List<String>
)

data class FlagMedici(
    val spalla: Boolean,
    val neurologica: Boolean,
    val cardiorespiratoria: Boolean,
    val visiva: Boolean,
    val epilessia: Boolean,
    val termoregolazione: Boolean
) {
    val coperta: Boolean get() = spalla || neurologica || cardiorespiratoria || visiva || epilessia || termoregolazione
}

/** Ricerca nel testo per parole intere / radici all'inizio di parola, ignorando i termini negati ("senza spasticità"). */
internal class Testo(testo: String) {
    private val t = testo.lowercase(Locale.ROOT)
    private val negazioni = setOf("no", "non", "senza", "assenza", "escluso", "esclusa", "negativo", "negativa", "nessun", "nessuna")
    private val reParola = Regex("[\\p{L}\\d]+")

    private fun negato(indice: Int): Boolean {
        val prima = reParola.findAll(t.substring(0, indice)).map { it.value }.toList().takeLast(2)
        return prima.any { it in negazioni }
    }

    /** Vero se una delle radici compare all'inizio di una parola. */
    fun pref(vararg radici: String): Boolean = radici.any { r ->
        Regex("(?<![\\p{L}\\d])" + Regex.escape(r)).findAll(t).any { !negato(it.range.first) }
    }

    /** Vero se una delle parole compare per intero. */
    fun parola(vararg parole: String): Boolean = parole.any { p ->
        Regex("(?<![\\p{L}\\d])" + Regex.escape(p) + "(?![\\p{L}\\d])").findAll(t).any { !negato(it.range.first) }
    }
}

object FINPSpecialistAI {

    private val CODICI_SPINALI: Array<String> =
        ((1..8).map { "c$it" } + (1..12).map { "t$it" } + (1..5).map { "l$it" }).toTypedArray()
    private val CODICI_ALTI: Array<String> = (1..7).map { "c$it" }.toTypedArray()
    private val CODICI_MEDI: Array<String> = (1..8).map { "t$it" }.toTypedArray()

    /**
     * Analisi FINP / World Para Swimming. La stima delle classi è sempre indicativa:
     * la classificazione ufficiale spetta alla commissione.
     */
    fun analizza(condizione: String, limitazioni: String, eta: Int? = null): AnalisiMedicaResult {
        val x = Testo("$condizione $limitazioni")
        val fattori = mutableListOf<String>()
        val raccomandazioni = mutableListOf<String>()
        val stima: StimaClassiFINP
        val riassunto: String

        when {
            // 1. Lesioni midollari / paraplegia / tetraplegia / spina bifida
            x.pref("midoll", "tetrapleg", "parapleg", "spina bifida", "mielit", "mielomening", "sedia a rotelle", "carrozzina") ||
                    x.parola(*CODICI_SPINALI) -> {

                val livelloNoto = x.parola(*CODICI_SPINALI)
                val alta = x.pref("tetrapleg") || x.parola(*CODICI_ALTI)
                val media = x.parola(*CODICI_MEDI)
                val aff = if (livelloNoto) "Alta" else "Media"

                if (alta) {
                    riassunto = "Tetraplegia / Lesione Cervicale: importante riduzione della forza propulsiva negli arti superiori, assenza di controllo del tronco e degli arti inferiori."
                    fattori += "Assetto idrodinamico: elevato affondamento del bacino, incremento della resistenza di forma."
                    fattori += "Propulsione: affidata esclusivamente alle braccia (frequenza contenuta)."
                    fattori += "Termoregolazione: alterata sudorazione, sensibile alla temperatura dell'acqua."
                    stima = StimaClassiFINP(2, 1, 2, "Lesione cervicale alta con severa compromissione quadriplegica.", true, aff)
                } else if (media) {
                    riassunto = "Paraplegia Dorsale / Toracica: assenza di spinta dagli arti inferiori con controllo parziale del tronco superiore."
                    fattori += "Assetto: galleggiamento arti inferiori passivo, necessita di rollio controllato del tronco."
                    fattori += "Propulsione: bracciata efficiente con buona stabilità della cintura scapolare."
                    stima = StimaClassiFINP(4, 3, 4, "Paraplegia dorsale con assenza di gambata e controllo parziale del tronco.", true, aff)
                } else {
                    riassunto = "Paraplegia Lombare / Spina Bifida: stabilità del tronco conservata, assenza o marcata ipotrofia della gambata."
                    fattori += "Assetto: posizione orizzontale favorita dall'uso di pull-buoy in allenamento."
                    fattori += "Propulsione: forza normale degli arti superiori e ottima applicazione della trazione."
                    stima = StimaClassiFINP(6, 5, 6, "Paraplegia lombare con tronco stabile e arti inferiori non propulsivi.", true, aff)
                }
                raccomandazioni += "Utilizzo del boccaglio frontale per ridurre la resistenza di torsione durante la respirazione."
                raccomandazioni += "Esercizi dedicati alla cuffia dei rotatori e stabilizzatori della spalla."
            }

            // 2. Emiparesi / paralisi cerebrale / spasticità / poliomielite / ipotono
            x.pref("emipares", "paralisi cerebr", "spastic", "dipleg", "tetrapares", "dyston", "distoni", "atass",
                "poliomielit", "ipoton", "sclerosi", "parkinson", "ictus", "ictu", "distrof") -> {

                val severa = x.pref("grave", "tetrapares", "sedia a rotelle", "carrozzina")
                val moderata = x.pref("emipares", "dipleg")

                if (severa) {
                    riassunto = "Compromissione Neuromotoria Severa: ipertonia/spasticità quadridistrettuale con alterazione coordinativa globale."
                    fattori += "Asimmetria propulsiva: deviazione della traiettoria di nuotata."
                    fattori += "Frequenza di bracciata: svincolo dell'arto affetto rallentato dalla rigidità muscolare."
                    stima = StimaClassiFINP(3, 2, 3, "Compromissione neuromotoria estesa a quattro arti.", true, "Media")
                } else if (moderata) {
                    riassunto = "Emiparesi / Diplegia Spastica: asimmetria nella forza tra lato sano e lato affetto, ipertono muscolare accentuato dalla fatica."
                    fattori += "Traiettoria: richiede compenso del tronco per mantenere la linea di galleggiamento."
                    fattori += "Aumento spasticità: l'accumulo di acido lattico ad alta intensità accentua gli spasmi."
                    stima = StimaClassiFINP(7, 6, 7, "Emiparesi / diplegia moderata con deambulazione autonoma fuori dall'acqua.", true, "Media")
                } else {
                    riassunto = "Lieve Compromissione Coordinativa / Paresi Parziale: lieve asimmetria di spinta con buona biomeccanica."
                    fattori += "Fluidità del gesto: coordinazione braccia-gambe conservata con minima perdita di trazione."
                    stima = StimaClassiFINP(8, 7, 8, "Lieve paresi / ipotono o monoparesi di un arto.", true, "Bassa")
                }
                raccomandazioni += "Mantenere ritmi aerobici regolari (A2/B1) ed evitare serie ad altissimo lattato (C1/C2) che scatenano la spasticità."
                raccomandazioni += "Includere fasi di allungamento muscolare passivo prima e dopo la seduta."
            }

            // 3. Amputazioni / agenesie / difetti degli arti / problemi articolari
            x.pref("amputaz", "agenes", "mancanz", "moncon", "protesi", "scolios", "nanism", "acondroplas",
                "lussaz", "spall", "ginocchi", "femor", "tibia", "omer") || x.parola("anca") -> {

                val braccio = x.pref("bracc", "superior", "omer", "avambracc") || x.parola("mano", "mani")
                val gamba = x.pref("gamb", "inferior", "piede", "femor", "tibia")
                val nanismo = x.pref("nanis", "acondroplas", "statura")
                val menomazione = x.pref("amputaz", "agenes", "mancanz", "moncon")

                if (nanismo) {
                    riassunto = "Acondroplasia / Riduzione della Statura: proporzioni corporee ridotte con normale forza muscolare relativa."
                    fattori += "Frequenza di bracciata: necessità di una frequenza di passo elevata per compensare la minore ampiezza."
                    fattori += "Resistenza idrodinamica: ottima posizione orizzontale in acqua."
                    stima = StimaClassiFINP(6, 5, 6, "Acondroplasia / statura ridotta secondo i criteri di misurazione WPS.", true, "Media")
                } else if (menomazione && braccio && gamba) {
                    riassunto = "Amputazione / Agenesia Combinata: perdita di punti d'appoggio propulsivi su arti superiori ed inferiori."
                    fattori += "Galleggiamento: alterazione della spinta idrostatica e del centro di gravità."
                    stima = StimaClassiFINP(5, 4, 5, "Amputazione / agenesia combinata di arto superiore ed inferiore.", true, "Media")
                } else if (menomazione && braccio) {
                    riassunto = "Amputazione / Agenesia Arto Superiore: propulsione asimmetrica mono-laterale con forte sollecitazione della muscolatura del tronco."
                    fattori += "Rollio: accentuato verso il lato privo dell'arto per completare la respirazione."
                    stima = StimaClassiFINP(8, 7, 8, "Amputazione sopra o sotto il gomito di un arto superiore.", true, "Media")
                } else if (menomazione && gamba) {
                    riassunto = "Amputazione / Agenesia Arto Inferiore: riduzione della spinta della gambata con asimmetria nel rollio."
                    fattori += "Assetto: lieve affondamento dal lato dell'arto mancante."
                    stima = StimaClassiFINP(9, 8, 9, "Amputazione transfemorale o transtibiale di un arto inferiore.", true, "Media")
                } else {
                    riassunto = "Limitazione Articolare / Posturale: ridotta mobilità o forza su uno o più distretti articolari."
                    fattori += "Ampiezza di bracciata: adattata per evitare sovraccarichi o dolore articolare."
                    stima = StimaClassiFINP(
                        10, 9, 10,
                        "Limitazione generica: non basta a indicare una menomazione classificabile (stima solo indicativa).",
                        false, "Bassa"
                    )
                }
                raccomandazioni += "Rinforzo della muscolatura core per prevenire scoliosi e squilibri posturali."
            }

            // 4. Disabilità visiva (S11, S12, S13)
            x.pref("visiv", "cecit", "cieco", "ciech", "non vedent", "ipovedent", "ipovision", "retin", "glaucom", "ottic") ||
                    x.parola("s11", "s12", "s13") -> {

                val totale = x.parola("s11") || x.pref("cieco", "ciech", "non vedent", "totale")
                if (totale) {
                    riassunto = "Disabilità Visiva Totale (Classe S11): assenza di percezione visiva. Nuotata con occhialini oscurati e tapper per le virate."
                    fattori += "Traiettoria: orientamento mantenuto tramite appoggio tattile alle corsie galleggianti."
                    fattori += "Sincronia virata: chiamata della virata tramite la toccata del tapper sull'asta imbottita."
                    stima = StimaClassiFINP(11, 11, 11, "Non vedente totale secondo i criteri World Para Swimming B1/S11.", true, "Alta")
                } else {
                    riassunto = "Disabilità Visiva Parziale (Classe S12/S13): acuità visiva ridotta o campo visivo tubolare."
                    fattori += "Orientamento: percezione delle linee sul fondo e dei blocchi di partenza."
                    stima = StimaClassiFINP(12, 12, 12, "Ipovedente con residuo visivo limitato (S12 o S13: serve la valutazione).", true, "Bassa")
                }
                raccomandazioni += "Mantenere costante il conteggio delle bracciate per vasca per perfezionare il tempo della virata."
            }

            // 5. Disabilità intellettivo-relazionale (S14)
            x.pref("intellet", "cognitiv", "autis", "relazional", "ritard") || x.parola("down", "s14") -> {
                riassunto = "Disabilità Intellettivo-Relazionale (Classe S14): capacità fisiche ed idrodinamiche integre, con necessità di semplificazione degli schemi di allenamento."
                fattori += "Biomeccanica: nuotata efficiente con potenziale propulsivo analogo agli atleti olimpici."
                fattori += "Gestione del ritmo: necessità di supporto per la regolarità delle ripartenze e del passo."
                stima = StimaClassiFINP(14, 14, 14, "Disabilità intellettivo-relazionale (criteri INAS/Virtus).", true, "Media")
                raccomandazioni += "Utilizzare tabelle con tempi tondi sul cronometro (es. ripartenze a tempi fissi di 5s)."
            }

            // 6. Condizione organica / generica
            else -> {
                val testoCond = seVuoto(condizione, "Condizione Fisica / Organica")
                riassunto = "Analisi per '$testoCond': condizione che richiede adattamento della frequenza cardiaca e del recupero."
                fattori += "Assetto idrodinamico: preservare la posizione orizzontale del corpo ed il bilanciamento."
                fattori += "Gestione della fatica: adattare i volumi in base alle risposte individuali dell'atleta."
                stima = StimaClassiFINP(
                    10, 9, 10,
                    "Condizione non riconducibile a una menomazione classificabile: stima solo indicativa.",
                    false, "Bassa"
                )
                raccomandazioni += "Regolare le ripartenze a tempi di 5 in 5 secondi e monitorare la frequenza cardiaca."
            }
        }

        return AnalisiMedicaResult(
            condizione = seVuoto(condizione, "Condizione Fisica"),
            riassuntoIdrodinamico = riassunto,
            fattoriNuotata = fattori,
            stimaClassi = stima,
            raccomandazioniAllenamento = raccomandazioni
        )
    }

    /** Segnali medici rilevanti per l'allenamento (parole intere, negazioni gestite). */
    fun flagMedici(testo: String): FlagMedici {
        val x = Testo(testo)
        return FlagMedici(
            spalla = x.pref("spall", "cuffia", "rotator", "impingement"),
            neurologica = x.pref(
                "neurolog", "spastic", "ipertono", "sclerosi", "midoll", "parapleg", "tetrapleg", "cerebr",
                "emipares", "distrof", "parkinson", "atass", "affaticament", "mielomening", "spina bifida"
            ),
            cardiorespiratoria = x.pref(
                "cardi", "cuore", "ipertension", "pression", "aritmi", "asma", "bronch", "fibrosi cistica", "respirat", "polmon"
            ),
            visiva = x.pref("visiv", "cecit", "ciec", "non vedent", "ipovedent", "ipovision", "retin", "glaucom") ||
                    x.parola("s11", "s12", "s13", "b1", "b2", "b3"),
            epilessia = x.pref("epiless", "epilett", "convulsion"),
            termoregolazione = x.pref("midoll", "tetrapleg", "parapleg", "sclerosi multipla", "ustion")
        )
    }

    private fun seVuoto(str: String, default: String): String = str.trim().ifEmpty { default }
}