package com.mattia.nuotoparalimpico.domain

import com.mattia.nuotoparalimpico.data.Atleta
import com.mattia.nuotoparalimpico.data.CondizioneMedica
import com.mattia.nuotoparalimpico.data.ContestoTempo
import com.mattia.nuotoparalimpico.data.FaseMesociclo
import com.mattia.nuotoparalimpico.data.Stile
import com.mattia.nuotoparalimpico.data.Tempo
import com.mattia.nuotoparalimpico.data.TipoMicrociclo
import java.time.LocalDate
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
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

    @Test
    fun riferimentoPreferisceIlLiberoEUsaLaVascaDelTempoSelezionato() {
        val oggi = LocalDate.of(2026, 6, 1)
        val atleta = Atleta(id = 9, nome = "Ada", cognome = "Verdi")
        val scheda = GeneratoreSmartSeduta.genera(
            data = oggi,
            metriTarget = 3000,
            fase = FaseMesociclo.PREPARAZIONE_SPECIFICA,
            tipoMicro = TipoMicrociclo.CARICO,
            atleta = atleta,
            tempi = listOf(
                tempo(atleta.id, oggi, Stile.STILE_LIBERO, 5200, vasca = 50),
                tempo(atleta.id, oggi, Stile.DORSO, 4500, vasca = 25)
            ),
            vascaMetri = 25
        )

        assertEquals(Stile.STILE_LIBERO, scheda.tempiUtilizzati.single().stile)
        assertEquals(50, scheda.tempiUtilizzati.single().vascaMetri)
        assertFalse(scheda.riferimentoTempoFallback)
    }

    @Test
    fun riferimentoAlternativoAllaMancanzaDelLiberoEMarcatoEUsaUnaSolaVasca() {
        val oggi = LocalDate.of(2026, 6, 1)
        val atleta = Atleta(id = 11, nome = "Luca", cognome = "Neri")
        val scheda = GeneratoreSmartSeduta.genera(
            data = oggi,
            metriTarget = 3000,
            fase = FaseMesociclo.PREPARAZIONE_SPECIFICA,
            tipoMicro = TipoMicrociclo.CARICO,
            atleta = atleta,
            tempi = listOf(
                tempo(atleta.id, oggi, Stile.DORSO, 5200, vasca = 50),
                tempo(atleta.id, oggi, Stile.RANA, 5000, vasca = 25)
            ),
            vascaMetri = 50
        )

        assertTrue(scheda.riferimentoTempoFallback)
        assertEquals(Stile.RANA, scheda.tempiUtilizzati.single().stile)
        assertEquals(25, scheda.tempiUtilizzati.single().vascaMetri)
    }

    @Test
    fun testoCondivisibileEscludeNomeCategoriaEDescrizioneClinica() {
        val atleta = Atleta(
            id = 13,
            nome = "Marta",
            cognome = "Rossi",
            dataNascita = LocalDate.of(2000, 1, 1)
        )
        val descrizioneClinica = "Sclerosi multipla - dettaglio riservato"
        val scheda = GeneratoreSmartSeduta.genera(
            data = LocalDate.of(2026, 6, 1),
            metriTarget = 3000,
            fase = FaseMesociclo.PREPARAZIONE_SPECIFICA,
            tipoMicro = TipoMicrociclo.CARICO,
            atleta = atleta,
            condizioniMediche = listOf(
                CondizioneMedica(
                    atletaId = atleta.id,
                    descrizione = descrizioneClinica,
                    limitazioni = "Monitorare la fatica"
                )
            )
        )

        val testo = scheda.testoCondivisibile()

        assertTrue(testo.contains("Scheda individuale"))
        assertTrue(testo.contains("Ripartenza"))
        assertFalse(testo.contains(atleta.nome))
        assertFalse(testo.contains(atleta.cognome))
        assertFalse(testo.contains(descrizioneClinica))
        assertFalse(testo.contains(scheda.categoriaEta.orEmpty()))
    }

    private fun tempo(
        atletaId: Long,
        data: LocalDate,
        stile: Stile,
        centesimi: Int,
        vasca: Int
    ) = Tempo(
        atletaId = atletaId,
        data = data,
        stile = stile,
        distanzaMetri = 100,
        centesimi = centesimi,
        contesto = ContestoTempo.GARA,
        vascaMetri = vasca
    )
}
