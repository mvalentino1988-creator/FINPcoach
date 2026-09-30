package com.mattia.nuotoparalimpico.domain

import com.mattia.nuotoparalimpico.data.Assenza
import com.mattia.nuotoparalimpico.data.Atleta
import com.mattia.nuotoparalimpico.data.Microciclo
import java.time.DayOfWeek
import java.time.temporal.ChronoUnit
import java.time.temporal.TemporalAdjusters
import kotlin.math.roundToInt

data class VolumeAtleta(val metri: Int, val note: List<String>)

/**
 * Volume settimanale di un singolo atleta: parte dal target di squadra e applica
 * fattore volume, giorni di assenza e rientro graduale dopo assenze di almeno 14 giorni
 * (60% nella settimana del rientro, 80% nella successiva).
 */
object VolumeIndividuale {

    fun settimana(micro: Microciclo, atleta: Atleta, assenze: List<Assenza>): VolumeAtleta {
        val giorni = (0L..6L).map { micro.inizio.plusDays(it) }
        val assenti = giorni.count { d -> assenze.any { !d.isBefore(it.dal) && !d.isAfter(it.al) } }
        if (assenti == 7) return VolumeAtleta(0, listOf("assente tutta la settimana"))

        val note = mutableListOf<String>()
        var fattore = atleta.fattoreVolume
        if (atleta.fattoreVolume < 1.0) {
            note += "volume al ${(atleta.fattoreVolume * 100).roundToInt()}%"
        }
        if (assenti > 0) {
            fattore *= (7 - assenti) / 7.0
            note += "assente $assenti giorni"
        }

        var rientro = 1.0
        for (a in assenze) {
            if (ChronoUnit.DAYS.between(a.dal, a.al) + 1 < 14) continue
            val settimanaRientro = a.al.plusDays(1).with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
            val f = when (ChronoUnit.WEEKS.between(settimanaRientro, micro.inizio)) {
                0L -> 0.6
                1L -> 0.8
                else -> 1.0
            }
            rientro = minOf(rientro, f)
        }
        if (rientro < 1.0) {
            fattore *= rientro
            note += "rientro graduale"
        }

        return VolumeAtleta((micro.volumeTargetMetri * fattore).roundToInt(), note)
    }
}