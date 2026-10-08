package com.mattia.nuotoparalimpico.domain

import com.mattia.nuotoparalimpico.data.ContestoTempo
import com.mattia.nuotoparalimpico.data.Stile
import com.mattia.nuotoparalimpico.data.Tempo
import java.time.LocalDate
import org.junit.Assert.assertFalse
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
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

    @Test
    fun parserUsaIntestazioneFiltraSoloAtletaEInterpretaDistanzeCorrettamente() {
            val testo = """
                200 m Stile Libero Maschi
                1 Mario Rossi 2:10.20
                2 Luca Bianchi 2:05.11
                3 Paolo Verdi 2:08.00
            """.trimIndent()

            val importati = CalcoloRitmiRipartenze.parseImportaTempi(testo, "Biánchi", "Luca")

            assertEquals(1, importati.size)
            assertEquals(200, importati.single().distanzaMetri)
            assertEquals(Stile.STILE_LIBERO, importati.single().stile)
            assertEquals(12511, importati.single().centesimi)
            assertEquals("2 Luca Bianchi 2:05.11", importati.single().rigaOriginale)
            assertTrue(CalcoloRitmiRipartenze.parseImportaTempi(testo, "").isEmpty())
    }

    @Test
    fun parserNonConfondereMilanoFabioDateEOraConLoStileEIlTempo() {
            val testo = """
                100 m Stile Libero Test
                1 Fabio Milano 05.10.2026 1:50.20
            """.trimIndent()

            val importato = CalcoloRitmiRipartenze.parseImportaTempi(testo, "Milano", "Fabio").single()

            assertEquals(Stile.STILE_LIBERO, importato.stile)
            assertEquals(100, importato.distanzaMetri)
            assertEquals(11020, importato.centesimi)
            assertEquals(ContestoTempo.TEST, importato.contesto)
            assertFalse(importato.stileNonRiconosciuto)
    }

    @Test
    fun parserRiconosce1500EStileSconosciutoSenzaAssumereLibero() {
            val testo1500 = """
                1500m Stile Libero
                1 Rossi 15:50.20
            """.trimIndent()
            val tempo1500 = CalcoloRitmiRipartenze.parseImportaTempi(testo1500, "Rossi").single()

            assertEquals(1500, tempo1500.distanzaMetri)
            assertEquals(Stile.STILE_LIBERO, tempo1500.stile)
            assertEquals(95020, tempo1500.centesimi)

            val testoStileIgnoto = """
                200 m Stile Sconosciuto
                1 Rossi 2:10.00
            """.trimIndent()
            val tempoIgnoto = CalcoloRitmiRipartenze.parseImportaTempi(testoStileIgnoto, "Rossi").single()
            assertNull(tempoIgnoto.stile)
            assertTrue(tempoIgnoto.stileNonRiconosciuto)
    }

    @Test
    fun riferimento100PreferisceStilePoiIlMiglioreRecenteEIgnoraAllenamentoEVascaDiversa() {
            val oggi = LocalDate.of(2026, 6, 1)
            val tempi = listOf(
                tempo(1, oggi.minusDays(1), Stile.STILE_LIBERO, 100, 4000, ContestoTempo.ALLENAMENTO),
                tempo(1, oggi.minusDays(10), Stile.STILE_LIBERO, 100, 6000),
                tempo(1, oggi.minusDays(40), Stile.STILE_LIBERO, 100, 5500),
                tempo(1, oggi.minusDays(5), Stile.DORSO, 100, 5000),
                tempo(1, oggi.minusDays(3), Stile.STILE_LIBERO, 100, 4500, vasca = 50)
            )

            val riferimento = CalcoloRitmiRipartenze.tempoRiferimento100(tempi, Stile.STILE_LIBERO, 25, oggi)
            assertEquals(5500, riferimento?.tempo?.centesimi)
            assertFalse(riferimento?.datato ?: true)

            val datato = CalcoloRitmiRipartenze.tempoRiferimento100(
                listOf(tempo(1, oggi.minusDays(181), Stile.STILE_LIBERO, 100, 6000)),
                Stile.STILE_LIBERO,
                25,
                oggi
            )
            assertTrue(datato?.datato == true)
    }

    @Test
    fun cssRichiede100E400DelloStessoStileVascaEntro90Giorni() {
            val data = LocalDate.of(2026, 6, 1)
            val cento = tempo(1, data, Stile.STILE_LIBERO, 100, 6000)
            val quattrocentoValido = tempo(1, data.minusDays(90), Stile.STILE_LIBERO, 400, 27000)
            assertTrue(CalcoloScienzaNuoto.calcolaCssRiferimenti(cento, quattrocentoValido) != null)

            assertNull(
                CalcoloScienzaNuoto.calcolaCssRiferimenti(
                    cento,
                    tempo(1, data, Stile.DORSO, 400, 27000)
                )
            )
            assertNull(
                CalcoloScienzaNuoto.calcolaCssRiferimenti(
                    cento,
                    tempo(1, data.minusDays(91), Stile.STILE_LIBERO, 400, 27000)
                )
            )
            assertNull(
                CalcoloScienzaNuoto.calcolaCssRiferimenti(
                    cento,
                    tempo(1, data, Stile.STILE_LIBERO, 400, 27000, vasca = 50)
                )
            )
    }

    @Test
    fun tempiUgualiPerAtletaDataStileDistanzaVascaECentesimiSonoDuplicati() {
            val tempo = tempo(7, LocalDate.of(2026, 6, 1), Stile.RANA, 100, 8000, vasca = 50)
            assertTrue(
                CalcoloRitmiRipartenze.isTempoDuplicato(
                    listOf(tempo),
                    atletaId = 7,
                    data = tempo.data,
                    stile = tempo.stile,
                    distanzaMetri = tempo.distanzaMetri,
                    vascaMetri = tempo.vascaMetri,
                    centesimi = tempo.centesimi
                )
            )
            assertFalse(
                CalcoloRitmiRipartenze.isTempoDuplicato(
                    listOf(tempo),
                    atletaId = 7,
                    data = tempo.data,
                    stile = tempo.stile,
                    distanzaMetri = tempo.distanzaMetri,
                    vascaMetri = 25,
                    centesimi = tempo.centesimi
                )
            )
    }

    private fun tempo(
            atletaId: Long,
            data: LocalDate,
            stile: Stile,
            distanza: Int,
            centesimi: Int,
            contesto: ContestoTempo = ContestoTempo.GARA,
            vasca: Int = 25
        ) = Tempo(
            atletaId = atletaId,
            data = data,
            stile = stile,
            distanzaMetri = distanza,
            centesimi = centesimi,
            contesto = contesto,
            vascaMetri = vasca
        )
}
