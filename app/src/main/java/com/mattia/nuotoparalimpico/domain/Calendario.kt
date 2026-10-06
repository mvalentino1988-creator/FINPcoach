package com.mattia.nuotoparalimpico.domain

import com.mattia.nuotoparalimpico.data.Chiusura
import com.mattia.nuotoparalimpico.data.Gara
import com.mattia.nuotoparalimpico.data.Microciclo
import com.mattia.nuotoparalimpico.data.Stagione
import com.mattia.nuotoparalimpico.data.TipoMicrociclo
import java.time.DayOfWeek
import java.time.LocalDate

/** Tutto ciò che il calendario deve sapere su un singolo giorno. */
data class GiornoCalendario(
    val data: LocalDate,
    val micro: Microciclo?,
    val chiusura: Chiusura?,
    val gare: List<Gara>,
    /** true = in questo giorno è prevista una seduta in vasca. */
    val seduta: Boolean
)

object Calendario {

    /** Giorni di allenamento <-> bitmask (lun = 1, mar = 2, mer = 4 ... dom = 64). */
    fun maschera(giorni: Set<DayOfWeek>): Int =
        giorni.fold(0) { m, g -> m or (1 shl (g.value - 1)) }

    fun giorni(maschera: Int): Set<DayOfWeek> =
        DayOfWeek.entries.filter { (maschera and (1 shl (it.value - 1))) != 0 }.toSet()

    fun giorno(
        data: LocalDate,
        stagione: Stagione,
        micro: List<Microciclo>,
        chiusure: List<Chiusura>,
        gare: List<Gara>
    ): GiornoCalendario {
        val settimana = micro.firstOrNull { !data.isBefore(it.inizio) && !data.isAfter(it.fine) }
        val chiusura = chiusure.firstOrNull { !data.isBefore(it.dal) && !data.isAfter(it.al) }
        val gareGiorno = gare.filter { !data.isBefore(it.dal) && !data.isAfter(it.al) }
        val seduta = settimana != null &&
                settimana.tipo != TipoMicrociclo.PAUSA &&
                settimana.sedutePreviste > 0 &&
                data.dayOfWeek in giorni(stagione.giorniAllenamento) &&
                chiusura == null &&
                gareGiorno.isEmpty() &&
                !data.isBefore(stagione.inizio) && !data.isAfter(stagione.fine)
        return GiornoCalendario(data, settimana, chiusura, gareGiorno, seduta)
    }

    /** Metri di una seduta: volume della settimana diviso le sedute previste. */
    fun metriSeduta(micro: Microciclo, volumeSettimana: Int = micro.volumeTargetMetri): Int =
        if (micro.sedutePreviste > 0) volumeSettimana / micro.sedutePreviste else 1800
}
