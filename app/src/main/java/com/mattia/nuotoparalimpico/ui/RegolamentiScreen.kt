package com.mattia.nuotoparalimpico.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.mattia.nuotoparalimpico.data.DocumentoRegolamento
import com.mattia.nuotoparalimpico.data.FonteRegolamento
import com.mattia.nuotoparalimpico.data.RegolamentiRepository
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

@Composable
fun RegolamentiScreen(vm: MainViewModel) {
    val stato by vm.regolamenti.collectAsStateWithLifecycle()
    val uri = LocalUriHandler.current

    // Rete solo qui, e solo se la copia salvata ha più di 24 ore
    LaunchedEffect(Unit) { vm.aggiornaRegolamenti(forza = false) }

    Column(
        Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Titolo("Regolamenti", Icons.Filled.Info)
        Text(
            "Regolamento più recente trovato sulle pagine ufficiali FINP (finp.it) e World Para Swimming (paralympic.org/swimming). " +
                "L'app scarica solo l'elenco dei documenti; i PDF si aprono nel browser.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            Button(onClick = { vm.aggiornaRegolamenti(forza = true) }, enabled = !stato.caricamento) {
                Icon(Icons.Filled.Refresh, contentDescription = null, modifier = Modifier.size(18.dp))
                Text("  Aggiorna")
            }
            if (stato.caricamento) CircularProgressIndicator(modifier = Modifier.size(22.dp), strokeWidth = 2.dp)
        }
        stato.aggiornatoIl?.let {
            val testo = Instant.ofEpochMilli(it).atZone(ZoneId.systemDefault()).format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"))
            Text("Ultimo aggiornamento: $testo", style = MaterialTheme.typography.labelSmall)
        }
        stato.errore?.let {
            Card(
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer),
                shape = RoundedCornerShape(10.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                    Text("Alcune pagine non sono state lette (connessione o struttura del sito cambiata):", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onErrorContainer)
                    Text(it, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onErrorContainer)
                }
            }
        }

        if (stato.documenti.isEmpty() && !stato.caricamento) {
            Text("Nessun documento salvato. Collegati a internet e premi Aggiorna, oppure usa i link diretti qui sotto.", style = MaterialTheme.typography.bodySmall)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedButton(onClick = { runCatching { uri.openUri(RegolamentiRepository.LINK_FINP_TECNICO) } }) { Text("FINP ↗") }
                OutlinedButton(onClick = { runCatching { uri.openUri(RegolamentiRepository.LINK_WPS_RULES) } }) { Text("WPS ↗") }
            }
        }

        FonteRegolamento.entries.forEach { fonte ->
            val docs = stato.documenti.filter { it.fonte == fonte }
            if (docs.isNotEmpty()) {
                Titolo(fonte.etichetta, Icons.Filled.Info)
                docs.groupBy { it.sezione }.forEach { (sezione, lista) ->
                    Text(sezione, style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.primary)
                    lista.sortedByDescending { it.principale }.forEach { d -> CardDocumento(d) { runCatching { uri.openUri(d.url) } } }
                }
            }
        }

        Titolo("Ranking, record e risultati", Icons.Filled.Info)
        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            LinkRiga("Ranking mondiale World Para Swimming", RegolamentiRepository.LINK_RANKING_MONDO) { runCatching { uri.openUri(it) } }
            LinkRiga("Record mondiali", RegolamentiRepository.LINK_RECORD_MONDO) { runCatching { uri.openUri(it) } }
            LinkRiga("Risultati nazionali FINP", RegolamentiRepository.LINK_RISULTATI_ITALIA) { runCatching { uri.openUri(it) } }
            LinkRiga("Record italiani FINP", RegolamentiRepository.LINK_RECORD_ITALIA) { runCatching { uri.openUri(it) } }
            LinkRiga("Tabella punti FINP", RegolamentiRepository.LINK_TABELLA_PUNTI) { runCatching { uri.openUri(it) } }
        }

        Card(
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.secondaryContainer),
            shape = RoundedCornerShape(12.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text("Come usa l'app i regolamenti", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSecondaryContainer)
                Text(
                    "Le gare consigliate nella scheda atleta seguono il programma standard WPS/Paralimpico per classe. " +
                        "L'app non legge il testo dei PDF: controlla qui che il programma della stagione non sia cambiato, " +
                        "soprattutto per le gare solo nazionali.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSecondaryContainer
                )
            }
        }
    }
}

@Composable
private fun CardDocumento(d: DocumentoRegolamento, onApri: () -> Unit) {
    Card(
        colors = CardDefaults.cardColors(
            containerColor = if (d.principale) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surfaceVariant
        ),
        shape = RoundedCornerShape(12.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                Text(d.titolo, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.weight(1f))
                if (d.principale) {
                    Surface(color = MaterialTheme.colorScheme.primary, shape = RoundedCornerShape(6.dp)) {
                        Text(
                            "PIÙ RECENTE",
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onPrimary
                        )
                    }
                }
            }
            if (d.nota.isNotBlank()) Text(d.nota, style = MaterialTheme.typography.bodySmall)
            TextButton(onClick = onApri) { Text("Apri PDF ↗") }
        }
    }
}

@Composable
private fun LinkRiga(titolo: String, url: String, onApri: (String) -> Unit) {
    OutlinedButton(onClick = { onApri(url) }, modifier = Modifier.fillMaxWidth()) { Text("$titolo ↗") }
}