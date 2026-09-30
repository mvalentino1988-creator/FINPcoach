package com.mattia.nuotoparalimpico.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
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
import com.mattia.nuotoparalimpico.data.Assenza
import com.mattia.nuotoparalimpico.data.Atleta
import com.mattia.nuotoparalimpico.data.CondizioneMedica
import com.mattia.nuotoparalimpico.data.FaseMesociclo
import com.mattia.nuotoparalimpico.data.Mesociclo
import com.mattia.nuotoparalimpico.data.Microciclo
import com.mattia.nuotoparalimpico.data.StatoClassificazione
import com.mattia.nuotoparalimpico.data.TipoMicrociclo
import com.mattia.nuotoparalimpico.domain.AtletaValidator
import com.mattia.nuotoparalimpico.domain.Avviso
import com.mattia.nuotoparalimpico.domain.ClassiSportive
import com.mattia.nuotoparalimpico.domain.GeneratoreSmartSeduta
import com.mattia.nuotoparalimpico.domain.SchedaSeduta
import com.mattia.nuotoparalimpico.domain.VolumeIndividuale
import java.time.LocalDate
import java.time.Period
import kotlin.math.roundToInt

private fun descrizioneClasseEAge(a: Atleta, oggi: LocalDate): String {
    val classi = listOfNotNull(
        a.classeS?.let { "S$it" },
        a.classeSB?.let { "SB$it" },
        a.classeSM?.let { "SM$it" }
    ).joinToString(" · ").ifBlank { "Classi non indicate" }
    val etaText = a.dataNascita?.let {
        val anni = Period.between(it, oggi).years
        " · $anni anni"
    } ?: ""
    val statoText = if (a.stato == StatoClassificazione.IN_ATTESA) " (in attesa)" else ""
    return "$classi$etaText$statoText"
}

@Composable
fun AtletiScreen(vm: MainViewModel) {
    val atleti by vm.atleti.collectAsStateWithLifecycle()
    val condizioni by vm.condizioni.collectAsStateWithLifecycle()
    val assenze by vm.assenze.collectAsStateWithLifecycle()
    val meso by vm.meso.collectAsStateWithLifecycle()
    val micro by vm.micro.collectAsStateWithLifecycle()
    var nuovo by remember { mutableStateOf(false) }
    var selezionatoId by remember { mutableStateOf<Long?>(null) }
    val oggi = remember { LocalDate.now() }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        item {
            Button(
                onClick = { nuovo = true },
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("Aggiungi Nuovo Atleta")
            }
        }
        if (atleti.isEmpty()) item { Text("Nessun atleta inserito nella squadra.") }
        items(atleti, key = { it.id }) { a ->
            val avvisi = AtletaValidator.valida(
                a,
                condizioni.filter { it.atletaId == a.id },
                assenze.filter { it.atletaId == a.id },
                oggi
            )
            val condAttive = condizioni.count { it.atletaId == a.id && it.attiva }
            Card(
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                modifier = Modifier.fillMaxWidth().clickable { selezionatoId = a.id }
            ) {
                Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("${a.cognome} ${a.nome}", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        if (condAttive > 0) {
                            Surface(
                                color = MaterialTheme.colorScheme.errorContainer,
                                shape = RoundedCornerShape(6.dp)
                            ) {
                                Text(
                                    "$condAttive cond. medica",
                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                                    style = MaterialTheme.typography.labelSmall,
                                    color = MaterialTheme.colorScheme.onErrorContainer
                                )
                            }
                        }
                    }
                    Text(descrizioneClasseEAge(a, oggi), style = MaterialTheme.typography.bodyMedium)
                    if (a.fattoreVolume < 1.0) {
                        Text("Volume personalizzato: ${(a.fattoreVolume * 100).roundToInt()}% della squadra", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.primary)
                    }
                    ElencoAvvisi(avvisi)
                }
            }
        }
    }

    if (nuovo) {
        DialogAtleta(iniziale = null, onAnnulla = { nuovo = false }) {
            vm.aggiungiAtleta(it)
            nuovo = false
        }
    }

    atleti.firstOrNull { it.id == selezionatoId }?.let { a ->
        val cond = condizioni.filter { it.atletaId == a.id }
        val ass = assenze.filter { it.atletaId == a.id }
        DialogDettaglio(
            atleta = a,
            condizioni = cond,
            assenze = ass,
            meso = meso,
            micro = micro,
            oggi = oggi,
            avvisi = AtletaValidator.valida(a, cond, ass, oggi),
            vm = vm,
            onChiudi = { selezionatoId = null }
        )
    }
}

@Composable
fun DialogAtleta(iniziale: Atleta?, onAnnulla: () -> Unit, onSalva: (Atleta) -> Unit) {
    var nome by remember { mutableStateOf(iniziale?.nome ?: "") }
    var cognome by remember { mutableStateOf(iniziale?.cognome ?: "") }
    var nascita by remember { mutableStateOf(iniziale?.dataNascita?.formatta() ?: "") }
    var s by remember { mutableStateOf(iniziale?.classeS?.toString() ?: "") }
    var sb by remember { mutableStateOf(iniziale?.classeSB?.toString() ?: "") }
    var sm by remember { mutableStateOf(iniziale?.classeSM?.toString() ?: "") }
    var ufficiale by remember { mutableStateOf(iniziale?.stato == StatoClassificazione.UFFICIALE) }
    var fattore by remember { mutableStateOf(((iniziale?.fattoreVolume ?: 1.0) * 100).roundToInt().toString()) }
    var note by remember { mutableStateOf(iniziale?.note ?: "") }

    val cS = s.toIntOrNull()
    val cSB = sb.toIntOrNull()
    val cSM = sm.toIntOrNull()
    val errori = ClassiSportive.valida(cS, cSB, cSM)
    val nascitaOk = nascita.isBlank() || parseData(nascita) != null
    val fatt = fattore.toIntOrNull()
    val fattoreOk = fatt != null && fatt in 10..100
    val valido = nome.isNotBlank() && cognome.isNotBlank() && errori.isEmpty() && nascitaOk && fattoreOk

    AlertDialog(
        onDismissRequest = onAnnulla,
        title = { Text(if (iniziale == null) "Nuovo Atleta" else "Modifica Atleta") },
        text = {
            Column(Modifier.verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(nome, { nome = it }, label = { Text("Nome") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(cognome, { cognome = it }, label = { Text("Cognome") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                CampoData(nascita, { nascita = it }, "Data di nascita (facoltativa)", modifier = Modifier.fillMaxWidth())
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    CampoNumero(s, { s = it }, "Classe S", Modifier.weight(1f))
                    CampoNumero(sb, { sb = it }, "SB", Modifier.weight(1f))
                    CampoNumero(sm, { sm = it }, "SM", Modifier.weight(1f))
                }
                errori.forEach { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall) }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("Classificazione ufficiale FINP", Modifier.weight(1f))
                    Switch(checked = ufficiale, onCheckedChange = { ufficiale = it })
                }
                CampoNumero(fattore, { fattore = it }, "Volume rispetto alla squadra (10-100 %)", modifier = Modifier.fillMaxWidth(), isError = !fattoreOk)
                OutlinedTextField(note, { note = it }, label = { Text("Note particolari") }, modifier = Modifier.fillMaxWidth())
            }
        },
        confirmButton = {
            TextButton(
                enabled = valido,
                onClick = {
                    val base = iniziale ?: Atleta(nome = "", cognome = "")
                    onSalva(
                        base.copy(
                            nome = nome.trim(),
                            cognome = cognome.trim(),
                            dataNascita = parseData(nascita),
                            classeS = cS,
                            classeSB = cSB,
                            classeSM = cSM,
                            stato = if (ufficiale) StatoClassificazione.UFFICIALE else StatoClassificazione.IN_ATTESA,
                            fattoreVolume = (fatt ?: 100) / 100.0,
                            note = note.trim()
                        )
                    )
                }
            ) { Text("Salva") }
        },
        dismissButton = { TextButton(onClick = onAnnulla) { Text("Annulla") } }
    )
}

@Composable
private fun DialogDettaglio(
    atleta: Atleta,
    condizioni: List<CondizioneMedica>,
    assenze: List<Assenza>,
    meso: List<Mesociclo>,
    micro: List<Microciclo>,
    oggi: LocalDate,
    avvisi: List<Avviso>,
    vm: MainViewModel,
    onChiudi: () -> Unit
) {
    var modifica by remember { mutableStateOf(false) }
    var conferma by remember { mutableStateOf(false) }
    var descrizione by remember { mutableStateOf("") }
    var limitazioni by remember { mutableStateOf("") }
    var dal by remember { mutableStateOf("") }
    var al by remember { mutableStateOf("") }
    var motivo by remember { mutableStateOf("") }
    var schedaSmartAtleta by remember { mutableStateOf<SchedaSeduta?>(null) }

    val dalData = parseData(dal)
    val alData = parseData(al)

    AlertDialog(
        onDismissRequest = onChiudi,
        title = {
            Column {
                Text("${atleta.cognome} ${atleta.nome}", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                Text(descrizioneClasseEAge(atleta, oggi), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        },
        text = {
            Column(Modifier.verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                ElencoAvvisi(avvisi)

                // Pulsante Genera Scheda Personalizzata
                val microCorrente = micro.firstOrNull { !it.inizio.isAfter(oggi) && !it.fine.isBefore(oggi) } ?: micro.firstOrNull()
                val mesoCorrente = microCorrente?.let { mi -> meso.firstOrNull { it.id == mi.mesocicloId } }
                Button(
                    onClick = {
                        val volumeSett = microCorrente?.let { VolumeIndividuale.settimana(it, atleta, assenze).metri } ?: 1800
                        val sedute = microCorrente?.sedutePreviste?.coerceAtLeast(1) ?: 3
                        val metriSeduta = volumeSett / sedute
                        schedaSmartAtleta = GeneratoreSmartSeduta.genera(
                            data = oggi,
                            metriTarget = metriSeduta,
                            fase = mesoCorrente?.fase ?: FaseMesociclo.PREPARAZIONE_SPECIFICA,
                            tipoMicro = microCorrente?.tipo ?: TipoMicrociclo.CARICO,
                            atleta = atleta,
                            condizioniMediche = condizioni
                        )
                    },
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Genera Scheda Personalizzata 🏊‍♂️")
                }

                Titolo("Volume delle Prossime Settimane", Icons.Filled.DateRange)
                val prossime = micro.filter { !it.fine.isBefore(oggi) }.take(4)
                if (prossime.isEmpty()) {
                    Text("Nessun piano generato.", style = MaterialTheme.typography.bodySmall)
                } else {
                    prossime.forEach { m ->
                        val v = VolumeIndividuale.settimana(m, atleta, assenze)
                        val dettaglio = if (v.note.isEmpty()) "" else " (${v.note.joinToString(", ")})"
                        Text(
                            "${m.inizio.formatta()} · ${m.tipo.etichetta} · ${v.metri} m$dettaglio",
                            style = MaterialTheme.typography.bodySmall
                        )
                    }
                }

                Titolo("Condizioni Mediche & Limitazioni", Icons.Filled.Info)
                condizioni.forEach { c ->
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) {
                            Text(c.descrizione, fontWeight = FontWeight.SemiBold)
                            if (c.limitazioni.isNotBlank()) {
                                Text("Limitazioni: ${c.limitazioni}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.error)
                            }
                        }
                        TextButton(onClick = { vm.eliminaCondizione(c) }) { Text("Elimina") }
                    }
                }
                OutlinedTextField(descrizione, { descrizione = it }, label = { Text("Diagnosi / Condizione medica") }, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(limitazioni, { limitazioni = it }, label = { Text("Limitazioni fisiche per l'allenamento") }, modifier = Modifier.fillMaxWidth())
                Button(
                    enabled = descrizione.isNotBlank(),
                    onClick = {
                        vm.aggiungiCondizione(
                            CondizioneMedica(atletaId = atleta.id, descrizione = descrizione.trim(), limitazioni = limitazioni.trim())
                        )
                        descrizione = ""
                        limitazioni = ""
                    },
                    modifier = Modifier.fillMaxWidth()
                ) { Text("Aggiungi Condizione Medica") }

                Titolo("Assenze Programmate", Icons.Filled.DateRange)
                assenze.forEach { a ->
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            "${a.dal.formatta()} – ${a.al.formatta()}" + if (a.motivo.isNotBlank()) " · ${a.motivo}" else "",
                            Modifier.weight(1f)
                        )
                        TextButton(onClick = { vm.eliminaAssenza(a) }) { Text("Elimina") }
                    }
                }
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    CampoData(dal, { dal = it }, "Dal", Modifier.weight(1f))
                    CampoData(al, { al = it }, "Al", Modifier.weight(1f))
                }
                OutlinedTextField(motivo, { motivo = it }, label = { Text("Motivo assenza") }, modifier = Modifier.fillMaxWidth())
                Button(
                    enabled = dalData != null && alData != null && !alData.isBefore(dalData),
                    onClick = {
                        if (dalData != null && alData != null) {
                            vm.aggiungiAssenza(Assenza(atletaId = atleta.id, dal = dalData, al = alData, motivo = motivo.trim()))
                            dal = ""
                            al = ""
                            motivo = ""
                        }
                    },
                    modifier = Modifier.fillMaxWidth()
                ) { Text("Registra Assenza") }
            }
        },
        confirmButton = { TextButton(onClick = onChiudi) { Text("Chiudi") } },
        dismissButton = {
            Row {
                TextButton(onClick = { modifica = true }) { Text("Modifica") }
                TextButton(onClick = { conferma = true }) { Text("Elimina") }
            }
        }
    )

    schedaSmartAtleta?.let { scheda ->
        DialogSchedaSedutaSmart(
            scheda = scheda,
            onChiudi = { schedaSmartAtleta = null }
        )
    }

    if (modifica) {
        DialogAtleta(iniziale = atleta, onAnnulla = { modifica = false }) {
            vm.aggiornaAtleta(it)
            modifica = false
        }
    }
    if (conferma) {
        AlertDialog(
            onDismissRequest = { conferma = false },
            title = { Text("Eliminare ${atleta.nome}?") },
            text = { Text("Verranno eliminati anche condizioni mediche, assenze, tempi e log. L'operazione non è reversibile.") },
            confirmButton = {
                TextButton(onClick = {
                    vm.eliminaAtleta(atleta)
                    conferma = false
                    onChiudi()
                }) { Text("Elimina") }
            },
            dismissButton = { TextButton(onClick = { conferma = false }) { Text("Annulla") } }
        )
    }
}
