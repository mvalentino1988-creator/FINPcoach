package com.mattia.nuotoparalimpico.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Home
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.mattia.nuotoparalimpico.data.Atleta
import com.mattia.nuotoparalimpico.domain.CalcoloRitmiRipartenze
import com.mattia.nuotoparalimpico.domain.LivelloAcwr
import com.mattia.nuotoparalimpico.domain.usecase.CaricoAtleta
import com.mattia.nuotoparalimpico.domain.usecase.CalcolaCaricoAtletaUseCase
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.temporal.TemporalAdjusters

private class RigaDashboard(
    val atleta: Atleta,
    val carico: CaricoAtleta,
    val assenteOggi: Boolean,
    val formCheck: Boolean
) {
    val priorita: Int
        get() = when {
            carico.affidabile && carico.livello == LivelloAcwr.RISCHIO -> 2
            carico.affidabile && carico.livello == LivelloAcwr.ATTENZIONE -> 1
            else -> 0
        }
}

@Composable
fun DashboardScreen(vm: MainViewModel, rvm: RegistroViewModel) {
    val atleti by vm.atleti.collectAsStateWithLifecycle()
    val assenze by vm.assenze.collectAsStateWithLifecycle()
    val micro by vm.micro.collectAsStateWithLifecycle()
    val meso by vm.meso.collectAsStateWithLifecycle()
    val log by rvm.log.collectAsStateWithLifecycle()
    val tempi by rvm.tempi.collectAsStateWithLifecycle()

    val oggi = remember { LocalDate.now() }
    val lunediOggi = remember { oggi.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)) }
    val calcolo = remember { CalcolaCaricoAtletaUseCase() }

    val righe = remember(atleti, assenze, micro, meso, log, tempi) {
        val mesoCorrente = micro.firstOrNull { !it.inizio.isAfter(oggi) && !it.fine.isBefore(oggi) }
            ?.let { mi -> meso.firstOrNull { it.id == mi.mesocicloId } }
        atleti.map { a ->
            val mieAssenze = assenze.filter { it.atletaId == a.id }
            RigaDashboard(
                atleta = a,
                carico = calcolo.calcola(a, log.filter { it.atletaId == a.id }, micro, mieAssenze, oggi),
                assenteOggi = mieAssenze.any { !oggi.isBefore(it.dal) && !oggi.isAfter(it.al) },
                formCheck = CalcoloRitmiRipartenze
                    .valutaNecessitaFormCheck(a, tempi.filter { it.atletaId == a.id }, emptyList(), mesoCorrente)
                    .necessario
            )
        }.sortedWith(compareByDescending<RigaDashboard> { it.priorita }.thenBy { it.atleta.cognome })
    }

    Column(
        Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        Titolo("Panoramica Squadra", Icons.Filled.Home)

        if (righe.isEmpty()) {
            Text("Nessun atleta inserito.")
            return@Column
        }

        Surface(
            color = MaterialTheme.colorScheme.primaryContainer,
            shape = RoundedCornerShape(16.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Row(
                Modifier.padding(14.dp).fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Riepilogo("Atleti", righe.size)
                Riepilogo("Carico a rischio", righe.count { it.priorita == 2 })
                Riepilogo("Assenti oggi", righe.count { it.assenteOggi })
                Riepilogo("Form check", righe.count { it.formCheck })
            }
        }

        righe.forEach { r ->
            val colore = when (r.priorita) {
                2 -> MaterialTheme.colorScheme.errorContainer
                1 -> MaterialTheme.colorScheme.tertiaryContainer
                else -> MaterialTheme.colorScheme.surfaceVariant
            }
            val sett = r.carico.settimane.firstOrNull { it.lunedi == lunediOggi }
            Card(
                colors = CardDefaults.cardColors(containerColor = colore),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                    Text(
                        "${r.atleta.cognome} ${r.atleta.nome}" + if (r.assenteOggi) " · assente oggi" else "",
                        fontWeight = FontWeight.Bold,
                        style = MaterialTheme.typography.titleSmall
                    )
                    Text(
                        if (sett == null) "Questa settimana: nessuna seduta registrata"
                        else "Questa settimana: ${sett.sedute} sedute · ${sett.metri} m" +
                            (sett.metriPrevisti?.let { " (previsti $it m)" } ?: ""),
                        style = MaterialTheme.typography.bodySmall
                    )
                    Text(
                        "Ultima seduta: ${r.carico.ultimaSeduta?.formatta() ?: "nessuna"}",
                        style = MaterialTheme.typography.bodySmall
                    )
                    Text(
                        if (!r.carico.affidabile) "ACWR: dati insufficienti"
                        else "ACWR: ${r.carico.livello?.name?.lowercase() ?: "n.d."}",
                        style = MaterialTheme.typography.bodySmall,
                        fontWeight = FontWeight.SemiBold
                    )
                    if (r.carico.affidabile && r.priorita > 0) {
                        Text(r.carico.messaggio, style = MaterialTheme.typography.bodySmall)
                    }
                    if (r.formCheck) {
                        Text("Form check consigliato", style = MaterialTheme.typography.labelSmall)
                    }
                }
            }
        }
    }
}

@Composable
private fun Riepilogo(etichetta: String, valore: Int) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(
            valore.toString(),
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onPrimaryContainer
        )
        Text(
            etichetta,
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onPrimaryContainer
        )
    }
}