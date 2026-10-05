package com.mattia.nuotoparalimpico.domain

import com.mattia.nuotoparalimpico.data.Atleta
import com.mattia.nuotoparalimpico.data.ContestoTempo
import com.mattia.nuotoparalimpico.data.LogSeduta
import com.mattia.nuotoparalimpico.data.Stile
import com.mattia.nuotoparalimpico.data.Tempo
import com.mattia.nuotoparalimpico.data.TipoMicrociclo
import java.time.LocalDate
import java.time.temporal.ChronoUnit
import kotlin.math.roundToInt

enum class AzioneDato { MODIFICA_ATLETA, AGGIUNGI_TEMPO, REGISTRA_SEDUTE }

/** Informazioni che servono per calcolare carichi, ritmi e gare in modo preciso. */
enum class DatoMancante(val titolo: String, val perche: String, val azione: AzioneDato) {
    SESSO("Sesso", "serve per il ranking (separato per maschile e femminile)", AzioneDato.MODIFICA_ATLETA),
    DATA_NASCITA("Data di nascita", "serve per categoria d'età e adattamenti fisiologici del carico", AzioneDato.MODIFICA_ATLETA),
    CLASSI("Classi sportive", "senza S/SB/SM non si possono consigliare le gare", AzioneDato.MODIFICA_ATLETA),
    METRI_MAX("Volume massimo a seduta", "è il tetto sotto cui il carico non viene mai sovrastimato", AzioneDato.MODIFICA_ATLETA),
    TEMPO_100("100m recente (gara o test)", "senza non si calcolano ritmi e ripartenze personali", AzioneDato.AGGIUNGI_TEMPO),
    TEMPO_400("400m stile libero recente", "serve per la velocità critica (soglia B1) più precisa", AzioneDato.AGGIUNGI_TEMPO),
    SEDUTE_RECENTI("Sedute degli ultimi 28 giorni", "senza storico il volume non può essere tarato sulla capacità reale", AzioneDato.REGISTRA_SEDUTE),
    RPE("RPE nelle sedute registrate", "serve per carico percepito (sRPE) e rapporto acuto/cronico", AzioneDato.REGISTRA_SEDUTE)
}

data class ProfiloCarico(
    val sedute: Int,                 // sedute con presenza negli ultimi 28 giorni
    val metriMedi: Int?,
    val minutiPer100m: Double?,      // include recuperi: tempo reale per 100m nuotati
    val seduteConRpe: Int,
    val sRpeMedioSeduta: Double?,
    val rpeUltime3: Double?,
    val acwr: Double?,               // carico ultimi 7 giorni / media settimanale degli ultimi 28
    val giorniDallUltima: Int?
)

data class RaccomandazioneVolume(val metri: Int, val note: List<String>)

object CalcoloCarico {

    const val SEDUTE_MINIME = 6

    fun profilo(log: List<LogSeduta>, oggi: LocalDate): ProfiloCarico {
        val presenti = log.filter { it.presente && !it.data.isAfter(oggi) }.sortedByDescending { it.data }
        fun giorni(l: LogSeduta) = ChronoUnit.DAYS.between(l.data, oggi)
        val finestra = presenti.filter { giorni(it) in 0..27 }

        val conMetri = finestra.filter { it.metriEffettivi > 0 }
        val metriMedi = if (conMetri.isEmpty()) null else conMetri.map { it.metriEffettivi }.average().roundToInt()

        val conDurata = finestra.filter { it.metriEffettivi > 0 && it.durataMin > 0 }
        val minPer100 = if (conDurata.isEmpty()) null
        else conDurata.sumOf { it.durataMin }.toDouble() / conDurata.sumOf { it.metriEffettivi } * 100.0

        val conRpe = finestra.filter { it.rpe != null && it.durataMin > 0 }
        val sRpeMedio = if (conRpe.isEmpty()) null else conRpe.map { (it.rpe ?: 0) * it.durataMin }.average()

        val rpe3 = presenti.filter { it.rpe != null && giorni(it) <= 14 }.take(3).mapNotNull { it.rpe }
        val rpeUltime3 = if (rpe3.size >= 2) rpe3.average() else null

        val acuto = presenti.filter { giorni(it) in 0..6 }.sumOf { (it.rpe ?: 0) * it.durataMin }
        val cronicoSett = presenti.filter { giorni(it) in 0..27 }.sumOf { (it.rpe ?: 0) * it.durataMin } / 4.0
        val acwr = if (conRpe.size >= 4 && cronicoSett > 0) acuto / cronicoSett else null

        return ProfiloCarico(
            sedute = finestra.size,
            metriMedi = metriMedi,
            minutiPer100m = minPer100,
            seduteConRpe = conRpe.size,
            sRpeMedioSeduta = sRpeMedio,
            rpeUltime3 = rpeUltime3,
            acwr = acwr,
            giorniDallUltima = presenti.firstOrNull()?.let { giorni(it).toInt() }
        )
    }

    /**
     * Porta il volume previsto dal piano (già scalato per fattore volume e assenze dichiarate)
     * a un valore sostenibile per l'atleta, spiegando ogni intervento.
     */
    fun volumeRaccomandato(
        metriTarget: Int,
        atleta: Atleta,
        profilo: ProfiloCarico,
        tipo: TipoMicrociclo
    ): RaccomandazioneVolume {
        var v = metriTarget.toDouble()
        val note = mutableListOf<String>()
        val medi = profilo.metriMedi
        val affidabile = profilo.sedute >= SEDUTE_MINIME && medi != null
        val tetto = atleta.metriMaxSeduta

        // 1. Tetto indicato dall'allenatore
        if (tetto != null && v > tetto) {
            v = tetto.toDouble()
            note += "Volume limitato al massimo indicato per ${atleta.nome}: $tetto m a seduta."
        }

        // 2. Coerenza con ciò che l'atleta ha realmente nuotato
        if (affidabile && medi != null) {
            if ((tipo == TipoMicrociclo.CARICO || tipo == TipoMicrociclo.ADATTAMENTO) && v > medi * 1.10) {
                note += "Il piano prevede ${v.roundToInt()} m, ma negli ultimi 28 giorni ${atleta.nome} ha nuotato in media $medi m a seduta: incremento limitato al +10%."
                v = medi * 1.10
            } else if (tipo == TipoMicrociclo.CARICO && atleta.fattoreVolume >= 1.0 &&
                (profilo.rpeUltime3 ?: 0.0) < 7.5 && v < medi * 0.9
            ) {
                val nuovo = minOf(medi * 0.9, tetto?.toDouble() ?: Double.MAX_VALUE)
                if (nuovo > v) {
                    note += "Il piano (${v.roundToInt()} m) è sotto il livello abituale di $medi m a seduta: alzato a ${nuovo.roundToInt()} m per non sottostimare il carico."
                    v = nuovo
                }
            }
        }

        // 3. Fatica recente
        profilo.rpeUltime3?.let { rpe ->
            if (rpe >= 8.5) {
                v *= 0.85
                note += "RPE medio delle ultime sedute molto alto (${"%.1f".format(rpe)}): volume ridotto del 15%."
            } else if (rpe >= 7.5 && tipo == TipoMicrociclo.CARICO) {
                v *= 0.92
                note += "RPE medio delle ultime sedute alto (${"%.1f".format(rpe)}): volume ridotto dell'8%."
            }
        }

        // 4. Rapporto carico acuto/cronico
        profilo.acwr?.let { r ->
            if (r > 1.5) {
                v *= 0.80
                note += "Carico dell'ultima settimana ${"%.2f".format(r)}× la media dell'ultimo mese: volume ridotto del 20%."
            } else if (r > 1.3) {
                v *= 0.90
                note += "Carico dell'ultima settimana ${"%.2f".format(r)}× la media dell'ultimo mese: volume ridotto del 10%."
            }
        }

        // 5. Stop recente non registrato come assenza
        val fermo = profilo.giorniDallUltima
        if (fermo != null && fermo >= 14 && medi != null && v > medi * 0.8) {
            v = medi * 0.8
            note += "Nessuna seduta registrata da $fermo giorni: ripresa graduale all'80% del volume abituale."
        }

        return RaccomandazioneVolume(v.roundToInt().coerceAtLeast(400), note)
    }

    /** RPE tipico (scala 1-10) di una zona di allenamento, per la stima del carico di una seduta. */
    fun rpeCodice(c: CodiceAllenamento): Double = when (c) {
        CodiceAllenamento.A1 -> 2.0
        CodiceAllenamento.A2 -> 3.5
        CodiceAllenamento.B1 -> 5.5
        CodiceAllenamento.B2 -> 7.0
        CodiceAllenamento.C1 -> 8.0
        CodiceAllenamento.C2 -> 8.5
        CodiceAllenamento.C3 -> 8.0
        CodiceAllenamento.D -> 6.0
    }

    fun datiMancanti(atleta: Atleta, tempi: List<Tempo>, log: List<LogSeduta>, oggi: LocalDate): List<DatoMancante> {
        val m = mutableListOf<DatoMancante>()
        if (atleta.sesso == null) m += DatoMancante.SESSO
        if (atleta.dataNascita == null) m += DatoMancante.DATA_NASCITA
        if (atleta.classeS == null && atleta.classeSB == null && atleta.classeSM == null) m += DatoMancante.CLASSI
        if (atleta.metriMaxSeduta == null) m += DatoMancante.METRI_MAX

        fun recente(t: Tempo) = ChronoUnit.DAYS.between(t.data, oggi) <= CalcoloRitmiRipartenze.GIORNI_VALIDITA
        if (tempi.none { it.distanzaMetri == 100 && it.contesto != ContestoTempo.ALLENAMENTO && recente(it) }) {
            m += DatoMancante.TEMPO_100
        }
        val fa400 = atleta.classeS in 6..13
        if (fa400 && tempi.none { it.distanzaMetri == 400 && it.stile == Stile.STILE_LIBERO && it.contesto != ContestoTempo.ALLENAMENTO && recente(it) }) {
            m += DatoMancante.TEMPO_400
        }

        val p = profilo(log, oggi)
        if (p.sedute == 0) m += DatoMancante.SEDUTE_RECENTI
        else if (p.seduteConRpe < p.sedute * 0.6) m += DatoMancante.RPE
        return m
    }
}