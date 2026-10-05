package com.mattia.nuotoparalimpico.domain

import com.mattia.nuotoparalimpico.data.FaseMesociclo
import com.mattia.nuotoparalimpico.data.TipoMicrociclo
import java.time.LocalDate
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class GeneratoreSmartSedutaTest {

    private fun scheda(fase: FaseMesociclo, tipo: TipoMicrociclo, metri: Int = 2000) =
        GeneratoreSmartSeduta.genera(LocalDate.of(2026, 10, 7), metri, fase, tipo)

    @Test
    fun tuttiITrattiSonoMultipliDi50() {
        for (fase in FaseMesociclo.entries) for (tipo in TipoMicrociclo.entries) {
            val s = scheda(fase, tipo)
            assertTrue("$fase/$tipo", s.tratti.all { it.metri % 50 == 0 && it.metri > 0 })
            assertEquals(s.volumeTotaleMetri, s.tratti.sumOf { it.metri })
        }
    }

    @Test
    fun laRipartizioneCoincideConITratti() {
        val s = scheda(FaseMesociclo.PREPARAZIONE_SPECIFICA, TipoMicrociclo.CARICO)
        assertEquals(s.volumeTotaleMetri, s.ripartizioneCodici.values.sum())
        // ogni codice in ripartizione compare in almeno un tratto
        assertTrue(s.ripartizioneCodici.keys.all { c -> s.tratti.any { it.codice == c } })
    }

    @Test
    fun ilVolumeNonSuperaIlTargetDiOltreUnaSerie() {
        val s = scheda(FaseMesociclo.PRE_GARA, TipoMicrociclo.CARICO, 1800)
        assertTrue(s.volumeTotaleMetri <= 1800 + 100)
    }

    @Test
    fun leSerieDiVelocitaSonoSu50m() {
        val s = scheda(FaseMesociclo.COMPETITIVA, TipoMicrociclo.CARICO)
        s.tratti.filter { it.codice == CodiceAllenamento.D }
            .forEach { assertTrue(it.ripetizioni.endsWith("x 50m")) }
    }
}