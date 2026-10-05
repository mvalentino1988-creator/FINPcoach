package com.mattia.nuotoparalimpico.ui

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.mattia.nuotoparalimpico.NuotoParalimpicoApp
import com.mattia.nuotoparalimpico.data.Assenza
import com.mattia.nuotoparalimpico.data.Atleta
import com.mattia.nuotoparalimpico.data.AtletaAttributo
import com.mattia.nuotoparalimpico.data.Chiusura
import com.mattia.nuotoparalimpico.data.CondizioneMedica
import com.mattia.nuotoparalimpico.data.Gara
import com.mattia.nuotoparalimpico.data.LivelloGara
import com.mattia.nuotoparalimpico.data.LogSeduta
import com.mattia.nuotoparalimpico.data.Macrociclo
import com.mattia.nuotoparalimpico.data.Mesociclo
import com.mattia.nuotoparalimpico.data.Microciclo
import com.mattia.nuotoparalimpico.data.Stagione
import com.mattia.nuotoparalimpico.data.Tempo
import com.mattia.nuotoparalimpico.domain.Avviso
import com.mattia.nuotoparalimpico.domain.Festivita
import com.mattia.nuotoparalimpico.domain.ParametriPiano
import com.mattia.nuotoparalimpico.domain.PianoValidator
import com.mattia.nuotoparalimpico.domain.SchedaSeduta
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

    private val c = (app as NuotoParalimpicoApp).container
    private val atletiRepo = c.atleti
    private val pianoRepo = c.piano

    private fun <T> stato(flow: Flow<T>, iniziale: T): StateFlow<T> =
        flow.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), iniziale)

    private fun <T> perStagione(f: (Long) -> Flow<List<T>>): StateFlow<List<T>> =
        stato(
            stagione.flatMapLatest { s -> if (s == null) flowOf(emptyList<T>()) else f(s.id) },
            emptyList<T>()
        )

    // ---------- Atleti ----------
    val atleti: StateFlow<List<Atleta>> = stato(atletiRepo.atleti, emptyList())
    val condizioni: StateFlow<List<CondizioneMedica>> = stato(atletiRepo.condizioni, emptyList())
    val assenze: StateFlow<List<Assenza>> = stato(atletiRepo.assenze, emptyList())
    val attributi: StateFlow<List<AtletaAttributo>> = stato(atletiRepo.attributi, emptyList())

    fun aggiungiAtleta(a: Atleta) { viewModelScope.launch { atletiRepo.aggiungi(a) } }
    fun aggiornaAtleta(a: Atleta) { viewModelScope.launch { atletiRepo.aggiorna(a) } }
    fun eliminaAtleta(a: Atleta) {
        viewModelScope.launch { atletiRepo.elimina(a) }
        synchronized(cacheTempi) { cacheTempi.remove(a.id) }
        synchronized(cacheLog) { cacheLog.remove(a.id) }
    }
    fun aggiungiCondizione(x: CondizioneMedica) { viewModelScope.launch { atletiRepo.aggiungiCondizione(x) } }
    fun eliminaCondizione(x: CondizioneMedica) { viewModelScope.launch { atletiRepo.eliminaCondizione(x) } }
    fun aggiungiAssenza(a: Assenza) { viewModelScope.launch { atletiRepo.aggiungiAssenza(a) } }
    fun eliminaAssenza(a: Assenza) { viewModelScope.launch { atletiRepo.eliminaAssenza(a) } }
    fun aggiungiAttributo(a: AtletaAttributo) { viewModelScope.launch { atletiRepo.aggiungiAttributo(a) } }
    fun aggiornaAttributo(a: AtletaAttributo) { viewModelScope.launch { atletiRepo.aggiornaAttributo(a) } }
    fun eliminaAttributo(a: AtletaAttributo) { viewModelScope.launch { atletiRepo.eliminaAttributo(a) } }

    // ---------- Tempi e Log ----------
    private val cacheTempi = HashMap<Long, StateFlow<List<Tempo>>>()
    private val cacheLog = HashMap<Long, StateFlow<List<LogSeduta>>>()

    fun osservaTempi(atletaId: Long): Flow<List<Tempo>> =
        synchronized(cacheTempi) {
            cacheTempi.getOrPut(atletaId) { stato(atletiRepo.osservaTempi(atletaId), emptyList()) }
        }

    fun osservaLogSedute(atletaId: Long): Flow<List<LogSeduta>> =
        synchronized(cacheLog) {
            cacheLog.getOrPut(atletaId) { stato(atletiRepo.osservaLog(atletaId), emptyList()) }
        }

    fun aggiungiTempo(t: Tempo) { viewModelScope.launch { atletiRepo.aggiungiTempo(t) } }
    fun eliminaTempo(t: Tempo) { viewModelScope.launch { atletiRepo.eliminaTempo(t) } }
    fun inserisciLogSeduta(l: LogSeduta) { viewModelScope.launch { atletiRepo.salvaLog(l) } }
    fun aggiornaLogSeduta(l: LogSeduta) { viewModelScope.launch { atletiRepo.aggiornaLog(l) } }

    suspend fun leggiTempi(atletaId: Long): List<Tempo> = atletiRepo.leggiTempi(atletaId)
    suspend fun leggiLogSedute(atletaId: Long): List<LogSeduta> = atletiRepo.leggiLog(atletaId)

    /** Importa tempi da testo saltando i duplicati; [onFine] riceve quanti ne ha salvati. */
    fun importaTempi(atletaId: Long, testo: String, vascaMetri: Int = 25, onFine: (Int) -> Unit = {}) {
        viewModelScope.launch { onFine(c.importaTempi(atletaId, testo, LocalDate.now(), vascaMetri)) }
    }

    /** Scheda per data: di squadra (atletaId null) o personalizzata. */
    suspend fun generaScheda(data: LocalDate, atletaId: Long? = null, metriManuali: Int? = null): SchedaSeduta =
        c.generaSeduta(data, atletaId, metriManuali)

    // ---------- Stagione e piano ----------
    val stagione: StateFlow<Stagione?> = stato(pianoRepo.stagione, null)
    val chiusure: StateFlow<List<Chiusura>> = perStagione<Chiusura> { pianoRepo.chiusure(it) }
    val gare: StateFlow<List<Gara>> = perStagione<Gara> { pianoRepo.gare(it) }
    val macro: StateFlow<List<Macrociclo>> = perStagione<Macrociclo> { pianoRepo.macro(it) }
    val meso: StateFlow<List<Mesociclo>> = perStagione<Mesociclo> { pianoRepo.meso(it) }
    val micro: StateFlow<List<Microciclo>> = perStagione<Microciclo> { pianoRepo.micro(it) }

    val avvisiPiano: StateFlow<List<Avviso>> = stato(
        combine(stagione, micro, gare) { s, m, g ->
            if (s == null || m.isEmpty()) emptyList() else PianoValidator.valida(s, m, g)
        },
        emptyList()
    )

    fun creaStagione(nome: String, inizio: LocalDate, fine: LocalDate) {
        viewModelScope.launch { pianoRepo.creaStagione(nome, inizio, fine) }
    }

    fun eliminaStagione() {
        viewModelScope.launch { pianoRepo.stagioneCorrente()?.let { pianoRepo.eliminaStagione(it) } }
    }

    fun aggiungiChiusura(dal: LocalDate, al: LocalDate, motivo: String) {
        viewModelScope.launch {
            val s = pianoRepo.stagioneCorrente() ?: return@launch
            pianoRepo.aggiungiChiusura(Chiusura(stagioneId = s.id, dal = dal, al = al, motivo = motivo))
        }
    }

    fun eliminaChiusura(x: Chiusura) { viewModelScope.launch { pianoRepo.eliminaChiusura(x) } }

    fun aggiungiFestivitaNazionali() {
        viewModelScope.launch {
            val s = pianoRepo.stagioneCorrente() ?: return@launch
            val giaPresenti = pianoRepo.leggiChiusure(s.id).map { it.dal }.toSet()
            val nuove = Festivita.perStagione(s).filter { it.dal !in giaPresenti }
            if (nuove.isNotEmpty()) pianoRepo.aggiungiChiusure(nuove)
        }
    }

    fun aggiungiGara(
        nome: String,
        dal: LocalDate,
        al: LocalDate,
        prioritaria: Boolean,
        livello: LivelloGara = LivelloGara.ALTRO,
        distanze: String = ""
    ) {
        viewModelScope.launch {
            val s = pianoRepo.stagioneCorrente() ?: return@launch
            pianoRepo.aggiungiGara(
                Gara(
                    stagioneId = s.id, nome = nome, dal = dal, al = al,
                    prioritaria = prioritaria, livello = livello, distanze = distanze
                )
            )
        }
    }

    fun eliminaGara(g: Gara) { viewModelScope.launch { pianoRepo.eliminaGara(g) } }

    fun generaPiano(parametri: ParametriPiano) { viewModelScope.launch { c.generaPiano(parametri) } }

    /** Salva una modifica manuale: la settimana viene marcata come bloccata. */
    fun modificaMicro(m: Microciclo) { viewModelScope.launch { pianoRepo.aggiornaMicro(m.copy(bloccato = true)) } }

    /** La settimana torna automatica: verrà ricalcolata alla prossima rigenerazione. */
    fun sbloccaMicro(m: Microciclo) { viewModelScope.launch { pianoRepo.aggiornaMicro(m.copy(bloccato = false)) } }
}