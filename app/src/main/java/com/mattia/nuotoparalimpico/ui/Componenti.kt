package com.mattia.nuotoparalimpico.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.material.icons.filled.Info
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.mattia.nuotoparalimpico.domain.Avviso
import com.mattia.nuotoparalimpico.domain.CodiceAllenamento
import com.mattia.nuotoparalimpico.domain.Gravita
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
