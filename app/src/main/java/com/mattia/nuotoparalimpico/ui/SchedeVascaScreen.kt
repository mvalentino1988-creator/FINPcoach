package com.mattia.nuotoparalimpico.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.List
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.mattia.nuotoparalimpico.domain.SchedaSeduta

/** Mostra una scheda di seduta (usata dal calendario nella schermata Piano). */
@Composable
fun VisualizzatoreSchedaVasca(scheda: SchedaSeduta) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        // Intestazione Scheda
        Surface(
            color = MaterialTheme.colorScheme.primaryContainer,
            shape = RoundedCornerShape(16.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(scheda.titolo, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onPrimaryContainer)
                Text("Volume Totale: ${scheda.volumeTotaleMetri} m · Fase: ${scheda.faseStagione.etichetta} (${scheda.tipoMicrociclo.etichetta})", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onPrimaryContainer)
                scheda.categoriaEta?.let {
                    Text("Categoria: $it", style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onPrimaryContainer)
                }
            }
        }

        // Note Mediche e Adattamenti
        if (scheda.istruzioniNeutre.isNotEmpty()) {
            Card(
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.secondaryContainer),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text("Istruzioni operative", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.labelLarge)
                    scheda.istruzioniNeutre.forEach { Text(it, style = MaterialTheme.typography.bodySmall) }
                }
            }
        }

        if (scheda.avvertenzeMediche.isNotEmpty()) {
            Card(
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text("Adattamenti per Condizioni Mediche", fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onErrorContainer, style = MaterialTheme.typography.labelLarge)
                    scheda.avvertenzeMediche.forEach { Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onErrorContainer) }
                }
            }
        }

        if (scheda.adattamentiEta.isNotEmpty()) {
            Card(
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.secondaryContainer),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text("Modifiche Fisiologiche dell'Età", fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSecondaryContainer, style = MaterialTheme.typography.labelLarge)
                    scheda.adattamentiEta.forEach { Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSecondaryContainer) }
                }
            }
        }

        if (scheda.noteCalibrazione.isNotEmpty()) {
            Card(
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.tertiaryContainer),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text("Calibrazione sui Tempi", fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onTertiaryContainer, style = MaterialTheme.typography.labelLarge)
                    scheda.noteCalibrazione.forEach { Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onTertiaryContainer) }
                }
            }
        }

        // Ripartizione Zone Energetiche (A1-D)
        Titolo("Zone Energetiche della Seduta", Icons.Filled.List)
        IndicatoreRipartizioneCodici(scheda.ripartizioneCodici, scheda.volumeTotaleMetri)

        HorizontalDivider()

        // Tratti della Seduta
        Titolo("Dettaglio Serie per Bordo Vasca", Icons.Filled.List)
        scheda.tratti.forEachIndexed { idx, tratto ->
            Card(
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            "${idx + 1}. ${tratto.sezione}",
                            fontWeight = FontWeight.Bold,
                            style = MaterialTheme.typography.titleSmall
                        )
                        BadgeCodiceAllenamento(tratto.codice)
                    }
                    Text(
                        "${tratto.ripetizioni} · ${tratto.metri} m",
                        fontWeight = FontWeight.Bold,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.primary
                    )
                    Text(tratto.descrizione, style = MaterialTheme.typography.bodySmall)
                    tratto.ripartenza?.let {
                        Text("⏱️ Ripartenza / Recupero: $it", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.tertiary, fontWeight = FontWeight.Bold)
                    }
                    tratto.notaSpecifica?.let {
                        Text("• Focus: $it", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Medium)
                    }
                }
            }
        }
    }
}