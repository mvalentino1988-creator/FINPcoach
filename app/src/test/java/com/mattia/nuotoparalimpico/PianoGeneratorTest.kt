package com.mattia.nuotoparalimpico

import com.mattia.nuotoparalimpico.data.Chiusura
import com.mattia.nuotoparalimpico.data.Gara
import com.mattia.nuotoparalimpico.data.Microciclo
import com.mattia.nuotoparalimpico.data.Stagione
import com.mattia.nuotoparalimpico.data.TipoMicrociclo
import com.mattia.nuotoparalimpico.domain.ClassiSportive
import com.mattia.nuotoparalimpico.domain.Festivita
import com.mattia.nuotoparalimpico.domain.Gravita
import com.mattia.nuotoparalimpico.domain.ParametriPiano
import com.mattia.nuotoparalimpico.domain.PianoGenerator
import com.mattia.nuotoparalimpico.domain.PianoValidator
import java.time.LocalDate
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class PianoGeneratorTest {

    private val stagione = Stagione(
        id = 1,
        nome = "26/27",
        inizio = LocalDate.of(2026, 10, 3),
        fine = LocalDate.of(2027, 6, 30)
    )

    private fun micro(
        chiusure: List<Chiusura> = emptyList(),
        gare: List<Gara> = emptyList()
    ): List<Microciclo> =
        PianoGenerator.genera(stagione, chiusure, gare, ParametriPiano())
            .flatMap { it.meso }
            .flatMap { it.micro }

    @Test
    fun primaSettimanaHaUnaSolaSedutaPercheParteSabato() {
        val primo = micro().first()
        assertEquals(LocalDate.of(2026, 9, 28), primo.inizio)
        assertEquals(1, primo.sedutePreviste)
        assertEquals(TipoMicrociclo.ADATTAMENTO, primo.tipo)
    }

    @Test
    fun pausaNataliziaDiventaSettimanaDiPausa() {
        val natale = Chiusura(
            stagioneId = 1,
            dal = LocalDate.of(2026, 12, 23),
            al = LocalDate.of(2027, 1, 6),
            motivo = "Pausa natalizia"
        )
        val settimana = micro(listOf(natale)).first { it.inizio == LocalDate.of(2026, 12, 28) }
        assertEquals(TipoMicrociclo.PAUSA, settimana.tipo)
        assertEquals(0, settimana.volumeTargetMetri)
    }

    @Test
    fun settimanaConGaraEDiTipoGara() {
        val gara = Gara(stagioneId = 1, nome = "Test", dal = LocalDate.of(2027, 2, 13), al = LocalDate.of(2027, 2, 13))
        val settimana = micro(gare = listOf(gara)).first { it.inizio == LocalDate.of(2027, 2, 8) }
        assertEquals(TipoMicrociclo.GARA, settimana.tipo)
    }

    @Test
    fun ilPianoDiBaseNonHaErroriBloccanti() {
        val avvisi = PianoValidator.valida(stagione, micro(), emptyList())
        assertTrue(avvisi.none { it.gravita == Gravita.ERRORE })
    }

    @Test
    fun pasquaCalcolataCorrettamente() {
        assertEquals(LocalDate.of(2027, 3, 28), Festivita.pasqua(2027))
        assertEquals(LocalDate.of(2026, 4, 5), Festivita.pasqua(2026))
    }

    @Test
    fun classiSportiveNonValide() {
        assertTrue(ClassiSportive.valida(5, 10, 8).isNotEmpty())
        assertTrue(ClassiSportive.valida(5, 9, 8).isEmpty())
    }
}
