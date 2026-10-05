package com.mattia.nuotoparalimpico.data.repository

import com.mattia.nuotoparalimpico.data.Assenza
import com.mattia.nuotoparalimpico.data.Atleta
import com.mattia.nuotoparalimpico.data.AtletaAttributo
import com.mattia.nuotoparalimpico.data.AtletaDao
import com.mattia.nuotoparalimpico.data.Chiusura
import com.mattia.nuotoparalimpico.data.CondizioneMedica
import com.mattia.nuotoparalimpico.data.Gara
import com.mattia.nuotoparalimpico.data.LogSeduta
import com.mattia.nuotoparalimpico.data.MacroGen
import com.mattia.nuotoparalimpico.data.Macrociclo
import com.mattia.nuotoparalimpico.data.Mesociclo
import com.mattia.nuotoparalimpico.data.Microciclo
import com.mattia.nuotoparalimpico.data.PianoDao
import com.mattia.nuotoparalimpico.data.RegistroDao
import com.mattia.nuotoparalimpico.data.Stagione
import com.mattia.nuotoparalimpico.data.Tempo
import java.time.LocalDate
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first

class AtletaRepository(private val dao: AtletaDao) {
    val atleti: Flow<List<Atleta>> = dao.osservaAtleti()
    val condizioni: Flow<List<CondizioneMedica>> = dao.osservaCondizioni()
    val assenze: Flow<List<Assenza>> = dao.osservaAssenze()
    val attributi: Flow<List<AtletaAttributo>> = dao.osservaAttributi()

    suspend fun leggiAtleti(): List<Atleta> = atleti.first()
    suspend fun leggiCondizioni(atletaId: Long): List<CondizioneMedica> =
        condizioni.first().filter { it.atletaId == atletaId }
    suspend fun leggiAssenze(atletaId: Long): List<Assenza> =
        assenze.first().filter { it.atletaId == atletaId }

    suspend fun aggiungi(a: Atleta) { dao.inserisci(a) }
    suspend fun aggiorna(a: Atleta) = dao.aggiorna(a)
    suspend fun elimina(a: Atleta) = dao.elimina(a)
    suspend fun aggiungiCondizione(c: CondizioneMedica) = dao.inserisciCondizione(c)
    suspend fun eliminaCondizione(c: CondizioneMedica) = dao.eliminaCondizione(c)
    suspend fun aggiungiAssenza(a: Assenza) = dao.inserisciAssenza(a)
    suspend fun eliminaAssenza(a: Assenza) = dao.eliminaAssenza(a)
    suspend fun aggiungiAttributo(a: AtletaAttributo) = dao.inserisciAttributo(a)
    suspend fun aggiornaAttributo(a: AtletaAttributo) = dao.aggiornaAttributo(a)
    suspend fun eliminaAttributo(a: AtletaAttributo) = dao.eliminaAttributo(a)

    fun osservaTempi(atletaId: Long): Flow<List<Tempo>> = dao.osservaTempi(atletaId)
    suspend fun leggiTempi(atletaId: Long): List<Tempo> = dao.leggiTempi(atletaId)
    suspend fun aggiungiTempo(t: Tempo) = dao.inserisciTempo(t)
    suspend fun eliminaTempo(t: Tempo) = dao.eliminaTempo(t)

    fun osservaLog(atletaId: Long): Flow<List<LogSeduta>> = dao.osservaLogSedute(atletaId)
    suspend fun leggiLog(atletaId: Long): List<LogSeduta> = dao.leggiLogSedute(atletaId)
    /** Una riga per atleta e giorno: a parità di data sostituisce. */
    suspend fun salvaLog(log: LogSeduta) = dao.inserisciLogSeduta(log)
    suspend fun aggiornaLog(log: LogSeduta) = dao.aggiornaLogSeduta(log)
}

class PianoRepository(private val dao: PianoDao) {
    val stagione: Flow<Stagione?> = dao.osservaStagione()
    suspend fun stagioneCorrente(): Stagione? = stagione.first()

    fun chiusure(stagioneId: Long): Flow<List<Chiusura>> = dao.osservaChiusure(stagioneId)
    fun gare(stagioneId: Long): Flow<List<Gara>> = dao.osservaGare(stagioneId)
    fun macro(stagioneId: Long): Flow<List<Macrociclo>> = dao.osservaMacro(stagioneId)
    fun meso(stagioneId: Long): Flow<List<Mesociclo>> = dao.osservaMeso(stagioneId)
    fun micro(stagioneId: Long): Flow<List<Microciclo>> = dao.osservaMicro(stagioneId)

    suspend fun leggiChiusure(stagioneId: Long): List<Chiusura> = dao.leggiChiusure(stagioneId)
    suspend fun leggiGare(stagioneId: Long): List<Gara> = dao.leggiGare(stagioneId)
    suspend fun leggiMicro(stagioneId: Long): List<Microciclo> = dao.leggiMicro(stagioneId)
    suspend fun leggiMeso(stagioneId: Long): List<Mesociclo> = dao.osservaMeso(stagioneId).first()

    suspend fun creaStagione(nome: String, inizio: LocalDate, fine: LocalDate) {
        dao.inserisciStagione(Stagione(nome = nome, inizio = inizio, fine = fine))
    }
    suspend fun eliminaStagione(s: Stagione) = dao.eliminaStagione(s)
    suspend fun aggiungiChiusura(c: Chiusura) = dao.inserisciChiusura(c)
    suspend fun aggiungiChiusure(c: List<Chiusura>) = dao.inserisciChiusure(c)
    suspend fun eliminaChiusura(c: Chiusura) = dao.eliminaChiusura(c)
    suspend fun aggiungiGara(g: Gara) = dao.inserisciGara(g)
    suspend fun eliminaGara(g: Gara) = dao.eliminaGara(g)
    suspend fun aggiornaMicro(m: Microciclo) = dao.aggiornaMicro(m)
    suspend fun salvaPiano(stagioneId: Long, piano: List<MacroGen>) = dao.salvaPiano(stagioneId, piano)
}

class RegistroRepository(private val dao: RegistroDao, private val atletaDao: AtletaDao) {
    val tempi: Flow<List<Tempo>> = dao.osservaTempi()
    val log: Flow<List<LogSeduta>> = dao.osservaLog()

    suspend fun aggiungiTempo(t: Tempo) = atletaDao.inserisciTempo(t)
    suspend fun eliminaTempo(t: Tempo) = atletaDao.eliminaTempo(t)
    suspend fun salvaSeduta(data: LocalDate, righe: List<LogSeduta>) = dao.salvaSeduta(data, righe)
}