package com.mattia.nuotoparalimpico.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.List
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
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
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.mattia.nuotoparalimpico.data.AmbitoRanking
import com.mattia.nuotoparalimpico.data.Atleta
import com.mattia.nuotoparalimpico.data.CondizioneMedica
import com.mattia.nuotoparalimpico.data.FonteRegolamento
import com.mattia.nuotoparalimpico.data.LogSeduta
import com.mattia.nuotoparalimpico.data.RankingAtleta
import com.mattia.nuotoparalimpico.data.RegolamentiRepository
import com.mattia.nuotoparalimpico.data.Tempo
import com.mattia.nuotoparalimpico.domain.AzioneDato
import com.mattia.nuotoparalimpico.domain.DatoMancante
import com.mattia.nuotoparalimpico.domain.RegolamentoGare
import com.mattia.nuotoparalimpico.domain.SuggerimentoGara
import com.mattia.nuotoparalimpico.domain.formattaTempo
import java.time.LocalDate
import java.time.temporal.ChronoUnit

@Composable
fun CardDatiMancanti(dati: List<DatoMancante>, onCompleta: () -> Unit) {
    if (dati.isEmpty()) return
    Card(
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.tertiaryContainer),
        shape = RoundedCornerShape(12.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(
                "Per calcoli più precisi mancano ${dati.size} dati",
                fontWeight = FontWeight.Bold,
                style = MaterialTheme.typography.labelLarge,
                color = MaterialTheme.colorScheme.onTertiaryContainer
            )
            dati.forEach {
                Text(
                    "• ${it.titolo}: ${it.perche}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onTertiaryContainer
                )
            }
            if (dati.any { it.azione == AzioneDato.AGGIUNGI_TEMPO }) {
                Text("Aggiungi i tempi da «Gestione Tempi».", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onTertiaryContainer)
            }
            if (dati.any { it.azione == AzioneDato.REGISTRA_SEDUTE }) {
                Text("Registra le sedute (con RPE) dalla sezione Allenamento › Registro.", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onTertiaryContainer)
            }
            if (dati.any { it.azione == AzioneDato.MODIFICA_ATLETA }) {
                Button(onClick = onCompleta, modifier = Modifier.fillMaxWidth()) { Text("Completa la scheda atleta") }
            }
        }
    }
}

@Composable
fun SezioneGareERanking(
    atleta: Atleta,
    tempi: List<Tempo>,
    log: List<LogSeduta>,
    condizioni: List<CondizioneMedica>,
    vm: MainViewModel
) {
    val ranking by vm.rankings.collectAsStateWithLifecycle()
    val gare by vm.gare.collectAsStateWithLifecycle()
    val regolamenti by vm.regolamenti.collectAsStateWithLifecycle()
    val uri = LocalUriHandler.current
    val oggi = remember { LocalDate.now() }
    val mieiRanking = ranking.filter { it.atletaId == atleta.id }

    val suggerimenti = remember(atleta, tempi, mieiRanking, log, condizioni, gare) {
        RegolamentoGare.suggerisciGare(atleta, tempi, mieiRanking, log, condizioni, gare, oggi)
    }
    var inModifica by remember { mutableStateOf<SuggerimentoGara?>(null) }

    Titolo("Gare Consigliate e Ranking", Icons.Filled.List)

    if (suggerimenti.isEmpty()) {
        Text(
            "Inserisci le classi sportive (S, SB, SM) dell'atleta per ricevere le gare consigliate.",
            style = MaterialTheme.typography.bodySmall
        )
    }

    suggerimenti.forEach { s ->
        val rIta = mieiRanking.firstOrNull { it.stile == s.gara.stile && it.distanzaMetri == s.gara.distanzaMetri && it.ambito == AmbitoRanking.ITALIA }
        val rMon = mieiRanking.firstOrNull { it.stile == s.gara.stile && it.distanzaMetri == s.gara.distanzaMetri && it.ambito == AmbitoRanking.MONDO }

        Card(
            colors = CardDefaults.cardColors(
                containerColor = if (s.priorita == 1) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surfaceVariant
            ),
            shape = RoundedCornerShape(12.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        "${s.gara.descrizione} · ${s.gara.categoria.prefisso}${s.classeAtleta}",
                        fontWeight = FontWeight.Bold,
                        style = MaterialTheme.typography.titleSmall,
                        modifier = Modifier.weight(1f)
                    )
                    Surface(color = MaterialTheme.colorScheme.secondaryContainer, shape = RoundedCornerShape(6.dp)) {
                        Text(
                            s.etichettaPriorita,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSecondaryContainer
                        )
                    }
                }
                s.pbCentesimi?.let {
                    Text("PB: ${formattaTempo(it)}", style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.primary)
                }
                Text(s.motivazione.joinToString(" · "), style = MaterialTheme.typography.bodySmall)

                Row(horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
                    Text(testoRanking("Italia", rIta, oggi), style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold)
                    Text(testoRanking("Mondo", rMon, oggi), style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold)
                }
                TextButton(onClick = { inModifica = s }) { Text("Registra posizione ranking") }
            }
        }
    }

    if (suggerimenti.isNotEmpty()) {
        RegolamentoGare.note(atleta).forEach {
            Text("ℹ️ $it", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        val versioni = regolamenti.documenti.filter { it.principale }
        if (versioni.isNotEmpty()) {
            Text(
                "Regolamenti in vigore trovati: " + versioni.joinToString(" · ") { "${it.fonte.etichetta}: ${it.titolo}" },
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
        Text(
            "Il programma gare è quello standard WPS: verificalo sul regolamento nella sezione Regolamenti.",
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }

    Card(
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.secondaryContainer),
        shape = RoundedCornerShape(12.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text("Ranking ufficiali", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSecondaryContainer)
            Text(
                "Le pagine ufficiali non permettono all'app di leggere le posizioni in automatico. " +
                    "Apri il ranking, trova ${atleta.nome}${atleta.sesso?.let { " (${it.etichetta.lowercase()})" } ?: ""}, e salva la posizione: " +
                    "l'app ti avvisa quando il dato ha più di 30 giorni.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSecondaryContainer
            )
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedButton(onClick = { runCatching { uri.openUri(RegolamentiRepository.LINK_RANKING_MONDO) } }) { Text("Mondo ↗") }
                OutlinedButton(onClick = { runCatching { uri.openUri(RegolamentiRepository.LINK_RISULTATI_ITALIA) } }) { Text("Italia ↗") }
            }
        }
    }

    inModifica?.let { s ->
        DialogRanking(
            suggerimento = s,
            esistenti = mieiRanking.filter { it.stile == s.gara.stile && it.distanzaMetri == s.gara.distanzaMetri },
            onSalva = { ambito, posizione ->
                vm.salvaRanking(
                    RankingAtleta(
                        atletaId = atleta.id,
                        stile = s.gara.stile,
                        distanzaMetri = s.gara.distanzaMetri,
                        ambito = ambito,
                        posizione = posizione,
                        aggiornatoIl = LocalDate.now()
                    )
                )
                inModifica = null
            },
            onElimina = { vm.eliminaRanking(it); inModifica = null },
            onChiudi = { inModifica = null }
        )
    }
}

private fun testoRanking(etichetta: String, r: RankingAtleta?, oggi: LocalDate): String {
    if (r == null) return "$etichetta: —"
    val giorni = ChronoUnit.DAYS.between(r.aggiornatoIl, oggi)
    val vecchio = if (giorni > 30) " ⚠️ ${giorni}g fa: ricontrolla" else " (${giorni}g fa)"
    return "$etichetta: #${r.posizione}$vecchio"
}

@Composable
private fun DialogRanking(
    suggerimento: SuggerimentoGara,
    esistenti: List<RankingAtleta>,
    onSalva: (AmbitoRanking, Int) -> Unit,
    onElimina: (RankingAtleta) -> Unit,
    onChiudi: () -> Unit
) {
    var ambito by remember { mutableStateOf(AmbitoRanking.ITALIA) }
    var posizione by remember { mutableStateOf("") }
    val pos = posizione.toIntOrNull()

    AlertDialog(
        onDismissRequest = onChiudi,
        title = { Text("Ranking · ${suggerimento.gara.descrizione}") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    AmbitoRanking.entries.forEach { a ->
                        FilterChip(selected = a == ambito, onClick = { ambito = a }, label = { Text(a.etichetta) })
                    }
                }
                CampoNumero(posizione, { posizione = it }, "Posizione in classifica", Modifier.fillMaxWidth(), isError = posizione.isNotBlank() && (pos == null || pos < 1))
                esistenti.forEach { r ->
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            "${r.ambito.etichetta}: #${r.posizione} (${r.aggiornatoIl.formatta()})",
                            Modifier.weight(1f),
                            style = MaterialTheme.typography.bodySmall
                        )
                        TextButton(onClick = { onElimina(r) }) { Text("Elimina") }
                    }
                }
            }
        },
        confirmButton = {
            TextButton(enabled = pos != null && pos >= 1, onClick = { if (pos != null) onSalva(ambito, pos) }) { Text("Salva") }
        },
        dismissButton = { TextButton(onClick = onChiudi) { Text("Annulla") } }
    )
}