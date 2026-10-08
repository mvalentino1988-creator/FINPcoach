package com.mattia.nuotoparalimpico.domain

import com.mattia.nuotoparalimpico.data.FaseMesociclo
import com.mattia.nuotoparalimpico.data.TipoMicrociclo
import java.time.LocalDate
import org.junit.Assert.assertTrue
import org.junit.Test

class GeneratoreSmartSedutaTest {

    @Test
    fun schedaMantieneVolumeDefaticamentoEA1EntroIlLimite() {
        val scheda = GeneratoreSmartSeduta.genera(
            data = LocalDate.of(2026, 10, 8),
            metriTarget = 4000,
            fase = FaseMesociclo.PREPARAZIONE_SPECIFICA,
            tipoMicro = TipoMicrociclo.CARICO
        )
        val sommaTratti = scheda.tratti.sumOf { it.metri }
        val metriA1 = scheda.ripartizioneCodici[CodiceAllenamento.A1] ?: 0
        val metriDefaticamento = scheda.tratti.single { it.sezione == "Defaticamento" }.metri

        assertTrue(kotlin.math.abs(sommaTratti - scheda.volumeTotaleMetri) <= 50)
        assertTrue(kotlin.math.abs(scheda.volumeTotaleMetri - 4000) <= 50)
        assertTrue(metriA1 <= scheda.volumeTotaleMetri * 0.25)
        assertTrue(metriDefaticamento >= 150)
        assertTrue(metriDefaticamento in (scheda.volumeTotaleMetri * 0.05).toInt()..(scheda.volumeTotaleMetri * 0.10).toInt())
    }

    @Test
    fun schedaPrevedeUnTrattoPerOgniCodiceConQuotaAlmenoCentoMetri() {
        val scheda = GeneratoreSmartSeduta.genera(
            data = LocalDate.of(2026, 10, 8),
            metriTarget = 4000,
            fase = FaseMesociclo.PREPARAZIONE_SPECIFICA,
            tipoMicro = TipoMicrociclo.CARICO
        )

        listOf(CodiceAllenamento.A2, CodiceAllenamento.B1, CodiceAllenamento.B2, CodiceAllenamento.D)
            .forEach { codice ->
                assertTrue("manca il blocco $codice", scheda.tratti.any { it.codice == codice && it.metri >= 100 })
            }
    }
}
