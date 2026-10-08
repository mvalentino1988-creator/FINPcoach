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
        assertEquals(
            ritmo.ripartenzaSecondi - kotlin.math.ceil(ritmo.passo100mCentesimi / 100.0).toInt(),
            ritmo.pausaSecondi
        )
        assertEquals(
            ritmo.ripartenzaSecondi,
            CalcoloRitmiRipartenze.ripartenzaSecondi(ritmo, 100)
        )
    }

    @Test
    fun ripartenzeDiTabellaESerieSonoMultipliDiCinqueECoerentiSuCentoMetri() {
        listOf(5500, 11000).forEach { tempoBase ->
            val tabella = CalcoloRitmiRipartenze.calcolaTabellaRitmi(
                atletaId = 1,
                tempo100mCentesimi = tempoBase,
                stile = Stile.STILE_LIBERO
            )

            CodiceAllenamento.entries.forEach { codice ->
                val ritmo = tabella.ritmi.getValue(codice)
                val ripartenza100 = CalcoloRitmiRipartenze.ripartenzaSecondi(ritmo, 100)
                val tempoNuoto = ritmo.passo100mCentesimi / 100.0

                assertEquals("$tempoBase $codice", 0, ritmo.ripartenzaSecondi % 5)
                assertEquals("$tempoBase $codice", 0, ripartenza100 % 5)
                assertTrue("$tempoBase $codice: ripartenza insufficiente", ripartenza100 - tempoNuoto >= 5.0)
                assertTrue("$tempoBase $codice: recupero negativo", ritmo.pausaSecondi >= 5)
                assertEquals(
                    "$tempoBase $codice: recupero incoerente",
                    ritmo.ripartenzaSecondi - kotlin.math.ceil(tempoNuoto).toInt(),
                    ritmo.pausaSecondi
                )
                assertEquals(
                    "$tempoBase $codice: tabella diversa dalla serie a 100m",
                    ritmo.ripartenzaFormatted,
                    CalcoloRitmiRipartenze.ripartenzaPer(ritmo, 100)
                )
            }
        }
    }
}
