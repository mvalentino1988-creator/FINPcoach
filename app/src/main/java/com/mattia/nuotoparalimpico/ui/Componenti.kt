package com.mattia.nuotoparalimpico.ui

import androidx.compose.foundation.layout.Column
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import com.mattia.nuotoparalimpico.domain.Avviso
import com.mattia.nuotoparalimpico.domain.Gravita
import java.time.LocalDate
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
    OutlinedTextField(
        value = valore,
        onValueChange = onCambio,
        label = { Text(etichetta) },
        placeholder = { Text("gg/mm/aaaa") },
        singleLine = true,
        isError = valore.isNotBlank() && parseData(valore) == null,
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
