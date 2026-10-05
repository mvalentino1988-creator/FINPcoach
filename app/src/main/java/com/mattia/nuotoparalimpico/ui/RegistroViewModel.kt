package com.mattia.nuotoparalimpico.ui

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.mattia.nuotoparalimpico.NuotoParalimpicoApp
import com.mattia.nuotoparalimpico.data.LogSeduta
import com.mattia.nuotoparalimpico.data.Tempo
import com.mattia.nuotoparalimpico.domain.usecase.RigaSedutaInput
import java.time.LocalDate
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

class RegistroViewModel(app: Application) : AndroidViewModel(app) {

    private val c = (app as NuotoParalimpicoApp).container

    val tempi: StateFlow<List<Tempo>> =
        c.registro.tempi.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    val log: StateFlow<List<LogSeduta>> =
        c.registro.log.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    fun aggiungiTempo(t: Tempo) { viewModelScope.launch { c.registro.aggiungiTempo(t) } }

    fun eliminaTempo(t: Tempo) { viewModelScope.launch { c.registro.eliminaTempo(t) } }

    /** Salva la seduta del giorno per tutti gli atleti; una seduta già registrata viene sostituita. */
    fun salvaSeduta(
        data: LocalDate,
        durataMin: Int,
        righe: List<RigaSedutaInput>,
        onErrori: (List<String>) -> Unit = {}
    ) {
        viewModelScope.launch {
            val errori = c.salvaSeduta(data, durataMin, righe)
            if (errori.isNotEmpty()) onErrori(errori)
        }
    }
}