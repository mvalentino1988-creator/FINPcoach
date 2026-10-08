package com.mattia.nuotoparalimpico.domain

import com.mattia.nuotoparalimpico.data.Gara
import com.mattia.nuotoparalimpico.data.Microciclo
import com.mattia.nuotoparalimpico.data.Stagione
import com.mattia.nuotoparalimpico.data.TipoMicrociclo
import java.time.LocalDate
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class PianoGeneratorTest {

    // 14/09/2026 è un lunedì
    private val stagione = Stagione(nome = "26/27", inizio = LocalDate.of(2026, 9, 14), fine = LocalDate.of(2027, 6, 13))

    private fun micro(gare: List<Gara>): List<Microciclo> =
        PianoGenerator.genera(stagione, emptyList(), gare, ParametriPiano())
            .flatMap { it.meso }
            .flatMap { it.micro }

    private fun tipoDella(lista: List<Microciclo>, lunedi: LocalDate): TipoMicrociclo =
        lista.first { it.inizio == lunedi }.tipo

    @Test
    fun senzaGareMaiPiuDiTreSettimaneDiCaricoConsecutive() {
        var massimo = 0
        var corrente = 0
        for (m in micro(emptyList())) {
            if (m.tipo == TipoMicrociclo.CARICO) {
                corrente++
                massimo = maxOf(massimo, corrente)
            } else {
                corrente = 0
            }
        }
        assertTrue("carico consecutivo: $massimo", massimo in 1..3)
    }

    @Test
    fun garaPrioritariaHaTaperingGaraERecupero() {
        val gara = Gara(
            stagioneId = 0, nome = "Assoluti",
            dal = LocalDate.of(2027, 5, 15), al = LocalDate.of(2027, 5, 15), prioritaria = true
        )
        val lista = micro(listOf(gara))
        assertEquals(TipoMicrociclo.SCARICO, tipoDella(lista, LocalDate.of(2027, 5, 3)))
        assertEquals(TipoMicrociclo.GARA, tipoDella(lista, LocalDate.of(2027, 5, 10)))
        assertEquals(TipoMicrociclo.RECUPERO, tipoDella(lista, LocalDate.of(2027, 5, 17)))
    }

    @Test
    fun laPrimaSettimanaEDiAdattamento() {
        assertEquals(TipoMicrociclo.ADATTAMENTO, micro(emptyList()).first().tipo)
    }

    @Test
    fun macroEMesoRestanoEntroLeDateDellaStagione() {
        val macro = PianoGenerator.genera(stagione, emptyList(), emptyList(), ParametriPiano(numeroMacrocicli = 2))
        assertEquals(2, macro.size)
        assertTrue(macro.all { !it.macro.inizio.isBefore(stagione.inizio) && !it.macro.fine.isAfter(stagione.fine) })
        assertTrue(macro.flatMap { it.meso }.all {
            !it.meso.inizio.isBefore(stagione.inizio) && !it.meso.fine.isAfter(stagione.fine)
        })
    }
}