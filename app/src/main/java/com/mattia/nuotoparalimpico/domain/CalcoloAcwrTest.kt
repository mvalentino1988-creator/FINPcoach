package com.mattia.nuotoparalimpico.domain

import com.mattia.nuotoparalimpico.data.LogSeduta
import java.time.LocalDate
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

class CalcoloAcwrTest {
    private val rif = LocalDate.of(2026, 10, 10)

    private fun seduta(giorniFa: Long, rpe: Int = 5, durata: Int = 60) = LogSeduta(
        atletaId = 1, data = rif.minusDays(giorniFa), presente = true,
        durataMin = durata, metriEffettivi = 2000, rpe = rpe
    )

    @Test
    fun caricoStabileEOttimale() {
        val log = listOf(27L, 24, 21, 17, 14, 10, 7, 3, 0).map { seduta(it) }
        val r = CalcoloAcwr.calcola(log, rif)
        assertTrue(r.affidabile)
        assertEquals(LivelloAcwr.OTTIMALE, r.livello)
    }

    @Test
    fun piccoDiCaricoEClassificatoRischio() {
        val base = listOf(27L, 24, 21, 17, 14, 10, 7).map { seduta(it) }
        val picco = listOf(3L, 0).map { seduta(it, rpe = 9, durata = 90) }
        val r = CalcoloAcwr.calcola(base + picco, rif)
        assertEquals(LivelloAcwr.RISCHIO, r.livello)
    }

    @Test
    fun conStoricoBreveNonEAffidabile() {
        val r = CalcoloAcwr.calcola(listOf(seduta(5), seduta(0)), rif)
        assertFalse(r.affidabile)
        assertNotNull(r.messaggio)
    }
}