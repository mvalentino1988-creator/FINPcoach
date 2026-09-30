package com.mattia.nuotoparalimpico.ui

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import com.mattia.nuotoparalimpico.domain.Avviso
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

/** Campo data: si può digitare (gg/mm/aaaa) oppure scegliere dal calendario. */
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

/** Campo numerico intero: tastiera numerica e solo cifre. */
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
fun Titolo(testo: String) {
    Text(testo, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
}

@Composable
fun ElencoAvvisi(avvisi: List<Avviso>) {
    Column {
        avvisi.sortedByDescending { it.gravita.ordinal }.forEach { a ->
            val (prefisso, colore) = when (a.gravita) {
                Gravita.ERRORE -> "Errore" to MaterialTheme.colorScheme.error
                Gravita.ATTENZIONE -> "Attenzione" to MaterialTheme.colorScheme.tertiary
                Gravita.INFO -> "Info" to MaterialTheme.colorScheme.onSurfaceVariant
            }
            Text(
                "$prefisso: ${a.messaggio}",
                color = colore,
                style = MaterialTheme.typography.bodySmall
            )
        }
    }
}