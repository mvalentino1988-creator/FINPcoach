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
import com.mattia.nuotoparalimpico.data.Macrociclo
import com.mattia.nuotoparalimpico.data.Mesociclo
import com.mattia.nuotoparalimpico.data.Microciclo
import com.mattia.nuotoparalimpico.data.Stagione
import com.mattia.nuotoparalimpico.domain.Avviso
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
        val s = stagione.value ?: return
        viewModelScope.launch { pianoDao.eliminaStagione(s) }
    }

    fun aggiungiChiusura(dal: LocalDate, al: LocalDate, motivo: String) {
        val s = stagione.value ?: return
        viewModelScope.launch {
            pianoDao.inserisciChiusura(Chiusura(stagioneId = s.id, dal = dal, al = al, motivo = motivo))
        }
    }

    fun eliminaChiusura(c: Chiusura) { viewModelScope.launch { pianoDao.eliminaChiusura(c) } }

    fun aggiungiFestivitaNazionali() {
        val s = stagione.value ?: return
        val giaPresenti = chiusure.value.map { it.dal }.toSet()
        val nuove = Festivita.perStagione(s).filter { it.dal !in giaPresenti }
        if (nuove.isEmpty()) return
        viewModelScope.launch { pianoDao.inserisciChiusure(nuove) }
    }

    fun aggiungiGara(nome: String, dal: LocalDate, al: LocalDate, prioritaria: Boolean) {
        val s = stagione.value ?: return
        viewModelScope.launch {
            pianoDao.inserisciGara(
                Gara(stagioneId = s.id, nome = nome, dal = dal, al = al, prioritaria = prioritaria)
            )
        }
    }

    fun eliminaGara(g: Gara) { viewModelScope.launch { pianoDao.eliminaGara(g) } }

    fun generaPiano(parametri: ParametriPiano) {
        val s = stagione.value ?: return
        val piano = PianoGenerator.genera(s, chiusure.value, gare.value, parametri)
        viewModelScope.launch { pianoDao.salvaPiano(s.id, piano) }
    }
}
