package com.mattia.nuotoparalimpico.ui

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.mattia.nuotoparalimpico.data.AppDatabase
import com.mattia.nuotoparalimpico.data.Assenza
import com.mattia.nuotoparalimpico.data.Atleta
import com.mattia.nuotoparalimpico.data.Chiusura
import com.mattia.nuotoparalimpico.data.CondizioneMedica
import com.mattia.nuotoparalimpico.data.Gara
import com.mattia.nuotoparalimpico.data.LogSeduta
import com.mattia.nuotoparalimpico.data.Macrociclo
import com.mattia.nuotoparalimpico.data.Mesociclo
import com.mattia.nuotoparalimpico.data.Microciclo
import com.mattia.nuotoparalimpico.data.Stagione
import com.mattia.nuotoparalimpico.data.Tempo
import com.mattia.nuotoparalimpico.domain.Avviso
import com.mattia.nuotoparalimpico.domain.Calendario
import com.mattia.nuotoparalimpico.domain.Festivita
import com.mattia.nuotoparalimpico.domain.ParametriPiano
import com.mattia.nuotoparalimpico.domain.PianoGenerator
import com.mattia.nuotoparalimpico.domain.PianoValidator
import java.time.LocalDate
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

@OptIn(ExperimentalCoroutinesApi::class)
class MainViewModel(app: Application) : AndroidViewModel(app) {

    private val db = AppDatabase.get(app)
    private val atletaDao = db.atletaDao()
    private val pianoDao = db.pianoDao()

    private fun <T> stato(flow: Flow<T>, iniziale: T): StateFlow<T> =
        flow.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), iniziale)

    private fun <T> perStagione(f: (Long) -> Flow<List<T>>): StateFlow<List<T>> =
        stato(
            stagione.flatMapLatest { s -> if (s == null) flowOf(emptyList<T>()) else f(s.id) },
            emptyList<T>()
        )

    /** Legge la stagione direttamente dal database, senza dipendere dagli osservatori della UI. */
    private suspend fun stagioneCorrente(): Stagione? = pianoDao.osservaStagione().first()

    // ---------- Atleti ----------
    val atleti: StateFlow<List<Atleta>> = stato(atletaDao.osservaAtleti(), emptyList())
    val condizioni: StateFlow<List<CondizioneMedica>> = stato(atletaDao.osservaCondizioni(), emptyList())
    val assenze: StateFlow<List<Assenza>> = stato(atletaDao.osservaAssenze(), emptyList())

    fun aggiungiAtleta(a: Atleta) { viewModelScope.launch { atletaDao.inserisci(a) } }
    fun aggiornaAtleta(a: Atleta) { viewModelScope.launch { atletaDao.aggiorna(a) } }
    fun eliminaAtleta(a: Atleta) { viewModelScope.launch { atletaDao.elimina(a) } }
    fun aggiungiCondizione(c: CondizioneMedica) { viewModelScope.launch { atletaDao.inserisciCondizione(c) } }
    fun eliminaCondizione(c: CondizioneMedica) { viewModelScope.launch { atletaDao.eliminaCondizione(c) } }
    fun aggiungiAssenza(a: Assenza) { viewModelScope.launch { atletaDao.inserisciAssenza(a) } }
    fun eliminaAssenza(a: Assenza) { viewModelScope.launch { atletaDao.eliminaAssenza(a) } }

    // ---------- Tempi e Log ----------
    // I Flow vengono creati una volta sola per atleta: se la UI ne chiedesse uno nuovo a ogni
    // ricomposizione, collectAsStateWithLifecycle ripartirebbe da capo ogni volta.
    private val cacheTempi = mutableMapOf<Long, Flow<List<Tempo>>>()
    private val cacheLog = mutableMapOf<Long, Flow<List<LogSeduta>>>()

    fun osservaTempi(atletaId: Long): Flow<List<Tempo>> =
        cacheTempi.getOrPut(atletaId) { atletaDao.osservaTempi(atletaId) }

    fun osservaLogSedute(atletaId: Long): Flow<List<LogSeduta>> =
        cacheLog.getOrPut(atletaId) { atletaDao.osservaLogSedute(atletaId) }

    fun aggiungiTempo(tempo: Tempo) { viewModelScope.launch { atletaDao.inserisciTempo(tempo) } }
    fun eliminaTempo(tempo: Tempo) { viewModelScope.launch { atletaDao.eliminaTempo(tempo) } }
    fun inserisciLogSeduta(log: LogSeduta) { viewModelScope.launch { atletaDao.inserisciLogSeduta(log) } }
    fun aggiornaLogSeduta(log: LogSeduta) { viewModelScope.launch { atletaDao.aggiornaLogSeduta(log) } }

    suspend fun leggiTempi(atletaId: Long): List<Tempo> = atletaDao.leggiTempi(atletaId)
    suspend fun leggiLogSedute(atletaId: Long): List<LogSeduta> = atletaDao.leggiLogSedute(atletaId)

    // ---------- Stagione e piano ----------
    val stagione: StateFlow<Stagione?> = stato(pianoDao.osservaStagione(), null)
    val chiusure: StateFlow<List<Chiusura>> = perStagione<Chiusura> { pianoDao.osservaChiusure(it) }
    val gare: StateFlow<List<Gara>> = perStagione<Gara> { pianoDao.osservaGare(it) }
    val macro: StateFlow<List<Macrociclo>> = perStagione<Macrociclo> { pianoDao.osservaMacro(it) }
    val meso: StateFlow<List<Mesociclo>> = perStagione<Mesociclo> { pianoDao.osservaMeso(it) }
    val micro: StateFlow<List<Microciclo>> = perStagione<Microciclo> { pianoDao.osservaMicro(it) }

    val avvisiPiano: StateFlow<List<Avviso>> = stato(
        combine(stagione, micro, gare) { s, m, g ->
            if (s == null || m.isEmpty()) emptyList() else PianoValidator.valida(s, m, g)
        },
        emptyList()
    )

    fun creaStagione(nome: String, inizio: LocalDate, fine: LocalDate) {
        viewModelScope.launch {
            pianoDao.inserisciStagione(Stagione(nome = nome, inizio = inizio, fine = fine))
        }
    }

    fun eliminaStagione() {
        viewModelScope.launch { stagioneCorrente()?.let { pianoDao.eliminaStagione(it) } }
    }

    fun aggiungiChiusura(dal: LocalDate, al: LocalDate, motivo: String) {
        viewModelScope.launch {
            val s = stagioneCorrente() ?: return@launch
            pianoDao.inserisciChiusura(Chiusura(stagioneId = s.id, dal = dal, al = al, motivo = motivo))
        }
    }

    fun eliminaChiusura(c: Chiusura) { viewModelScope.launch { pianoDao.eliminaChiusura(c) } }

    fun aggiungiFestivitaNazionali() {
        viewModelScope.launch {
            val s = stagioneCorrente() ?: return@launch
            val giaPresenti = pianoDao.leggiChiusure(s.id).map { it.dal }.toSet()
            val nuove = Festivita.perStagione(s).filter { it.dal !in giaPresenti }
            if (nuove.isNotEmpty()) pianoDao.inserisciChiusure(nuove)
        }
    }

    fun aggiungiGara(nome: String, dal: LocalDate, al: LocalDate, prioritaria: Boolean) {
        viewModelScope.launch {
            val s = stagioneCorrente() ?: return@launch
            pianoDao.inserisciGara(
                Gara(stagioneId = s.id, nome = nome, dal = dal, al = al, prioritaria = prioritaria)
            )
        }
    }

    fun eliminaGara(g: Gara) { viewModelScope.launch { pianoDao.eliminaGara(g) } }

    /**
     * Rigenera il piano. Le settimane modificate a mano (bloccate) mantengono i valori scelti,
     * agganciate alla data di inizio della settimana. I giorni di allenamento scelti vengono
     * salvati nella stagione, così il calendario sa in quali giorni c'è seduta.
     */
    fun generaPiano(parametri: ParametriPiano) {
        viewModelScope.launch {
            val s = stagioneCorrente() ?: return@launch
            val chiusureAttuali = pianoDao.leggiChiusure(s.id)
            val gareAttuali = pianoDao.leggiGare(s.id)
            val bloccati = pianoDao.leggiMicro(s.id).filter { it.bloccato }.associateBy { it.inizio }

            val piano = PianoGenerator.genera(s, chiusureAttuali, gareAttuali, parametri).map { macroGen ->
                macroGen.copy(
                    meso = macroGen.meso.map { mesoGen ->
                        mesoGen.copy(
                            micro = mesoGen.micro.map { mi ->
                                val vecchio = bloccati[mi.inizio]
                                if (vecchio == null) mi else mi.copy(
                                    tipo = vecchio.tipo,
                                    sedutePreviste = vecchio.sedutePreviste,
                                    volumeTargetMetri = vecchio.volumeTargetMetri,
                                    note = vecchio.note,
                                    bloccato = true
                                )
                            }
                        )
                    }
                )
            }
            pianoDao.salvaPiano(s.id, piano)
            pianoDao.aggiornaStagione(s.copy(giorniAllenamento = Calendario.maschera(parametri.giorniAllenamento)))
        }
    }

    /** Salva una modifica manuale: la settimana viene marcata come bloccata. */
    fun modificaMicro(m: Microciclo) { viewModelScope.launch { pianoDao.aggiornaMicro(m.copy(bloccato = true)) } }

    /** La settimana torna automatica: verrà ricalcolata alla prossima rigenerazione. */
    fun sbloccaMicro(m: Microciclo) { viewModelScope.launch { pianoDao.aggiornaMicro(m.copy(bloccato = false)) } }
}