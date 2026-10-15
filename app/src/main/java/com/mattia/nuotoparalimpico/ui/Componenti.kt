package com.mattia.nuotoparalimpico.ui

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import kotlinx.coroutines.launch
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.material.icons.filled.Info
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.mattia.nuotoparalimpico.domain.Avviso
import com.mattia.nuotoparalimpico.domain.CalcoloRitmiRipartenze
import com.mattia.nuotoparalimpico.domain.CodiceAllenamento
import com.mattia.nuotoparalimpico.domain.Gravita
import com.mattia.nuotoparalimpico.domain.TempoImportato
import com.mattia.nuotoparalimpico.domain.formattaTempo
import com.mattia.nuotoparalimpico.domain.parseTempo
import com.mattia.nuotoparalimpico.data.Atleta
import com.mattia.nuotoparalimpico.data.ContestoTempo
import com.mattia.nuotoparalimpico.data.Stile
import com.mattia.nuotoparalimpico.data.Tempo
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter
import java.time.format.DateTimeParseException

val FORMATO_DATA: DateTimeFormatter = DateTimeFormatter.ofPattern("dd/MM/yyyy")

fun parseData(testo: String): LocalDate? =
    try {
        LocalDate.parse(testo.trim(), FORMATO_DATA)
    } catch (e: DateTimeParseException) {
        null
    }

fun LocalDate.formatta(): String = format(FORMATO_DATA)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CampoData(
    valore: String,
    onCambio: (String) -> Unit,
    etichetta: String,
    modifier: Modifier = Modifier
) {
    var aperto by remember { mutableStateOf(false) }

    OutlinedTextField(
        value = valore,
        onValueChange = onCambio,
        label = { Text(etichetta) },
        placeholder = { Text("gg/mm/aaaa") },
        singleLine = true,
        isError = valore.isNotBlank() && parseData(valore) == null,
        trailingIcon = {
            IconButton(onClick = { aperto = true }) {
                Icon(Icons.Filled.DateRange, contentDescription = "Scegli la data")
            }
        },
        modifier = modifier
    )

    if (aperto) {
        val statoPicker = rememberDatePickerState(
            initialSelectedDateMillis = parseData(valore)
                ?.atStartOfDay(ZoneOffset.UTC)?.toInstant()?.toEpochMilli()
        )
        DatePickerDialog(
            onDismissRequest = { aperto = false },
            confirmButton = {
                TextButton(onClick = {
                    statoPicker.selectedDateMillis?.let { ms ->
                        onCambio(Instant.ofEpochMilli(ms).atZone(ZoneOffset.UTC).toLocalDate().formatta())
                    }
                    aperto = false
                }) { Text("OK") }
            },
            dismissButton = { TextButton(onClick = { aperto = false }) { Text("Annulla") } }
        ) {
            DatePicker(state = statoPicker)
        }
    }
}

@Composable
fun CampoNumero(
    valore: String,
    onCambio: (String) -> Unit,
    etichetta: String,
    modifier: Modifier = Modifier,
    isError: Boolean = false
) {
    OutlinedTextField(
        value = valore,
        onValueChange = { onCambio(it.filter(Char::isDigit)) },
        label = { Text(etichetta) },
        singleLine = true,
        isError = isError,
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
        modifier = modifier
    )
}

@Composable
fun FormNuovoTempo(
    atletaId: Long,
    titolo: String,
    onSalva: (Tempo) -> Unit
) {
    var dataTesto by remember { mutableStateOf("") }
    var stile by remember { mutableStateOf(Stile.STILE_LIBERO) }
    var distanza by remember { mutableStateOf<Int?>(100) }
    var vasca by remember { mutableStateOf<Int?>(null) }
    var tempoTesto by remember { mutableStateOf("") }
    var contesto by remember { mutableStateOf(ContestoTempo.GARA) }
    var note by remember { mutableStateOf("") }

    // Modalità input naturale
    var inputNaturale by remember { mutableStateOf(false) }
    var testoNaturale by remember { mutableStateOf("") }
    var messaggioParsing by remember { mutableStateOf<String?>(null) }

    // OCR
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var ocrInCorso by remember { mutableStateOf(false) }

    val imagePicker = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: android.net.Uri? ->
        if (uri != null) {
            ocrInCorso = true
            scope.launch {
                val risultato = com.mattia.nuotoparalimpico.domain.OCRHelper.parseTempoDaImmagine(
                    context,
                    uri
                )
                ocrInCorso = false
                if (risultato.successo && risultato.dati != null) {
                    val d = risultato.dati
                    stile = d.stile ?: Stile.STILE_LIBERO
                    distanza = d.distanzaMetri
                    vasca = d.vascaMetri
                    contesto = d.contesto
                    note = d.note
                    tempoTesto = if (d.centesimi != null) com.mattia.nuotoparalimpico.domain.NLPParser.formattaTempoDisplay(d.centesimi) else ""
                    messaggioParsing = risultato.messaggio
                } else {
                    messaggioParsing = risultato.messaggio
                }
            }
        }
    }

    val data = parseData(dataTesto)
    val centesimi = parseTempo(tempoTesto)
    val distanzaValida = distanza
    val vascaValida = vasca
    val valido = data != null && distanzaValida != null && vascaValida != null && centesimi != null

    Titolo(titolo)

    // Toggle modalità input
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        FilterChip(
            selected = !inputNaturale,
            onClick = { inputNaturale = false },
            label = { Text("Inserimento manuale") }
        )
        FilterChip(
            selected = inputNaturale,
            onClick = { inputNaturale = true },
            label = { Text("Scrivi in linguaggio naturale 🤖") }
        )
    }

    // Pulsante OCR
    OutlinedButton(
        onClick = { imagePicker.launch("image/*") },
        enabled = !ocrInCorso,
        modifier = Modifier.fillMaxWidth()
    ) {
        if (ocrInCorso) {
            CircularProgressIndicator(modifier = Modifier.size(16.dp), strokeWidth = 2.dp)
            Spacer(Modifier.width(8.dp))
            Text("Analisi immagine in corso...")
        } else {
            Text("📷 Carica immagine (screenshot)")
        }
    }

    if (inputNaturale) {
        OutlinedTextField(
            value = testoNaturale,
            onValueChange = { testoNaturale = it; messaggioParsing = null },
            label = { Text("Scrivi liberamente (es. \"100 stile libero 1:02.35 gara vasca 25m\")") },
            singleLine = false,
            minLines = 3,
            modifier = Modifier.fillMaxWidth()
        )
        Button(
            onClick = {
                val risultato = com.mattia.nuotoparalimpico.domain.NLPParser.parseTempo(testoNaturale)
                if (risultato.successo && risultato.dati != null) {
                    val d = risultato.dati
                    stile = d.stile ?: Stile.STILE_LIBERO
                    distanza = d.distanzaMetri
                    vasca = d.vascaMetri
                    contesto = d.contesto
                    note = d.note
                    tempoTesto = if (d.centesimi != null) com.mattia.nuotoparalimpico.domain.NLPParser.formattaTempoDisplay(d.centesimi) else ""
                    messaggioParsing = risultato.messaggio
                    inputNaturale = false
                } else {
                    messaggioParsing = risultato.messaggio
                }
            },
            modifier = Modifier.fillMaxWidth()
        ) { Text("Analizza testo") }
        messaggioParsing?.let {
            Text(
                it,
                color = if (it.startsWith("Ho capito")) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error,
                style = MaterialTheme.typography.bodySmall
            )
        }
    } else {
        CampoData(dataTesto, { dataTesto = it }, "Data", Modifier.fillMaxWidth())
        Text("Stile", style = MaterialTheme.typography.labelSmall)
        Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            Stile.entries.forEach { opzione ->
                FilterChip(opzione == stile, { stile = opzione }, label = { Text(opzione.etichetta) })
            }
        }
        Text("Distanza", style = MaterialTheme.typography.labelSmall)
        Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            listOf(50, 100, 200, 400, 800, 1500).forEach { opzione ->
                FilterChip(distanza == opzione, { distanza = opzione }, label = { Text("$opzione m") })
            }
        }
        Text("Vasca (obbligatoria)", style = MaterialTheme.typography.labelSmall)
        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            listOf(25, 50).forEach { opzione ->
                FilterChip(vasca == opzione, { vasca = opzione }, label = { Text("Vasca $opzione m") })
            }
        }
        OutlinedTextField(
            value = tempoTesto,
            onValueChange = { tempoTesto = it },
            label = { Text("Tempo (es. 1:02.35 o 28,40)") },
            singleLine = true,
            isError = tempoTesto.isNotBlank() && centesimi == null,
            modifier = Modifier.fillMaxWidth()
        )
        if (tempoTesto.isNotBlank() && centesimi == null) {
            Text("Inserisci un tempo valido, ad esempio 1:02.35 o 28,40.", color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
        }
        Text("Contesto", style = MaterialTheme.typography.labelSmall)
        Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            ContestoTempo.entries.forEach { opzione ->
                FilterChip(opzione == contesto, { contesto = opzione }, label = { Text(opzione.etichetta) })
            }
        }
        OutlinedTextField(note, { note = it }, label = { Text("Note (opzionali)") }, modifier = Modifier.fillMaxWidth())
    }

    Button(
        enabled = valido,
        onClick = {
            val dataValida = data ?: return@Button
            val distanzaSelezionata = distanzaValida ?: return@Button
            val vascaSelezionata = vascaValida ?: return@Button
            val tempoValido = centesimi ?: return@Button
            onSalva(
                Tempo(
                    atletaId = atletaId,
                    data = dataValida,
                    stile = stile,
                    distanzaMetri = distanzaSelezionata,
                    centesimi = tempoValido,
                    contesto = contesto,
                    vascaMetri = vascaSelezionata,
                    note = note.trim()
                )
            )
            tempoTesto = ""
            note = ""
        },
        modifier = Modifier.fillMaxWidth()
    ) { Text("Salva tempo") }
}

@Composable
fun DialogImportaTempi(
    atleta: Atleta,
    tempiEsistenti: List<Tempo>,
    analizza: (String, String, String?) -> List<TempoImportato>,
    onImporta: (List<Tempo>) -> Unit,
    onChiudi: () -> Unit
) {
    var testo by remember { mutableStateOf("") }
    var dataTesto by remember { mutableStateOf("") }
    var vasca by remember { mutableStateOf<Int?>(null) }
    var contesto by remember { mutableStateOf(ContestoTempo.GARA) }
    var risultati by remember { mutableStateOf(emptyList<TempoImportato>()) }
    val selezionati = remember { mutableStateMapOf<Int, Boolean>() }
    val stiliScelti = remember { mutableStateMapOf<Int, Stile>() }
    val data = parseData(dataTesto)
    val vascaScelta = vasca

    AlertDialog(
        onDismissRequest = onChiudi,
        title = { Text("Anteprima importazione tempi") },
        text = {
            Column(
                Modifier.heightIn(max = 540.dp).verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Text("Saranno considerate le righe di ${atleta.cognome}; il nome, se presente, distingue gli omonimi.", style = MaterialTheme.typography.bodySmall)
                OutlinedTextField(
                    value = testo,
                    onValueChange = { testo = it },
                    label = { Text("Testo da analizzare") },
                    modifier = Modifier.fillMaxWidth().height(150.dp),
                    maxLines = 8
                )
                Button(
                    onClick = {
                        risultati = analizza(testo, atleta.cognome, atleta.nome)
                        selezionati.clear()
                        stiliScelti.clear()
                        risultati.indices.forEach { selezionati[it] = true }
                    },
                    modifier = Modifier.fillMaxWidth()
                ) { Text("Analizza testo") }

                if (risultati.isNotEmpty()) {
                    HorizontalDivider()
                    CampoData(dataTesto, { dataTesto = it }, "Data gara/test (obbligatoria)", Modifier.fillMaxWidth())
                    Text("Vasca (obbligatoria)", style = MaterialTheme.typography.labelSmall)
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        listOf(25, 50).forEach { opzione ->
                            FilterChip(vasca == opzione, { vasca = opzione }, label = { Text("Vasca $opzione m") })
                        }
                    }
                    Text("Contesto", style = MaterialTheme.typography.labelSmall)
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        ContestoTempo.entries.forEach { opzione ->
                            FilterChip(contesto == opzione, { contesto = opzione }, label = { Text(opzione.etichetta) })
                        }
                    }

                    risultati.forEachIndexed { indice, risultato ->
                        val stile = risultato.stile ?: stiliScelti[indice]
                        val duplicato = data != null && vascaScelta != null && stile != null &&
                            CalcoloRitmiRipartenze.isTempoDuplicato(
                                tempiEsistenti,
                                atleta.id,
                                data,
                                stile,
                                risultato.distanzaMetri,
                                vascaScelta,
                                risultato.centesimi
                            )
                        Card(
                            colors = CardDefaults.cardColors(
                                containerColor = if (duplicato) MaterialTheme.colorScheme.errorContainer
                                else MaterialTheme.colorScheme.surfaceVariant
                            ),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(Modifier.padding(8.dp)) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Checkbox(
                                        checked = selezionati[indice] != false && !duplicato,
                                        onCheckedChange = { selezionati[indice] = it },
                                        enabled = !duplicato
                                    )
                                    Column {
                                        Text(
                                            "${stile?.etichetta ?: "Stile non riconosciuto"} · ${risultato.distanzaMetri} m · ${formattaTempo(risultato.centesimi)}",
                                            fontWeight = FontWeight.SemiBold
                                        )
                                        if (duplicato) Text("Duplicato: deselezionato", color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
                                    }
                                }
                                if (risultato.stileNonRiconosciuto) {
                                    Text("Seleziona manualmente lo stile:", style = MaterialTheme.typography.bodySmall)
                                    Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                        Stile.entries.forEach { opzione ->
                                            FilterChip(
                                                selected = stiliScelti[indice] == opzione,
                                                onClick = { stiliScelti[indice] = opzione },
                                                label = { Text(opzione.etichetta) }
                                            )
                                        }
                                    }
                                }
                                Text(risultato.rigaOriginale, style = MaterialTheme.typography.bodySmall)
                            }
                        }
                    }
                }
            }
        },
        confirmButton = {
            val daImportare = risultati.mapIndexedNotNull { indice, item ->
                val stile = item.stile ?: stiliScelti[indice]
                val dataValida = data
                val vascaValida = vascaScelta
                if (
                    selezionati[indice] == true &&
                    stile != null &&
                    dataValida != null &&
                    vascaValida != null &&
                    !CalcoloRitmiRipartenze.isTempoDuplicato(
                        tempiEsistenti, atleta.id, dataValida, stile, item.distanzaMetri, vascaValida, item.centesimi
                    )
                ) {
                    Tempo(
                        atletaId = atleta.id,
                        data = dataValida,
                        stile = stile,
                        distanzaMetri = item.distanzaMetri,
                        centesimi = item.centesimi,
                        contesto = contesto,
                        vascaMetri = vascaValida,
                        note = item.note
                    )
                } else null
            }
            TextButton(
                enabled = daImportare.isNotEmpty(),
                onClick = {
                    onImporta(daImportare)
                    onChiudi()
                }
            ) { Text("Importa ${daImportare.size} tempi") }
        },
        dismissButton = { TextButton(onClick = onChiudi) { Text("Annulla") } }
    )
}

@Composable
fun Titolo(testo: String, icona: ImageVector? = null) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        modifier = Modifier.padding(vertical = 4.dp)
    ) {
        icona?.let {
            Icon(it, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
        }
        Text(
            testo,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurface
        )
    }
}

@Composable
fun BadgeCodiceAllenamento(codice: CodiceAllenamento, modifier: Modifier = Modifier) {
    var mostraInfo by remember { mutableStateOf(false) }

    Surface(
        color = codice.coloreContainer,
        shape = RoundedCornerShape(8.dp),
        modifier = modifier.clickable { mostraInfo = true }
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(4.dp),
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
        ) {
            Text(
                text = codice.codice,
                fontWeight = FontWeight.Bold,
                color = codice.coloreTesto,
                style = MaterialTheme.typography.labelLarge
            )
        }
    }

    if (mostraInfo) {
        AlertDialog(
            onDismissRequest = { mostraInfo = false },
            title = { Text("Codice Allenamento: ${codice.codice}") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text(codice.nome, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.bodyMedium)
                    Text(codice.ambito, style = MaterialTheme.typography.bodySmall)
                    Text("• Frequenza Cardiaca: ${codice.hrBpm}", style = MaterialTheme.typography.bodySmall)
                    Text("• Lattato Ematico: ${codice.lattato}", style = MaterialTheme.typography.bodySmall)
                }
            },
            confirmButton = { TextButton(onClick = { mostraInfo = false }) { Text("Chiudi") } }
        )
    }
}

@Composable
fun IndicatoreRipartizioneCodici(ripartizione: Map<CodiceAllenamento, Int>, volumeTotale: Int) {
    if (volumeTotale <= 0 || ripartizione.isEmpty()) return

    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .height(14.dp)
                .clip(RoundedCornerShape(7.dp))
                .background(MaterialTheme.colorScheme.surfaceVariant)
        ) {
            ripartizione.forEach { (codice, metri) ->
                val peso = metri.toFloat() / volumeTotale
                if (peso > 0f) {
                    Box(
                        modifier = Modifier
                            .weight(peso)
                            .height(14.dp)
                            .background(codice.coloreContainer)
                    )
                }
            }
        }
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            ripartizione.forEach { (codice, metri) ->
                val perc = (metri * 100) / volumeTotale
                if (perc > 0) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(2.dp)) {
                        Box(
                            modifier = Modifier
                                .width(8.dp)
                                .height(8.dp)
                                .clip(RoundedCornerShape(2.dp))
                                .background(codice.coloreTesto)
                        )
                        Text(
                            "${codice.codice} $perc%",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun ElencoAvvisi(avvisi: List<Avviso>) {
    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        avvisi.sortedByDescending { it.gravita.ordinal }.forEach { a ->
            val containerColor = when (a.gravita) {
                Gravita.ERRORE -> MaterialTheme.colorScheme.errorContainer
                Gravita.ATTENZIONE -> MaterialTheme.colorScheme.tertiaryContainer
                Gravita.INFO -> MaterialTheme.colorScheme.secondaryContainer
            }
            val contentColor = when (a.gravita) {
                Gravita.ERRORE -> MaterialTheme.colorScheme.onErrorContainer
                Gravita.ATTENZIONE -> MaterialTheme.colorScheme.onTertiaryContainer
                Gravita.INFO -> MaterialTheme.colorScheme.onSecondaryContainer
            }
            Card(
                colors = CardDefaults.cardColors(containerColor = containerColor),
                shape = RoundedCornerShape(8.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier.padding(8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(Icons.Filled.Info, contentDescription = null, tint = contentColor)
                    Text(
                        a.messaggio,
                        color = contentColor,
                        style = MaterialTheme.typography.bodySmall
                    )
                }
            }
        }
    }
}

@Composable
fun CollapsibleSection(
    title: String,
    modifier: Modifier = Modifier,
    initialExpanded: Boolean = false,
    badgeText: String? = null,
    content: @Composable () -> Unit
) {
    var expanded by remember { mutableStateOf(initialExpanded) }

    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Column(modifier = Modifier.fillMaxWidth()) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { expanded = !expanded }
                    .padding(horizontal = 16.dp, vertical = 14.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Text(
                        text = title,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    if (badgeText != null) {
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = MaterialTheme.colorScheme.primaryContainer
                        ) {
                            Text(
                                text = badgeText,
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onPrimaryContainer
                            )
                        }
                    }
                }
                Icon(
                    imageVector = Icons.Default.Info,
                    contentDescription = if (expanded) "Comprimi" else "Espandi",
                    tint = MaterialTheme.colorScheme.primary
                )
            }

            androidx.compose.animation.AnimatedVisibility(visible = expanded) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(start = 16.dp, end = 16.dp, bottom = 16.dp)
                ) {
                    content()
                }
            }
        }
    }
}
