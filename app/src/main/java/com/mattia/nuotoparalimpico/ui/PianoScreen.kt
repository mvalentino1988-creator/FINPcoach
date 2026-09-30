package com.mattia.nuotoparalimpico.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Info
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
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
import com.mattia.nuotoparalimpico.data.FaseMesociclo
import com.mattia.nuotoparalimpico.data.Gara
import com.mattia.nuotoparalimpico.data.Mesociclo
import com.mattia.nuotoparalimpico.data.Microciclo
import com.mattia.nuotoparalimpico.data.Stagione
import com.mattia.nuotoparalimpico.data.TipoMicrociclo
import com.mattia.nuotoparalimpico.domain.GeneratoreSmartSeduta
import com.mattia.nuotoparalimpico.domain.ParametriPiano
import com.mattia.nuotoparalimpico.domain.SchedaSeduta
import java.time.DayOfWeek

private val NOMI_GIORNI = mapOf(
    DayOfWeek.MONDAY to "Lun",
    DayOfWeek.TUESDAY to "Mar",
    DayOfWeek.WEDNESDAY to "Mer",
    DayOfWeek.THURSDAY to "Gio",
    DayOfWeek.FRIDAY to "Ven",
    DayOfWeek.SATURDAY to "Sab",
    DayOfWeek.SUNDAY to "Dom"
)

@Composable
fun PianoScreen(vm: MainViewModel) {
    val stagione by vm.stagione.collectAsStateWithLifecycle()
    Column(
        Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        val s = stagione
        if (s == null) FormStagione(vm) else ContenutoStagione(vm, s)
    }
}

@Composable
private fun FormStagione(vm: MainViewModel) {
    var nome by remember { mutableStateOf("") }
    var inizio by remember { mutableStateOf("") }
    var fine by remember { mutableStateOf("") }
    val i = parseData(inizio)
    val f = parseData(fine)

    Titolo("Nuova Stagione Agonistica", Icons.Filled.DateRange)
    OutlinedTextField(nome, { nome = it }, label = { Text("Nome (es. 2026/27)") }, singleLine = true, modifier = Modifier.fillMaxWidth())
    CampoData(inizio, { inizio = it }, "Inizio stagione", modifier = Modifier.fillMaxWidth())
    CampoData(fine, { fine = it }, "Fine stagione", modifier = Modifier.fillMaxWidth())
    if (i != null && f != null && !f.isAfter(i)) {
        Text("La fine deve essere dopo l'inizio", color = MaterialTheme.colorScheme.error)
    }
    Button(
        enabled = nome.isNotBlank() && i != null && f != null && f.isAfter(i),
        onClick = { if (i != null && f != null) vm.creaStagione(nome.trim(), i, f) },
        modifier = Modifier.fillMaxWidth()
    ) { Text("Crea Stagione") }
}

@Composable
private fun ContenutoStagione(vm: MainViewModel, s: Stagione) {
    val chiusure by vm.chiusure.collectAsStateWithLifecycle()
    val gare by vm.gare.collectAsStateWithLifecycle()
    val macro by vm.macro.collectAsStateWithLifecycle()
    val meso by vm.meso.collectAsStateWithLifecycle()
    val micro by vm.micro.collectAsStateWithLifecycle()
    val avvisi by vm.avvisiPiano.collectAsStateWithLifecycle()
    var confermaElimina by remember { mutableStateOf(false) }
    var microSelezionato by remember { mutableStateOf<Microciclo?>(null) }
    var schedaSmartVisualizzata by remember { mutableStateOf<SchedaSeduta?>(null) }

    // ----- Intestazione -----
    Surface(
        color = MaterialTheme.colorScheme.primaryContainer,
        shape = RoundedCornerShape(16.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text("Stagione ${s.nome}", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onPrimaryContainer)
            Text("${s.inizio.formatta()} – ${s.fine.formatta()} · Vasca da ${s.vascaMetri} m", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onPrimaryContainer)
            OutlinedButton(onClick = { confermaElimina = true }) { Text("Elimina stagione") }
        }
    }

    HorizontalDivider()

    // ----- Chiusure -----
    Titolo("Chiusure e Festività", Icons.Filled.Info)
    chiusure.forEach { c ->
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(
                if (c.dal == c.al) "${c.dal.formatta()} · ${c.motivo}"
                else "${c.dal.formatta()} – ${c.al.formatta()} · ${c.motivo}",
                Modifier.weight(1f),
                style = MaterialTheme.typography.bodyMedium
            )
            TextButton(onClick = { vm.eliminaChiusura(c) }) { Text("Elimina") }
        }
    }
    var cDal by remember { mutableStateOf("") }
    var cAl by remember { mutableStateOf("") }
    var cMotivo by remember { mutableStateOf("") }
    val cDalData = parseData(cDal)
    val cAlData = parseData(cAl)
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        CampoData(cDal, { cDal = it }, "Dal", Modifier.weight(1f))
        CampoData(cAl, { cAl = it }, "Al", Modifier.weight(1f))
    }
    OutlinedTextField(cMotivo, { cMotivo = it }, label = { Text("Motivo (es. Festività natalizie)") }, singleLine = true, modifier = Modifier.fillMaxWidth())
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        Button(
            enabled = cDalData != null && cAlData != null && !cAlData.isBefore(cDalData) && cMotivo.isNotBlank(),
            onClick = {
                if (cDalData != null && cAlData != null) {
                    vm.aggiungiChiusura(cDalData, cAlData, cMotivo.trim())
                    cDal = ""; cAl = ""; cMotivo = ""
                }
            }
        ) { Text("Aggiungi") }
        OutlinedButton(onClick = { vm.aggiungiFestivitaNazionali() }) { Text("Festività nazionali") }
    }

    HorizontalDivider()

    // ----- Gare -----
    Titolo("Gare Agonistiche", Icons.Filled.DateRange)
    gare.forEach { g ->
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(
                "${g.dal.formatta()} · ${g.nome}" + if (g.prioritaria) " (prioritaria ⭐)" else "",
                Modifier.weight(1f),
                fontWeight = if (g.prioritaria) FontWeight.Bold else FontWeight.Normal
            )
            TextButton(onClick = { vm.eliminaGara(g) }) { Text("Elimina") }
        }
    }
    var gNome by remember { mutableStateOf("") }
    var gDal by remember { mutableStateOf("") }
    var gAl by remember { mutableStateOf("") }
    var gPrioritaria by remember { mutableStateOf(false) }
    val gDalData = parseData(gDal)
    val gAlData = if (gAl.isBlank()) gDalData else parseData(gAl)
    OutlinedTextField(gNome, { gNome = it }, label = { Text("Nome gara") }, singleLine = true, modifier = Modifier.fillMaxWidth())
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        CampoData(gDal, { gDal = it }, "Data inizio", Modifier.weight(1f))
        CampoData(gAl, { gAl = it }, "Data fine (opzionale)", Modifier.weight(1f))
    }
    Row(verticalAlignment = Alignment.CenterVertically) {
        Checkbox(checked = gPrioritaria, onCheckedChange = { gPrioritaria = it })
        Text("Gara prioritaria (sincronizza il tapering e le fasi)")
    }
    Button(
        enabled = gNome.isNotBlank() && gDalData != null && gAlData != null && !gAlData.isBefore(gDalData),
        onClick = {
            if (gDalData != null && gAlData != null) {
                vm.aggiungiGara(gNome.trim(), gDalData, gAlData, gPrioritaria)
                gNome = ""; gDal = ""; gAl = ""; gPrioritaria = false
            }
        }
    ) { Text("Aggiungi Gara") }

    HorizontalDivider()

    // ----- Parametri e Generazione -----
    Titolo("Generazione Smart del Piano", Icons.Filled.Edit)
    var giorni by remember { mutableStateOf(setOf(DayOfWeek.WEDNESDAY, DayOfWeek.SATURDAY)) }
    var nMacro by remember { mutableStateOf("1") }
    var metri by remember { mutableStateOf("1800") }
    var ciclo by remember { mutableStateOf("4") }

    Text("Giorni di Allenamento in Vasca", style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.SemiBold)
    Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
        DayOfWeek.entries.forEach { g ->
            FilterChip(
                selected = g in giorni,
                onClick = { giorni = if (g in giorni) giorni - g else giorni + g },
                label = { Text(NOMI_GIORNI.getValue(g)) }
            )
        }
    }

    val nMacroInt = nMacro.toIntOrNull()
    val metriInt = metri.toIntOrNull()
    val cicloInt = ciclo.toIntOrNull()
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        CampoNumero(nMacro, { nMacro = it }, "Macrocicli", Modifier.weight(1f), isError = nMacroInt == null || nMacroInt !in 1..3)
        CampoNumero(metri, { metri = it }, "Metri base seduta", Modifier.weight(1f), isError = metriInt == null || metriInt !in 200..10_000)
    }
    CampoNumero(ciclo, { ciclo = it }, "Un ciclo di scarico ogni N settimane", modifier = Modifier.fillMaxWidth(), isError = cicloInt == null || cicloInt !in 2..8)

    val parametriOk = giorni.isNotEmpty() &&
            nMacroInt != null && nMacroInt in 1..3 &&
            metriInt != null && metriInt in 200..10_000 &&
            cicloInt != null && cicloInt in 2..8

    Button(
        enabled = parametriOk,
        onClick = {
            if (nMacroInt != null && metriInt != null && cicloInt != null) {
                vm.generaPiano(ParametriPiano(giorni, nMacroInt, metriInt, cicloInt))
            }
        },
        modifier = Modifier.fillMaxWidth()
    ) { Text(if (micro.isEmpty()) "Genera Piano Agonistico" else "Rigenera Piano Agonistico") }

    // ----- Avvisi -----
    if (avvisi.isNotEmpty()) {
        HorizontalDivider()
        Titolo("Controlli sul Piano", Icons.Filled.Info)
        ElencoAvvisi(avvisi)
    }

    // ----- Piano -----
    if (micro.isNotEmpty()) {
        HorizontalDivider()
        Titolo("Programmazione e Microcicli", Icons.Filled.DateRange)
        Text("Tocca una settimana per modificarla o generare la Scheda d'Allenamento Smart per la Vasca.", style = MaterialTheme.typography.bodySmall)
        val volumeMax = micro.maxOfOrNull { it.volumeTargetMetri } ?: 0
        macro.forEach { ma ->
            Text(
                "${ma.nome} · ${ma.inizio.formatta()} – ${ma.fine.formatta()}",
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Bold
            )
            if (ma.obiettivo.isNotBlank()) {
                Text(ma.obiettivo, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.primary)
            }
            meso.filter { it.macrocicloId == ma.id }.forEach { me ->
                Text(
                    "${me.fase.etichetta} · ${me.inizio.formatta()} – ${me.fine.formatta()}",
                    style = MaterialTheme.typography.labelLarge,
                    fontWeight = FontWeight.SemiBold
                )
                micro.filter { it.mesocicloId == me.id }.forEach { mi ->
                    CardMicro(
                        mi = mi,
                        faseMesociclo = me.fase,
                        gareSettimana = gare.filter { !it.dal.isAfter(mi.fine) && !it.al.isBefore(mi.inizio) },
                        volumeMax = volumeMax,
                        onClick = { microSelezionato = mi },
                        onMostraScheda = {
                            val metriSeduta = if (mi.sedutePreviste > 0) mi.volumeTargetMetri / mi.sedutePreviste else 1800
                            schedaSmartVisualizzata = GeneratoreSmartSeduta.genera(
                                data = mi.inizio,
                                metriTarget = metriSeduta,
                                fase = me.fase,
                                tipoMicro = mi.tipo
                            )
                        }
                    )
                }
            }
        }
    }

    microSelezionato?.let { mi ->
        DialogMicro(
            mi = mi,
            onAnnulla = { microSelezionato = null },
            onSalva = { vm.modificaMicro(it); microSelezionato = null },
            onSblocca = { vm.sbloccaMicro(it); microSelezionato = null }
        )
    }

    schedaSmartVisualizzata?.let { scheda ->
        DialogSchedaSedutaSmart(
            scheda = scheda,
            onChiudi = { schedaSmartVisualizzata = null }
        )
    }

    if (confermaElimina) {
        AlertDialog(
            onDismissRequest = { confermaElimina = false },
            title = { Text("Eliminare la stagione?") },
            text = { Text("Verranno eliminati chiusure, gare e piano. Gli atleti restano salvati.") },
            confirmButton = {
                TextButton(onClick = {
                    vm.eliminaStagione()
                    confermaElimina = false
                }) { Text("Elimina") }
            },
            dismissButton = { TextButton(onClick = { confermaElimina = false }) { Text("Annulla") } }
        )
    }
}

@Composable
private fun CardMicro(
    mi: Microciclo,
    faseMesociclo: FaseMesociclo,
    gareSettimana: List<Gara>,
    volumeMax: Int,
    onClick: () -> Unit,
    onMostraScheda: () -> Unit
) {
    val colore = when (mi.tipo) {
        TipoMicrociclo.CARICO -> MaterialTheme.colorScheme.primaryContainer
        TipoMicrociclo.SCARICO, TipoMicrociclo.RECUPERO -> MaterialTheme.colorScheme.secondaryContainer
        TipoMicrociclo.GARA -> MaterialTheme.colorScheme.tertiaryContainer
        TipoMicrociclo.ADATTAMENTO, TipoMicrociclo.PAUSA -> MaterialTheme.colorScheme.surfaceVariant
    }
    Card(
        colors = CardDefaults.cardColors(containerColor = colore),
        shape = RoundedCornerShape(12.dp),
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick)
    ) {
        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(
                    "${mi.inizio.formatta()} · ${mi.tipo.etichetta}" + if (mi.bloccato) " 🔒" else "",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold
                )
                TextButton(onClick = onMostraScheda) {
                    Text("Scheda Smart 🏊‍♂️", style = MaterialTheme.typography.labelMedium)
                }
            }
            Text("${mi.sedutePreviste} sedute · ${mi.volumeTargetMetri} m (squadra)", style = MaterialTheme.typography.bodySmall)
            if (volumeMax > 0) {
                LinearProgressIndicator(
                    progress = { mi.volumeTargetMetri.toFloat() / volumeMax },
                    modifier = Modifier.fillMaxWidth()
                )
            }

            // Anteprima Ripartizione Codici
            val metriSeduta = if (mi.sedutePreviste > 0) mi.volumeTargetMetri / mi.sedutePreviste else 1800
            val schedaAnteprima = remember(mi, faseMesociclo) {
                GeneratoreSmartSeduta.genera(mi.inizio, metriSeduta, faseMesociclo, mi.tipo)
            }
            IndicatoreRipartizioneCodici(schedaAnteprima.ripartizioneCodici, schedaAnteprima.volumeTotaleMetri)

            gareSettimana.forEach { g ->
                Text(
                    "🏆 Gara: ${g.nome}" + if (g.prioritaria) " (prioritaria)" else "",
                    style = MaterialTheme.typography.bodySmall,
                    fontWeight = FontWeight.SemiBold
                )
            }
            if (mi.note.isNotBlank()) {
                Text(mi.note, style = MaterialTheme.typography.bodySmall)
            }
        }
    }
}

@Composable
private fun DialogMicro(
    mi: Microciclo,
    onAnnulla: () -> Unit,
    onSalva: (Microciclo) -> Unit,
    onSblocca: (Microciclo) -> Unit
) {
    var tipo by remember { mutableStateOf(mi.tipo) }
    var sedute by remember { mutableStateOf(mi.sedutePreviste.toString()) }
    var metri by remember { mutableStateOf(mi.volumeTargetMetri.toString()) }
    var note by remember { mutableStateOf(mi.note) }

    val seduteInt = sedute.toIntOrNull()
    val metriInt = metri.toIntOrNull()
    val valido = seduteInt != null && seduteInt in 0..14 && metriInt != null && metriInt in 0..100_000

    AlertDialog(
        onDismissRequest = onAnnulla,
        title = { Text("Settimana del ${mi.inizio.formatta()}") },
        text = {
            Column(Modifier.verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    TipoMicrociclo.entries.forEach { t ->
                        FilterChip(selected = t == tipo, onClick = { tipo = t }, label = { Text(t.etichetta) })
                    }
                }
                CampoNumero(sedute, { sedute = it }, "Sedute (0-14)", isError = !(seduteInt != null && seduteInt in 0..14))
                CampoNumero(metri, { metri = it }, "Volume di squadra (m)", isError = metriInt == null)
                OutlinedTextField(note, { note = it }, label = { Text("Note") })
                Text(
                    "La modifica viene mantenuta quando rigeneri il piano.",
                    style = MaterialTheme.typography.bodySmall
                )
            }
        },
        confirmButton = {
            TextButton(
                enabled = valido,
                onClick = {
                    if (seduteInt != null && metriInt != null) {
                        onSalva(mi.copy(tipo = tipo, sedutePreviste = seduteInt, volumeTargetMetri = metriInt, note = note.trim()))
                    }
                }
            ) { Text("Salva") }
        },
        dismissButton = {
            Row {
                if (mi.bloccato) TextButton(onClick = { onSblocca(mi) }) { Text("Sblocca") }
                TextButton(onClick = onAnnulla) { Text("Annulla") }
            }
        }
    )
}
