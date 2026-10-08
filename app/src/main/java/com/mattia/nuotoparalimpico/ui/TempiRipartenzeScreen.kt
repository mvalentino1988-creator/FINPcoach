package com.mattia.nuotoparalimpico.ui

import androidx.compose.foundation.horizontalScroll
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
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.List
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.mattia.nuotoparalimpico.data.Atleta
import com.mattia.nuotoparalimpico.data.Mesociclo
import com.mattia.nuotoparalimpico.data.Tempo
import com.mattia.nuotoparalimpico.domain.CalcoloRitmiRipartenze
import com.mattia.nuotoparalimpico.domain.CalcoloScienzaNuoto
import com.mattia.nuotoparalimpico.domain.CodiceAllenamento
import com.mattia.nuotoparalimpico.domain.formattaTempo
import com.mattia.nuotoparalimpico.domain.primatiPersonali
import java.time.LocalDate

@Composable
fun TempiRipartenzeScreen(vm: MainViewModel) {
    val atleti by vm.atleti.collectAsStateWithLifecycle()
    val micro by vm.micro.collectAsStateWithLifecycle()
    val meso by vm.meso.collectAsStateWithLifecycle()
    val oggi = remember { LocalDate.now() }

    var atletaSelId by remember { mutableStateOf<Long?>(null) }
    val atletaSel = atleti.firstOrNull { it.id == atletaSelId } ?: atleti.firstOrNull()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Titolo("Tempi Gara & Calcolo Ripartenze ⏱️", Icons.Filled.DateRange)
        Text(
            "Carica i tempi passati o target futuri (tramite screenshot/testo OCR) per calcolare automaticamente le andature, le ripartenze a 5 secondi e le pause per ogni codice A1-D.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        if (atleti.isEmpty() || atletaSel == null) {
            Text("Aggiungi prima un atleta nella sezione Atleti per gestire tempi e ripartenze.")
            return@Column
        }

        // Selettore Atleta
        Text("Seleziona Atleta", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.labelLarge)
        Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            atleti.forEach { a ->
                FilterChip(
                    selected = a.id == atletaSel.id,
                    onClick = { atletaSelId = a.id },
                    label = { Text("${a.cognome} ${a.nome}") }
                )
            }
        }

        HorizontalDivider()

        val tempiAtletaFlow = vm.osservaTempi(atletaSel.id)
        val tempiAtleta by tempiAtletaFlow.collectAsStateWithLifecycle(initialValue = emptyList())
        val mesoCorrente = micro.firstOrNull { !it.inizio.isAfter(oggi) && !it.fine.isBefore(oggi) }?.let { mi ->
            meso.firstOrNull { it.id == mi.mesocicloId }
        }

        ContenutoTempiAtleta(
            atleta = atletaSel,
            tempi = tempiAtleta,
            mesoCorrente = mesoCorrente,
            vm = vm
        )
    }
}

@Composable
private fun ContenutoTempiAtleta(
    atleta: Atleta,
    tempi: List<Tempo>,
    mesoCorrente: Mesociclo?,
    vm: MainViewModel
) {
    var mostraImport by remember { mutableStateOf(false) }
    var testoImport by remember { mutableStateOf("") }

    // Form Check Alert
    val formCheck = remember(atleta, tempi, mesoCorrente) {
        CalcoloRitmiRipartenze.valutaNecessitaFormCheck(atleta, tempi, emptyList(), mesoCorrente)
    }

    if (formCheck.necessario) {
        Card(
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.tertiaryContainer),
            shape = RoundedCornerShape(12.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(formCheck.titoloTest, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onTertiaryContainer)
                Text(formCheck.motivazione, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onTertiaryContainer)
                Text(formCheck.istruzioniVasca, style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onTertiaryContainer)
            }
        }
    }

    val riferimento100 = remember(tempi) {
        CalcoloRitmiRipartenze.tempoRiferimento100(tempi, stile = null, vascaMetri = null, oggi = LocalDate.now())
    }
    val tempo100 = riferimento100?.tempo
    val tempo400 = tempo100?.let { CalcoloRitmiRipartenze.tempoRiferimento400(tempi, it) }
    val css = if (tempo100 != null && tempo400 != null) {
        remember(tempo100, tempo400) { CalcoloScienzaNuoto.calcolaCssRiferimenti(tempo100, tempo400) }
    } else null
    if (tempo100 != null) {
        Card(
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.secondaryContainer),
            shape = RoundedCornerShape(12.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    Icon(Icons.Filled.Info, contentDescription = null, tint = MaterialTheme.colorScheme.onSecondaryContainer)
                    Text("Calcolo Scientifico CSS (Soglia B1)", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleSmall, color = MaterialTheme.colorScheme.onSecondaryContainer)
                }
                if (css == null) {
                    Text("manca un 400 dello stesso stile/vasca recente", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSecondaryContainer)
                } else {
                    Text("Passo Soglia Aerobica CSS: ${css.passo100mFormatted} / 100m", fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                    Text("Riferimento 100m: ${tempo100.stile.etichetta}, vasca ${tempo100.vascaMetri}m · ${tempo100.data.formatta()} · ${formattaTempo(tempo100.centesimi)}", style = MaterialTheme.typography.bodySmall)
                    Text("Riferimento 400m: ${tempo400?.data?.formatta()} · ${formattaTempo(tempo400?.centesimi ?: 0)}", style = MaterialTheme.typography.bodySmall)
                    Text("CSS calcolata dai riferimenti 100/400 dello stesso stile e vasca.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSecondaryContainer)
                }
            }
        }
    }

    // Tabella Ripartenze Calcolate sui tempi
    val migliorTempo100 = tempo100
    if (migliorTempo100 != null) {
        val tabella = remember(migliorTempo100) {
            CalcoloRitmiRipartenze.calcolaTabellaRitmi(
                atletaId = atleta.id,
                tempo100mCentesimi = migliorTempo100.centesimi,
                stile = migliorTempo100.stile,
                vascaMetri = migliorTempo100.vascaMetri
            )
        }

        Titolo("Tabella Ritmi & Ripartenze a 5 Secondi · ${atleta.nome}", Icons.Filled.List)
        Text(
            "Riferimento: ${migliorTempo100.data.formatta()} · ${migliorTempo100.stile.etichetta} · vasca ${migliorTempo100.vascaMetri}m · ${formattaTempo(migliorTempo100.centesimi)}",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.primary,
            fontWeight = FontWeight.Bold
        )
        if (riferimento100?.datato == true) {
            Text("Attenzione: il tempo di riferimento è datato (oltre 180 giorni).", color = MaterialTheme.colorScheme.tertiary, style = MaterialTheme.typography.bodySmall)
        }

        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            CodiceAllenamento.entries.forEach { codice ->
                val ritmo = tabella.ritmi[codice] ?: return@forEach
                Card(
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier.padding(10.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Column(Modifier.weight(1f)) {
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                BadgeCodiceAllenamento(codice)
                                Text(codice.nome, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.bodyMedium)
                            }
                            Text("Andatura 100m: ${ritmo.passo100mFormatted}", style = MaterialTheme.typography.bodySmall)
                            Text(ritmo.noteTecniche, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        Column(horizontalAlignment = Alignment.End) {
                            Surface(
                                color = MaterialTheme.colorScheme.primaryContainer,
                                shape = RoundedCornerShape(6.dp)
                            ) {
                                Text(
                                    ritmo.ripartenzaFormatted,
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                    fontWeight = FontWeight.Bold,
                                    color = MaterialTheme.colorScheme.onPrimaryContainer,
                                    style = MaterialTheme.typography.labelLarge
                                )
                            }
                            Text(ritmo.pausaFormatted, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.tertiary, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }

        HorizontalDivider()
    }

    // Bottone Importazione OCR / Screenshot
    Button(
        onClick = { mostraImport = true },
        modifier = Modifier.fillMaxWidth()
    ) {
        Text("Importa Tempi da Screenshot / Testo OCR 📄")
    }

    HorizontalDivider()

    FormNuovoTempo(atleta.id, "Aggiungi Nuovo Tempo di Gara / Test") { vm.aggiungiTempo(it) }

    HorizontalDivider()

    // Primati Personali
    Titolo("Primati Personali Ufficiali (Gara)", Icons.Filled.List)
    val primati = primatiPersonali(tempi)
    if (primati.isEmpty()) {
        Text("Nessun tempo di gara registrato.", style = MaterialTheme.typography.bodySmall)
    } else {
        primati.forEach { p ->
            Card(
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer),
                shape = RoundedCornerShape(8.dp),
                modifier = Modifier.fillMaxWidth().padding(vertical = 2.dp)
            ) {
                Row(
                    modifier = Modifier.padding(10.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        "${p.stile.etichetta} ${p.distanzaMetri} m (vasca ${p.vascaMetri} m)",
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onPrimaryContainer
                    )
                    Text(
                        "${formattaTempo(p.centesimi)} · ${p.data.formatta()}",
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary
                    )
                }
            }
        }
    }

    // Anteprima importazione OCR
    if (mostraImport) {
        DialogImportaTempi(
            atleta = atleta,
            tempiEsistenti = tempi,
            analizza = vm::analizzaTempiImportati,
            onImporta = { importati -> importati.forEach(vm::aggiungiTempo) },
            onChiudi = { mostraImport = false }
        )
    }
}
