package com.mattia.nuotoparalimpico.ui

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.List
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
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
import com.mattia.nuotoparalimpico.data.ContestoTempo
import com.mattia.nuotoparalimpico.data.Mesociclo
import com.mattia.nuotoparalimpico.data.Stile
import com.mattia.nuotoparalimpico.data.Tempo
import com.mattia.nuotoparalimpico.domain.CalcoloRitmiRipartenze
import com.mattia.nuotoparalimpico.domain.CodiceAllenamento
import com.mattia.nuotoparalimpico.domain.formattaTempo
import com.mattia.nuotoparalimpico.domain.parseTempo
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

    var dataTesto by remember { mutableStateOf(LocalDate.now().formatta()) }
    var stile by remember { mutableStateOf(Stile.STILE_LIBERO) }
    var distanza by remember { mutableStateOf("100") }
    var tempoTesto by remember { mutableStateOf("") }
    var contesto by remember { mutableStateOf(ContestoTempo.GARA) }
    var note by remember { mutableStateOf("") }

    val dataParsed = parseData(dataTesto)
    val distanzaInt = distanza.toIntOrNull()?.coerceIn(25, 1500) ?: 100
    val tempoCentesimi = parseTempo(tempoTesto)

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

    // Tabella Ripartenze Calcolate sui tempi
    val migliorTempo100 = tempi.filter { it.distanzaMetri == 100 }.maxByOrNull { it.data }
    if (migliorTempo100 != null) {
        val tabella = remember(migliorTempo100) {
            CalcoloRitmiRipartenze.calcolaTabellaRitmi(
                atletaId = atleta.id,
                tempo100mCentesimi = migliorTempo100.centesimi,
                stile = migliorTempo100.stile
            )
        }

        Titolo("Tabella Ritmi & Ripartenze a 5 Secondi · ${atleta.nome}", Icons.Filled.List)
        Text("Calcolata sul miglior tempo 100m ${migliorTempo100.stile.name.replace("_", " ")}: ${formattaTempo(migliorTempo100.centesimi)}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold)

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

    // Form Inserimento Manuale
    Titolo("Aggiungi Nuovo Tempo di Gara / Test", Icons.Filled.DateRange)
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        CampoData(dataTesto, { dataTesto = it }, "Data", Modifier.weight(1f))
        CampoNumero(distanza, { distanza = it }, "Distanza (m)", Modifier.weight(1f))
    }
    Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
        Stile.entries.forEach { s ->
            FilterChip(selected = s == stile, onClick = { stile = s }, label = { Text(s.name.replace("_", " ")) })
        }
    }
    OutlinedTextField(
        tempoTesto,
        { tempoTesto = it },
        label = { Text("Tempo (es. 1:02.35 o 62.35)") },
        singleLine = true,
        modifier = Modifier.fillMaxWidth()
    )
    Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
        ContestoTempo.entries.forEach { c ->
            FilterChip(selected = c == contesto, onClick = { contesto = c }, label = { Text(c.name.lowercase()) })
        }
    }
    OutlinedTextField(note, { note = it }, label = { Text("Note") }, modifier = Modifier.fillMaxWidth())

    Button(
        enabled = dataParsed != null && tempoCentesimi != null,
        onClick = {
            if (dataParsed != null && tempoCentesimi != null) {
                vm.aggiungiTempo(
                    Tempo(
                        atletaId = atleta.id,
                        data = dataParsed,
                        stile = stile,
                        distanzaMetri = distanzaInt,
                        centesimi = tempoCentesimi,
                        contesto = contesto,
                        note = note.trim()
                    )
                )
                tempoTesto = ""
                note = ""
            }
        },
        modifier = Modifier.fillMaxWidth()
    ) {
        Text("Salva Tempo")
    }

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
                        "${p.stile.name.replace("_", " ")} ${p.distanzaMetri} m",
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

    // Modal Importazione OCR
    if (mostraImport) {
        AlertDialog(
            onDismissRequest = { mostraImport = false },
            title = { Text("Importa Tempi da Screenshot / Testo") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Incolla il testo estratto dallo screenshot o dai risultati di gara:", style = MaterialTheme.typography.bodySmall)
                    OutlinedTextField(
                        testoImport,
                        { testoImport = it },
                        label = { Text("Testo da analizzare") },
                        modifier = Modifier.fillMaxWidth().height(140.dp),
                        maxLines = 8
                    )
                }
            },
            confirmButton = {
                val tempiImportati = CalcoloRitmiRipartenze.parseImportaTempi(testoImport)
                TextButton(
                    onClick = {
                        tempiImportati.forEach { t ->
                            vm.aggiungiTempo(
                                Tempo(
                                    atletaId = atleta.id,
                                    data = LocalDate.now(),
                                    stile = t.stile,
                                    distanzaMetri = t.distanzaMetri,
                                    centesimi = t.centesimi,
                                    contesto = t.contesto,
                                    note = t.note
                                )
                            )
                        }
                        mostraImport = false
                        testoImport = ""
                    },
                    enabled = tempiImportati.isNotEmpty()
                ) {
                    Text("Importa ${tempiImportati.size} tempi")
                }
            },
            dismissButton = { TextButton(onClick = { mostraImport = false }) { Text("Annulla") } }
        )
    }
}
