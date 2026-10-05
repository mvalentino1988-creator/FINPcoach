package com.mattia.nuotoparalimpico

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.List
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.mattia.nuotoparalimpico.ui.AtletiScreen
import com.mattia.nuotoparalimpico.ui.MainViewModel
import com.mattia.nuotoparalimpico.ui.PianoScreen
import com.mattia.nuotoparalimpico.ui.RegistroScreen
import com.mattia.nuotoparalimpico.ui.RegistroViewModel
import com.mattia.nuotoparalimpico.ui.RegolamentiScreen
import com.mattia.nuotoparalimpico.ui.SchedeVascaScreen
import com.mattia.nuotoparalimpico.ui.TempiRipartenzeScreen
import com.mattia.nuotoparalimpico.ui.theme.NuotoParalimpicoTheme

class MainActivity : ComponentActivity() {

    private val viewModel: MainViewModel by viewModels()
    private val registroViewModel: RegistroViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            NuotoParalimpicoTheme {
                AppRoot(viewModel, registroViewModel)
            }
        }
    }
}

@Composable
private fun AppRoot(vm: MainViewModel, rvm: RegistroViewModel) {
    var tab by rememberSaveable { mutableIntStateOf(0) }
    Scaffold(
        bottomBar = {
            NavigationBar {
                NavigationBarItem(
                    selected = tab == 0,
                    onClick = { tab = 0 },
                    icon = { Icon(Icons.Filled.Person, contentDescription = "Atleti") },
                    label = { Text("Atleti") }
                )
                NavigationBarItem(
                    selected = tab == 1,
                    onClick = { tab = 1 },
                    icon = { Icon(Icons.Filled.DateRange, contentDescription = "Piano") },
                    label = { Text("Piano") }
                )
                NavigationBarItem(
                    selected = tab == 2,
                    onClick = { tab = 2 },
                    icon = { Icon(Icons.Filled.List, contentDescription = "Allenamento: schede, tempi, registro") },
                    label = { Text("Allenamento") }
                )
                NavigationBarItem(
                    selected = tab == 3,
                    onClick = { tab = 3 },
                    icon = { Icon(Icons.Filled.Info, contentDescription = "Regolamenti") },
                    label = { Text("Regolamenti") }
                )
            }
        }
    ) { padding ->
        Box(Modifier.padding(padding).statusBarsPadding()) {
            when (tab) {
                0 -> AtletiScreen(vm)
                1 -> PianoScreen(vm)
                2 -> AllenamentoHub(vm, rvm)
                else -> RegolamentiScreen(vm)
            }
        }
    }
}

/** Raggruppa Scheda del giorno, Tempi e ritmi, Registro: stesse schermate di prima, una sola voce nella barra. */
@Composable
private fun AllenamentoHub(vm: MainViewModel, rvm: RegistroViewModel) {
    var sotto by rememberSaveable { mutableIntStateOf(0) }
    Column(Modifier.fillMaxSize()) {
        Row(
            Modifier.horizontalScroll(rememberScrollState()).padding(horizontal = 16.dp, vertical = 6.dp),
            horizontalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            listOf("Scheda del giorno", "Tempi e ritmi", "Registro").forEachIndexed { i, titolo ->
                FilterChip(selected = sotto == i, onClick = { sotto = i }, label = { Text(titolo) })
            }
        }
        Box(Modifier.weight(1f)) {
            when (sotto) {
                0 -> SchedeVascaScreen(vm)
                1 -> TempiRipartenzeScreen(vm)
                else -> RegistroScreen(vm, rvm)
            }
        }
    }
}