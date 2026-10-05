package com.mattia.nuotoparalimpico

import android.app.Application

class NuotoParalimpicoApp : Application() {
    val container: AppContainer by lazy { AppContainer(this) }
}