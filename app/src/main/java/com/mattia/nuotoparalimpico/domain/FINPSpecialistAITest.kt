package com.mattia.nuotoparalimpico.domain

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class FINPSpecialistAITest {

    @Test
    fun nonScattaSuSottostringhe() {
        val t = FINPSpecialistAI.rilevaTag("radiografia di controllo", "nessuna")
        assertEquals(setOf(TagClinico.GENERICA), t)
    }

    @Test
    fun livelloCervicaleEDorsale() {
        assertTrue(TagClinico.MIDOLLARE_ALTO in FINPSpecialistAI.rilevaTag("lesione C5", ""))
        assertTrue(TagClinico.MIDOLLARE_DORSALE in FINPSpecialistAI.rilevaTag("lesione T6", ""))
        assertTrue(TagClinico.MIDOLLARE_LOMBARE in FINPSpecialistAI.rilevaTag("lesione L3", ""))
    }

    @Test
    fun ilTagPiuGraveDeterminaLaStima() {
        val r = FINPSpecialistAI.analizza("tetraplegia e scoliosi", "")
        assertEquals(2, r.stimaClassi.classeS)
        assertTrue(TagClinico.LIMITAZIONE_ARTICOLARE in r.tag)
        assertFalse(r.stimaClassi.motivazione.isBlank())
    }
}