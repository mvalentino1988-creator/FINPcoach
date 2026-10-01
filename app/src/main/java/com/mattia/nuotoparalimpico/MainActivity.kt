package com.mattia.nuotoparalimpico

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.List
import androidx.compose.material.icons.filled.Person
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
import com.mattia.nuotoparalimpico.ui.AtletiScreen
import com.mattia.nuotoparalimpico.ui.MainViewModel
import com.mattia.nuotoparalimpico.ui.PianoScreen
import com.mattia.nuotoparalimpico.ui.RegistroScreen
import com.mattia.nuotoparalimpico.ui.RegistroViewModel
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
                    icon = { Icon(Icons.Filled.List, contentDescription = "Schede Vasca") },
                    label = { Text("Schede") }
                )
                NavigationBarItem(
                    selected = tab == 3,
                    onClick = { tab = 3 },
                    icon = { Icon(Icons.Filled.Edit, contentDescription = "Tempi") },
                    label = { Text("Tempi") }
                )
                NavigationBarItem(
                    selected = tab == 4,
                    onClick = { tab = 4 },
                    icon = { Icon(Icons.Filled.CheckCircle, contentDescription = "Registro") },
                    label = { Text("Registro") }
                )
            }
        }
    ) { padding ->
        Box(Modifier.padding(padding).statusBarsPadding()) {
            when (tab) {
                0 -> AtletiScreen(vm)
                1 -> PianoScreen(vm)
                2 -> SchedeVascaScreen(vm)
                3 -> TempiRipartenzeScreen(vm)
                else -> RegistroScreen(vm, rvm)
            }
        }
    }
}
