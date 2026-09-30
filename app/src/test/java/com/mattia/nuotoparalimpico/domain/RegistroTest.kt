package com.mattia.nuotoparalimpico.domain

import com.mattia.nuotoparalimpico.data.ContestoTempo
import com.mattia.nuotoparalimpico.data.Stile
import com.mattia.nuotoparalimpico.data.Tempo
import java.time.LocalDate
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class RegistroTest {

    @Test
    fun parseTempoAccettaIFormatiComuni() {
        assertEquals(6235, parseTempo("1:02.35"))
        assertEquals(2840, parseTempo("28,4"))
        assertEquals(2840, parseTempo("28.40"))
        assertEquals(6000, parseTempo("60"))
    }

    @Test
    fun parseTempoRifiutaTestiNonValidi() {
        assertNull(parseTempo(""))
        assertNull(parseTempo("abc"))
        assertNull(parseTempo("1:75.00"))
    }

    @Test
    fun formattaTempo() {
        assertEquals("1:02.35", formattaTempo(6235))
        assertEquals("28.40", formattaTempo(2840))
    }

    @Test
    fun ilPrimatoConsideraSoloLeGare() {
        fun tempo(centesimi: Int, contesto: ContestoTempo) = Tempo(
            atletaId = 1,
            data = LocalDate.of(2026, 10, 1),
            stile = Stile.DORSO,
            distanzaMetri = 50,
            centesimi = centesimi,
            contesto = contesto
        )
        val primati = primatiPersonali(
            listOf(
                tempo(3300, ContestoTempo.GARA),
                tempo(3100, ContestoTempo.GARA),
                tempo(2900, ContestoTempo.ALLENAMENTO)
            )
        )
        assertEquals(1, primati.size)
        assertEquals(3100, primati.first().centesimi)
    }
}
