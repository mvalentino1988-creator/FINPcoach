package com.mattia.nuotoparalimpico.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.List
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
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
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.mattia.nuotoparalimpico.domain.SchedaSeduta
import com.mattia.nuotoparalimpico.domain.formattaTempo

@Composable
fun DialogSchedaSedutaSmart(
    scheda: SchedaSeduta,
    onChiudi: () -> Unit
) {
    val clipboardManager = LocalClipboardManager.current
    var copiato by remember { mutableStateOf(false) }

    val testoCopiabile = remember(scheda) {
        buildString {
            appendLine("🏊‍♂️ ${scheda.titolo}")
            if (scheda.data != null) appendLine("📅 Data: ${scheda.data.formatta()}")
            appendLine("📊 Volume Totale: ${scheda.volumeTotaleMetri} m")
            appendLine("🎯 Fase: ${scheda.faseStagione.etichetta} (${scheda.tipoMicrociclo.etichetta})")
            if (scheda.categoriaEta != null) appendLine("👤 Categoria: ${scheda.categoriaEta}")
            appendLine()
            if (scheda.avvertenzeMediche.isNotEmpty()) {
                appendLine("⚠️ ADATTAMENTI MEDICI:")
                scheda.avvertenzeMediche.forEach { appendLine("- $it") }
                appendLine()
            }
            appendLine("📋 SERIE D'ALLENAMENTO BORDO VASCA:")
            scheda.tratti.forEachIndexed { i, t ->
                appendLine("${i + 1}. [${t.codice.codice}] ${t.sezione} - ${t.ripetizioni} (${t.metri}m)")
                appendLine("   ${t.descrizione}")
                if (t.ripartenza != null) appendLine("   ⏱️ Ripartenza: ${t.ripartenza}")
                if (t.notaSpecifica != null) appendLine("   • Focus: ${t.notaSpecifica}")
                appendLine()
            }
        }
    }

    AlertDialog(
        onDismissRequest = onChiudi,
        title = {
            Column {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Icon(Icons.Filled.DateRange, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                    Text(scheda.titolo, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                }
                scheda.data?.let {
                    Text("Seduta del ${it.formatta()}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        },
        text = {
            Column(
                modifier = Modifier.verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                // Header Info: Volume, Fase e Microciclo
                Surface(
                    color = MaterialTheme.colorScheme.primaryContainer,
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text(
                            "Volume Target: ${scheda.volumeTotaleMetri} m",
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onPrimaryContainer,
                            style = MaterialTheme.typography.titleSmall
                        )
                        Text(
                            "Fase: ${scheda.faseStagione.etichetta} · Microciclo: ${scheda.tipoMicrociclo.etichetta}",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onPrimaryContainer
                        )
                        scheda.categoriaEta?.let {
                            Text(
                                "Categoria: $it",
                                style = MaterialTheme.typography.bodySmall,
                                fontWeight = FontWeight.SemiBold,
                                color = MaterialTheme.colorScheme.onPrimaryContainer
                            )
                        }
                    }
                }

                // Pulsante Copia / Condividi
                Button(
                    onClick = {
                        clipboardManager.setText(AnnotatedString(testoCopiabile))
                        copiato = true
                    },
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(if (copiato) "Copiato negli Appunti! ✅" else "Copia Scheda per WhatsApp/Bordo Vasca 📋")
                }

                // Avvertenze Mediche
                if (scheda.avvertenzeMediche.isNotEmpty()) {
                    Card(
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer),
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                Icon(Icons.Filled.Info, contentDescription = null, tint = MaterialTheme.colorScheme.onErrorContainer)
                                Text("Adattamenti per Condizione Medica", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onErrorContainer)
                            }
                            scheda.avvertenzeMediche.forEach { avv ->
                                Text(avv, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onErrorContainer)
                            }
                        }
                    }
                }

                // Adattamenti Età
                if (scheda.adattamentiEta.isNotEmpty()) {
                    Card(
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.secondaryContainer),
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                Icon(Icons.Filled.Info, contentDescription = null, tint = MaterialTheme.colorScheme.onSecondaryContainer)
                                Text("Modifiche Fisiologiche / Età", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSecondaryContainer)
                            }
                            scheda.adattamentiEta.forEach { ad ->
                                Text(ad, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSecondaryContainer)
                            }
                        }
                    }
                }

                // Note di Calibrazione sui Tempi
                if (scheda.noteCalibrazione.isNotEmpty()) {
                    Card(
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.tertiaryContainer),
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                Icon(Icons.Filled.DateRange, contentDescription = null, tint = MaterialTheme.colorScheme.onTertiaryContainer)
                                Text("Calibrazione sui Tempi dell'Atleta", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onTertiaryContainer)
                            }
                            scheda.noteCalibrazione.forEach { nota ->
                                Text(nota, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onTertiaryContainer)
                            }
                            if (scheda.tempiUtilizzati.isNotEmpty()) {
                                HorizontalDivider(modifier = Modifier.padding(vertical = 4.dp))
                                Text("Tempi di riferimento utilizzati:", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onTertiaryContainer)
                                scheda.tempiUtilizzati.forEach { tempo ->
                                    Text("${tempo.stile.etichetta} ${tempo.distanzaMetri}m: ${formattaTempo(tempo.centesimi)} (${tempo.contesto.etichetta})", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onTertiaryContainer)
                                }
                            }
                        }
                    }
                }

                // Ripartizione Zone Energetiche (A1 - D)
                Titolo("Distribuzione Codici energetici", Icons.Filled.List)
                IndicatoreRipartizioneCodici(scheda.ripartizioneCodici, scheda.volumeTotaleMetri)

                HorizontalDivider()

                // Programma di Allenamento della Vasca (Tratti)
                Titolo("Scheda Bordo Vasca", Icons.Filled.List)
                scheda.tratti.forEachIndexed { idx, tratto ->
                    Card(
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween,
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Text(
                                    "${idx + 1}. ${tratto.sezione}",
                                    fontWeight = FontWeight.Bold,
                                    style = MaterialTheme.typography.titleSmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                                BadgeCodiceAllenamento(tratto.codice)
                            }
                            Text(
                                "${tratto.ripetizioni} · ${tratto.metri} m",
                                fontWeight = FontWeight.SemiBold,
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.primary
                            )
                            Text(tratto.descrizione, style = MaterialTheme.typography.bodySmall)
                            tratto.ripartenza?.let {
                                Text("Ripartenza/Recupero: $it", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.tertiary)
                            }
                            tratto.notaSpecifica?.let {
                                Text("• Focus: $it", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Medium)
                            }
                        }
                    }
                }
            }
        },
        confirmButton = {
            TextButton(onClick = onChiudi) { Text("Chiudi e torna in vasca") }
        }
    )
}
