package com.mattia.nuotoparalimpico.domain

data class StimaClassiFINP(
    val classeS: Int,    // Stile libero, Dorso, Farfalla (1-10 fisici, 11-13 visivi, 14 intellettivo)
    val classeSB: Int,   // Rana (1-9 fisici, 11-13 visivi, 14 intellettivo)
    val classeSM: Int,   // Misti (1-10 fisici, 11-13 visivi, 14 intellettivo)
    val motivazione: String
)

data class AnalisiMedicaResult(
    val condizione: String,
    val riassuntoIdrodinamico: String,
    val fattoriNuotata: List<String>,
    val stimaClassi: StimaClassiFINP?,
    val raccomandazioniAllenamento: List<String>
)

object FINPSpecialistAI {

    /**
     * Analisi esperta FINP (Federazione Italiana Nuoto Paralimpico) basata sulla diagnosi medica,
     * limitazioni fisiche e impatto idrodinamico/biomeccanico.
     */
    fun analizza(condizione: String, limitazioni: String, eta: Int? = null): AnalisiMedicaResult {
        val testo = "$condizione $limitazioni".lowercase()
        val fattori = mutableListOf<String>()
        val raccomandazioni = mutableListOf<String>()
        var stima: StimaClassiFINP? = null

        val riassunto: String

        when {
            // 1. Lesioni Midollari / Paraplegia / Tetraplegia
            testo.contains("midoll") || testo.contains("tetrapleg") || testo.contains("parapleg") || testo.contains("spina bifida") -> {
                val alta = testo.contains("tetra") || testo.contains("c1") || testo.contains("c2") || testo.contains("c3") || testo.contains("c4") || testo.contains("c5") || testo.contains("c6") || testo.contains("c7")
                val media = testo.contains("t1") || testo.contains("t2") || testo.contains("t3") || testo.contains("t4") || testo.contains("t5") || testo.contains("t6") || testo.contains("t7") || testo.contains("t8")

                if (alta) {
                    riassunto = "Tetraplegia / Lesione Midollare Cervicale: assenza di funzione negli arti inferiori e nel tronco, compromissione parziale/totale del controllo delle mani e muscoli respiratori intercostali."
                    fattori += "Assetto idrodinamico: affondamento accentuato del bacino e degli arti inferiori (elevata resistenza di forma)."
                    fattori += "Propulsione: affidata esclusivamente alle braccia e alle spalle con frequenza ridotta."
                    fattori += "Termoregolazione: ridotta capacità di dissipare il calore (monitorare la temperatura dell'acqua)."
                    stima = StimaClassiFINP(2, 1, 2, "Lesione cervicale alta con severa riduzione funzionale di arti e tronco.")
                } else if (media) {
                    riassunto = "Paraplegia Dorsale Alta: assenza di spinta dagli arti inferiori, controllo del tronco limitato alla parte superiore."
                    fattori += "Assetto: galleggiamento arti inferiori passivo con necessità di rollio controllato del tronco."
                    fattori += "Propulsione: buona forza degli arti superiori, virate con sola spinta delle braccia sul muro."
                    stima = StimaClassiFINP(4, 3, 4, "Paraplegia dorsale con assenza di gambata e controllo parziale del tronco.")
                } else {
                    riassunto = "Paraplegia Lombare / Spina Bifida: assenza o marcata ipotrofia della gambata, buon controllo del tronco e stabilità della cintura scapolare."
                    fattori += "Assetto: galleggiamento facilitato dall'uso di pull-buoy durante l'allenamento o gambata stabilizzatrice minimale."
                    fattori += "Bracciata: forza normale della parte superiore del corpo, ottima capacità di applicare forza costante."
                    stima = StimaClassiFINP(6, 5, 6, "Paraplegia lombare / spina bifida con tronco funzionale e arti inferiori non propulsivi.")
                }
                raccomandazioni += "Utilizzo di boccaglio frontale per ridurre la resistenza di torsione del tronco."
                raccomandazioni += "Esercizi di estensione e stabilità della spalla per prevenire la sindrome da conflitto (impingement)."
            }

            // 2. Emiparesi / Paralisi Cerebrale / Spasticità
            testo.contains("emipares") || testo.contains("paralisi cerebr") || testo.contains("spastic") || testo.contains("dyston") || testo.contains("atass") -> {
                val severa = testo.contains("grave") || testo.contains("tetrapares")
                riassunto = "Paresi / Diplegia / Spasticità Neurologica: asimmetria nella distribuzione della forza propulsiva e ipertonia muscolare accentuata dallo sforzo."
                fattori += "Asimmetria propulsiva: tendenza alla deviazione della traiettoria di nuotata verso il lato debole."
                fattori += "Aumento dell'ipertono: la fatica ad alta intensità e l'acqua fredda/calda scatenano spasmi muscolari."
                fattori += "Frequenza di bracciata: ridotta fluidità nella fase di svincolo e recupero aereo dell'arto affetto."

                stima = if (severa) StimaClassiFINP(3, 2, 3, "Compromissione motoria quadrupla / emiparesi severa.")
                else StimaClassiFINP(7, 6, 7, "Emiparesi / diplegia moderata con deambulazione autonoma.")

                raccomandazioni += "Privilegiare ritmi regolari (A2/B1) ed evitare accumuli di lattato prolungati (C1/C2) che aumentano la spasticità."
                raccomandazioni += "Fasi di allungamento passivo ed esercizi di simmetria con tavoletta e pinnette."
            }

            // 3. Amputazioni / Agenesie
            testo.contains("amputaz") || testo.contains("agenes") || testo.contains("mancanz") -> {
                val braccio = testo.contains("bracc") || testo.contains("superior") || testo.contains("mano")
                val gamba = testo.contains("gamb") || testo.contains("inferior") || testo.contains("piede")

                if (braccio && gamba) {
                    riassunto = "Amputazione / Agenesia Multipla: perdita di punti d'appoggio idrodinamici su arti superiori ed inferiori."
                    fattori += "Galleggiamento: forte alterazione del centro di galleggiamento e di spinta idrostatica."
                    fattori += "Virata e Partenza: necessita di adattamento della presa sul blocco o sul muro."
                    stima = StimaClassiFINP(5, 4, 5, "Amputazione / agenesia combinata di arto superiore ed inferiore.")
                } else if (braccio) {
                    riassunto = "Amputazione / Agenesia Arto Superiore: propulsione prevalentemente mono-laterale con forte compenso del tronco."
                    fattori += "Resistenza di torsione: la bracciata singola richiede elevata stabilizzazione addominale e dorsale."
                    fattori += "Rollio: accentuato verso il lato privo dell'arto per completare la respirazione."
                    stima = StimaClassiFINP(8, 7, 8, "Amputazione sopra/sotto il gomito di un arto superiore.")
                } else {
                    riassunto = "Amputazione / Agenesia Arto Inferiore: riduzione della spinta della gambata e asimmetria nel rollio."
                    fattori += "Assetto: lieve affondamento dal lato affetto, compensabile con leggera gambata dell'arto sano."
                    fattori += "Partenza: spinta dal blocco concentrata sull'arto integro."
                    stima = StimaClassiFINP(9, 8, 9, "Amputazione transfemorale o transtibiale di un arto inferiore.")
                }
                raccomandazioni += "Lavoro specifico sulla muscolatura core per prevenire scoliosi e asimmetrie posturali."
            }

            // 4. Disabilità Visiva (S11 - S13)
            testo.contains("non vedent") || testo.contains("ipovedent") || testo.contains("cecità") || testo.contains("visiv") -> {
                val totale = testo.contains("s11") || testo.contains("totale") || testo.contains("cieco")
                riassunto = if (totale) "Disabilità Visiva Totale (S11): assenza di percezione visiva, nuotata con occhialini oscurati e presenza obbligatoria del tapper."
                else "Disabilità Visiva Parziale (S12/S13): ridotta acuità visiva o campo visivo ristretto."

                fattori += "Traiettoria: necessità di appoggio tattile alle corsie per mantenere la direzione rettilinea."
                fattori += "Orientamento spazio-temporale: virata e arrivo sincronizzati con la toccata del tapper (S11) o conteggio bracciate."
                fattori += "Coordinazione aerea: eccellente sensibilità dell'acqua (feel for the water)."

                stima = if (totale) StimaClassiFINP(11, 11, 11, "Non vedente totale (obbligo tapper e occhialini neri).")
                else StimaClassiFINP(12, 12, 12, "Ipovedente con residuo visivo limitato.")

                raccomandazioni += "Mantenere costante il numero di bracciate per vasca per perfezionare il tempo di virata."
            }

            // 5. Disabilità Intellettivo-Relazionale (S14)
            testo.contains("intellet") || testo.contains("cognitiv") || testo.contains("autis") || testo.contains("down") || testo.contains("s14") -> {
                riassunto = "Disabilità Intellettivo-Relazionale (Classe S14): ottime capacità fisiche ed idrodinamiche con necessità di semplificazione degli schemi d'allenamento."
                fattori += "Capacità coordinative: buona biomeccanica di nuotata con potenziale analogo agli atleti olimpici."
                fattori += "Gestione del ritmo: difficoltà nella regolazione autonoma delle andature e nei tempi di ripartenza."
                fattori += "Concentrazione: sensibile alle variazioni dell'ambiente di gara e dello stress da prestazione."

                stima = StimaClassiFINP(14, 14, 14, "Disabilità intellettivo-relazionale riconosciuta (IQ <= 75).")

                raccomandazioni += "Utilizzare schemi ripetitivi e chiari sul tabellone con partenze a tempi tondi (es. ogni 1'30\")."
            }

            // 6. Altre condizioni generali o non specificate
            else -> {
                riassunto = "Condizione Medica Generica: $condizione. Richiede monitoraggio individuale e adattamento delle frequenze di allenamento."
                fattori += "Gestione della fatica: adattare i volumi in base al recupero soggettivo dell'atleta."
                fattori += "Assetto idrodinamico: preservare la posizione orizzontale del corpo ed il bilanciamento."
                raccomandazioni += "Pianificare verifiche periodiche dei tempi di recupero e della frequenza cardiaca."
            }
        }

        return AnalisiMedicaResult(
            condizione = condizione,
            riassuntoIdrodinamico = riassunto,
            fattoriNuotata = fattori,
            stimaClassi = stima,
            raccomandazioniAllenamento = raccomandazioni
        )
    }
}
