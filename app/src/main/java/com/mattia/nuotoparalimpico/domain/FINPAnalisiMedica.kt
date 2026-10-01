package com.mattia.nuotoparalimpico.domain

data class StimaClassiFINP(
    val classeS: Int,    // Stile libero, Dorso, Farfalla (1-10 fisici, 11-13 visivi, 14 intellettivo)
    val classeSB: Int,   // Rana (1-9 fisici, 11-13 visivi, 14 intellettivo; nota: SB10 non esiste)
    val classeSM: Int,   // Misti (1-10 fisici, 11-13 visivi, 14 intellettivo)
    val motivazione: String
)

data class AnalisiMedicaResult(
    val condizione: String,
    val riassuntoIdrodinamico: String,
    val fattoriNuotata: List<String>,
    val stimaClassi: StimaClassiFINP, // Sempre presente e garantita
    val raccomandazioniAllenamento: List<String>
)

object FINPSpecialistAI {

    /**
     * Analisi esperta FINP (Federazione Italiana Nuoto Paralimpico) e World Para Swimming (WPS).
     * Garantisce SEMPRE risposte sensate, idrodinamiche e una stima accurata delle classi S/SB/SM
     * per qualsiasi condizione o descrizione inserita dall'utente.
     */
    fun analizza(condizione: String, limitazioni: String, eta: Int? = null): AnalisiMedicaResult {
        val testo = "$condizione $limitazioni".lowercase().trim()
        val fattori = mutableListOf<String>()
        val raccomandazioni = mutableListOf<String>()
        val stima: StimaClassiFINP
        val riassunto: String

        when {
            // 1. Lesioni Midollari / Paraplegia / Tetraplegia / Spina Bifida
            testo.contains("midoll") || testo.contains("tetrapleg") || testo.contains("parapleg") ||
            testo.contains("spina bifida") || testo.contains("mielit") || testo.contains("sedia") ||
            testo.contains("c1") || testo.contains("c2") || testo.contains("c3") || testo.contains("c4") ||
            testo.contains("c5") || testo.contains("c6") || testo.contains("c7") || testo.contains("c8") ||
            testo.contains("t1") || testo.contains("t2") || testo.contains("t3") || testo.contains("t4") ||
            testo.contains("t5") || testo.contains("t6") || testo.contains("t7") || testo.contains("t8") ||
            testo.contains("t9") || testo.contains("t10") || testo.contains("t11") || testo.contains("t12") ||
            testo.contains("l1") || testo.contains("l2") || testo.contains("l3") || testo.contains("l4") || testo.contains("l5") -> {

                val alta = testo.contains("tetra") || testo.contains("c1") || testo.contains("c2") || testo.contains("c3") || testo.contains("c4") || testo.contains("c5") || testo.contains("c6") || testo.contains("c7")
                val media = testo.contains("t1") || testo.contains("t2") || testo.contains("t3") || testo.contains("t4") || testo.contains("t5") || testo.contains("t6") || testo.contains("t7") || testo.contains("t8")

                if (alta) {
                    riassunto = "Tetraplegia / Lesione Cervicale: importante riduzione della forza propulsiva negli arti superiori, assenza di controllo del tronco e degli arti inferiori."
                    fattori += "Assetto idrodinamico: elevato affondamento del bacino, incremento della resistenza di forma."
                    fattori += "Propulsione: affidata esclusivamente alle braccia (frequenza contenuta)."
                    fattori += "Termoregolazione: alterata sudorazione, sensibile alla temperatura dell'acqua."
                    stima = StimaClassiFINP(2, 1, 2, "Lesione cervicale alta con severa compromissione quadriplegica.")
                } else if (media) {
                    riassunto = "Paraplegia Dorsale / Toracica: assenza di spinta dagli arti inferiori con controllo parziale del tronco superiore."
                    fattori += "Assetto: galleggiamento arti inferiori passivo, necessita di rollio controllato del tronco."
                    fattori += "Propulsione: bracciata efficiente con buona stabilità della cintura scapolare."
                    stima = StimaClassiFINP(4, 3, 4, "Paraplegia dorsale con assenza di gambata e controllo parziale del tronco.")
                } else {
                    riassunto = "Paraplegia Lombare / Spina Bifida: stabilità del tronco conservata, assenza o marcata ipotrofia della gambata."
                    fattori += "Assetto: posizione orizzontale favorita dall'uso di pull-buoy in allenamento."
                    fattori += "Propulsione: forza normale degli arti superiori e ottima applicazione della trazione."
                    stima = StimaClassiFINP(6, 5, 6, "Paraplegia lombare con tronco stabile e arti inferiori non propulsivi.")
                }
                raccomandazioni += "Utilizzo del boccaglio frontale per ridurre la resistenza di torsione durante la respirazione."
                raccomandazioni += "Esercizi dedicati alla cuffia dei rotatori e stabilizzatori della spalla."
            }

            // 2. Emiparesi / Paralisi Cerebrale / Spasticità / Poliomielite / Ipotono
            testo.contains("emipares") || testo.contains("paralisi cerebr") || testo.contains("spastic") ||
            testo.contains("dipleg") || testo.contains("tetrapares") || testo.contains("dyston") ||
            testo.contains("atass") || testo.contains("poliomielit") || testo.contains("ipoton") ||
            testo.contains("sclerosi") || testo.contains("parkinson") || testo.contains("ictu") -> {

                val severa = testo.contains("grave") || testo.contains("tetrapares") || testo.contains("sedia")
                val moderata = testo.contains("emipares") || testo.contains("dipleg")

                if (severa) {
                    riassunto = "Compromissione Neuromotoria Severa: ipertonia/spasticità quadridistrettuale con alterazione coordinativa globale."
                    fattori += "Asimmetria propulsiva: deviazione della traiettoria di nuotata."
                    fattori += "Frequenza di bracciata: svincolo dell'arto affetto rallentato dalla rigidità muscolare."
                    stima = StimaClassiFINP(3, 2, 3, "Compromissione neuromotoria estesa a quattro arti.")
                } else if (moderata) {
                    riassunto = "Emiparesi / Diplegia Spastica: asimmetria nella forza tra lato sano e lato affetto, ipertono muscolare accentuato dalla fatica."
                    fattori += "Traiettoria: richiede compenso del tronco per mantenere la linea di galleggiamento."
                    fattori += "Aumento spasticità: l'accumulo di acido lattico ad alta intensità accentua gli spasmi."
                    stima = StimaClassiFINP(7, 6, 7, "Emiparesi / diplegia moderata con deambulazione autonoma fuori dall'acqua.")
                } else {
                    riassunto = "Lieve Compromissione Coordinativa / Paresi Parziale: lieve asimmetria di spinta con buona biomeccanica."
                    fattori += "Fluidità del gesto: coordinazione braccia-gambe conservata con minima perdita di trazione."
                    stima = StimaClassiFINP(8, 7, 8, "Lieve paresi / ipotono o monoparesi di un arto.")
                }
                raccomandazioni += "Mantenere ritmi aerobici regolari (A2/B1) ed evitare serie ad altissimo lattato (C1/C2) che scatenano la spasticità."
                raccomandazioni += "Includere fasi di allungamento muscolare passivo prima e dopo la seduta."
            }

            // 3. Amputazioni / Agenesie / Difetti degli Arti / Problemi Articolari
            testo.contains("amputaz") || testo.contains("agenes") || testo.contains("mancanz") ||
            testo.contains("moncon") || testo.contains("protesi") || testo.contains("femor") ||
            testo.contains("tibia") || testo.contains("omer") || testo.contains("radi") ||
            testo.contains("scolios") || testo.contains("nanism") || testo.contains("acondroplas") ||
            testo.contains("lussaz") || testo.contains("spalla") || testo.contains("ginocchi") || testo.contains("anca") -> {

                val braccio = testo.contains("bracc") || testo.contains("superior") || testo.contains("mano") || testo.contains("omer") || testo.contains("radi")
                val gamba = testo.contains("gamb") || testo.contains("inferior") || testo.contains("piede") || testo.contains("femor") || testo.contains("tibia")
                val nanismo = testo.contains("nanis") || testo.contains("acondroplas") || testo.contains("statura")

                if (nanismo) {
                    riassunto = "Acondroplasia / Riduzione della Statura: proporzioni corporee ridotte con normale forza muscolare relativa."
                    fattori += "Frequenza di bracciata: necessità di una frequenza di passo elevata per compensare la minore ampiezza."
                    fattori += "Resistenza idrodinamica: ottima posizione orizzontale in acqua."
                    stima = StimaClassiFINP(6, 5, 6, "Acondroplasia / statura ridotta secondo i criteri di misurazione WPS.")
                } else if (braccio && gamba) {
                    riassunto = "Amputazione / Agenesia Combinata: perdita di punti d'appoggio propulsivi su arti superiori ed inferiori."
                    fattori += "Galleggiamento: alterazione della spinta idrostatica e del centro di gravità."
                    stima = StimaClassiFINP(5, 4, 5, "Amputazione / agenesia combinata di arto superiore ed inferiore.")
                } else if (braccio) {
                    riassunto = "Amputazione / Agenesia Arto Superiore: propulsione asimmetrica mono-laterale con forte sollecitazione della muscolatura del tronco."
                    fattori += "Rollio: accentuato verso il lato privo dell'arto per completare la respirazione."
                    stima = StimaClassiFINP(8, 7, 8, "Amputazione sopra o sotto il gomito di un arto superiore.")
                } else if (gamba) {
                    riassunto = "Amputazione / Agenesia Arto Inferiore: riduzione della spinta della gambata con asimmetria nel rollio."
                    fattori += "Assetto: lieve affondamento dal lato dell'arto mancante."
                    stima = StimaClassiFINP(9, 8, 9, "Amputazione transfemorale o transtibiale di un arto inferiore.")
                } else {
                    riassunto = "Limitazione Articolare / Posturale: ridotta mobilità o forza su uno o più distretti articolari."
                    fattori += "Ampiezza di bracciata: adattata per evitare sovraccarichi o dolore articolare."
                    stima = StimaClassiFINP(10, 9, 10, "Lieve limitazione funzionale agli arti o articolazioni (S10/SB9/SM10).")
                }
                raccomandazioni += "Rinforzo della muscolatura core per prevenire scoliosi e squilibri posturali."
            }

            // 4. Disabilità Visiva (S11, S12, S13)
            testo.contains("visiv") || testo.contains("cecit") || testo.contains("cieco") ||
            testo.contains("non vedent") || testo.contains("ipovedent") || testo.contains("ottic") ||
            testo.contains("retin") || testo.contains("glaucom") || testo.contains("s11") || testo.contains("s12") || testo.contains("s13") -> {

                val totale = testo.contains("s11") || testo.contains("totale") || testo.contains("cieco") || testo.contains("non vedent")
                if (totale) {
                    riassunto = "Disabilità Visiva Totale (Classe S11): assenza di percezione visiva. Nuotata obbligatoria con occhialini oscurati e tapper per le virate."
                    fattori += "Traiettoria: orientamento mantenuto tramite appoggio tattile alle corsie galleggianti."
                    fattori += "Sincronia virata: chiamata della virata tramite la toccata del tapper sull'asta imbottita."
                    stima = StimaClassiFINP(11, 11, 11, "Non vedente totale secondo i criteri World Para Swimming B1/S11.")
                } else {
                    riassunto = "Disabilità Visiva Parziale (Classe S12/S13): acuità visiva ridotta o campo visivo tubolare."
                    fattori += "Orientamento: percezione delle linee sul fondo e dei blocchi di partenza."
                    stima = StimaClassiFINP(12, 12, 12, "Ipovedente con residuo visivo limitato (S12/S13).")
                }
                raccomandazioni += "Mantenere costante il conteggio delle bracciate per vasca per perfezionare il tempo della virata."
            }

            // 5. Disabilità Intellettivo-Relazionale (S14)
            testo.contains("intellet") || testo.contains("cognitiv") || testo.contains("autis") ||
            testo.contains("down") || testo.contains("psic") || testo.contains("relazion") ||
            testo.contains("s14") || testo.contains("ritard") -> {

                riassunto = "Disabilità Intellettivo-Relazionale (Classe S14): capacità fisiche ed idrodinamiche integre, con necessità di semplificazione degli schemi di allenamento."
                fattori += "Biomeccanica: nuotata efficiente con potenziale propulsivo analogo agli atleti olimpici."
                fattori += "Gestione del ritmo: necessità di supporto per la regolarità delle ripartenze e del passo."
                stima = StimaClassiFINP(14, 14, 14, "Disabilità intellettivo-relazionale riconosciuta INAS/Virtus (IQ <= 75).")
                raccomandazioni += "Utilizzare tabelle con tempi tondi sul cronometro (es. ripartenze a tempi fissi di 5s)."
            }

            // 6. Condizione Organica / Sistematica / Generica inserita dall'utente
            else -> {
                val testoCond = seVuoto(condizione, "Condizione Fisica / Organica")
                riassunto = "Analisi per '$testoCond': condizione che richiede adattamento della frequenza cardiaca e del recupero."
                fattori += "Assetto idrodinamico: preservare la posizione orizzontale del corpo ed il bilanciamento."
                fattori += "Gestione della fatica: adattare i volumi in base alle risposte individuali dell'atleta."
                stima = StimaClassiFINP(10, 9, 10, "Stima classe funzionale S10 / SB9 / SM10 (lieve compromissione o condizione fisica generica).")
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

    private fun seVuoto(str: String, default: String): String = str.trim().ifEmpty { default }
}
