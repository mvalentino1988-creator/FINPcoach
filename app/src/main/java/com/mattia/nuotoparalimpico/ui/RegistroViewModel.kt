package com.mattia.nuotoparalimpico.ui

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.mattia.nuotoparalimpico.data.AppDatabase
import com.mattia.nuotoparalimpico.data.LogSeduta
import com.mattia.nuotoparalimpico.data.Tempo
import java.time.LocalDate
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

class RegistroViewModel(app: Application) : AndroidViewModel(app) {

    private val dao = AppDatabase.get(app).registroDao()

    val tempi: StateFlow<List<Tempo>> =
        dao.osservaTempi().stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    val log: StateFlow<List<LogSeduta>> =
        dao.osservaLog().stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    fun aggiungiTempo(t: Tempo) { viewModelScope.launch { dao.inserisciTempo(t) } }

    fun eliminaTempo(t: Tempo) { viewModelScope.launch { dao.eliminaTempo(t) } }

    /** Salva la seduta del giorno per tutti gli atleti; una seduta già registrata viene sostituita. */
    fun salvaSeduta(data: LocalDate, righe: List<LogSeduta>) {
        viewModelScope.launch { dao.salvaSeduta(data, righe) }
    }
}
