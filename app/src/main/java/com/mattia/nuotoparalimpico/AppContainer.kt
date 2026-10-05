package com.mattia.nuotoparalimpico

import android.app.Application
import com.mattia.nuotoparalimpico.data.AppDatabase
import com.mattia.nuotoparalimpico.data.repository.AtletaRepository
import com.mattia.nuotoparalimpico.data.repository.PianoRepository
import com.mattia.nuotoparalimpico.data.repository.RegistroRepository
import com.mattia.nuotoparalimpico.domain.usecase.CalcolaCaricoAtletaUseCase
import com.mattia.nuotoparalimpico.domain.usecase.GeneraPianoUseCase
import com.mattia.nuotoparalimpico.domain.usecase.GeneraSedutaUseCase
import com.mattia.nuotoparalimpico.domain.usecase.ImportaTempiUseCase
import com.mattia.nuotoparalimpico.domain.usecase.SalvaSedutaUseCase

class AppContainer(app: Application) {
    private val db = AppDatabase.get(app)

    val atleti = AtletaRepository(db.atletaDao())
    val piano = PianoRepository(db.pianoDao())
    val registro = RegistroRepository(db.registroDao(), db.atletaDao())

    val generaPiano = GeneraPianoUseCase(piano)
    val generaSeduta = GeneraSedutaUseCase(atleti, piano)
    val salvaSeduta = SalvaSedutaUseCase(registro)
    val calcolaCarico = CalcolaCaricoAtletaUseCase()
    val importaTempi = ImportaTempiUseCase(atleti)
}