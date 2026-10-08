package com.mattia.nuotoparalimpico.domain

import com.mattia.nuotoparalimpico.data.Stile
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class CalcoloRitmiRipartenzeTest {

    @Test
    fun ritmiSonoPercentualiCssEIlRitmoGaraRestapersonale() {
        val tabella = CalcoloRitmiRipartenze.calcolaTabellaRitmi(
            atletaId = 1,
            tempo100mCentesimi = 6000,
            stile = Stile.STILE_LIBERO
        )
        val css = CalcoloScienzaNuoto.stimaCssDaPassoGara(6000)

        assertEquals((css * 1.05).toInt(), tabella.ritmi.getValue(CodiceAllenamento.C1).passo100mCentesimi)
        assertEquals((css * 1.02).toInt(), tabella.ritmi.getValue(CodiceAllenamento.C2).passo100mCentesimi)
        assertEquals(6000, tabella.ritmi.getValue(CodiceAllenamento.C3).passo100mCentesimi)
        assertTrue(tabella.ritmi.getValue(CodiceAllenamento.C2).passo100mCentesimi > 6000)
    }

    @Test
    fun ripartenzaScalaConLaDistanzaEContieneIlRecuperoDerivato() {
        val ritmo = CalcoloRitmiRipartenze.calcolaTabellaRitmi(
            atletaId = 1,
            tempo100mCentesimi = 6000
        ).ritmi.getValue(CodiceAllenamento.B1)

        val ripartenza50 = CalcoloRitmiRipartenze.ripartenzaPer(ritmo, 50)
        val ripartenza200 = CalcoloRitmiRipartenze.ripartenzaPer(ritmo, 200)

        assertTrue(ripartenza50.startsWith("a "))
        assertTrue(ripartenza200.startsWith("a "))
        assertTrue(ripartenza200.length >= ripartenza50.length)
        assertEquals(0, ritmo.pausaSecondi % 5)
        assertEquals(
            ritmo.passo100mCentesimi / 100 + ritmo.pausaSecondi,
            ritmo.ripartenzaSecondi
        )
    }
}
