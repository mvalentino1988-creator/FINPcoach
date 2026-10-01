package com.mattia.nuotoparalimpico.ui

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.List
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.mattia.nuotoparalimpico.data.Assenza
import com.mattia.nuotoparalimpico.data.Atleta
import com.mattia.nuotoparalimpico.data.ContestoTempo
import com.mattia.nuotoparalimpico.data.FaseMesociclo
import com.mattia.nuotoparalimpico.data.LogSeduta
import com.mattia.nuotoparalimpico.data.Microciclo
import com.mattia.nuotoparalimpico.data.Stile
import com.mattia.nuotoparalimpico.data.Tempo
import com.mattia.nuotoparalimpico.data.TipoMicrociclo
import com.mattia.nuotoparalimpico.domain.CalcoloScienzaNuoto
import com.mattia.nuotoparalimpico.domain.GeneratoreSmartSeduta
import com.mattia.nuotoparalimpico.domain.Riepilogo
import com.mattia.nuotoparalimpico.domain.SchedaSeduta
import com.mattia.nuotoparalimpico.domain.VolumeIndividuale
import com.mattia.nuotoparalimpico.domain.formattaTempo
import com.mattia.nuotoparalimpico.domain.parseTempo
import com.mattia.nuotoparalimpico.domain.primatiPersonali
import java.time.LocalDate
import java.util.Locale

private val NOMI_STILI = mapOf(
    Stile.STILE_LIBERO to "Stile libero",
    Stile.DORSO to "Dorso",
    Stile.RANA to "Rana",
    Stile.FARFALLA to "Farfalla",
    Stile.MISTI to "Misti"
)

private val NOMI_CONTESTI = mapOf(
    ContestoTempo.GARA to "Gara",
    ContestoTempo.ALLENAMENTO to "Allenamento",
    ContestoTempo.TEST to "Test"
)

@Composable
fun RegistroScreen(vm: MainViewModel, rvm: RegistroViewModel) {
    val atleti by vm.atleti.collectAsStateWithLifecycle()
    var sezione by rememberSaveable { mutableIntStateOf(0) }
    var atletaSelId by rememberSaveable { mutableStateOf<Long?>(null) }
    val atletaSel = atleti.firstOrNull { it.id == atletaSelId } ?: atleti.firstOrNull()

    Column(Modifier.fillMaxSize()) {
        TabRow(selectedTabIndex = sezione) {
            listOf("Seduta", "Tempi", "Storico").forEachIndexed { i, titolo ->
                Tab(selected = sezione == i, onClick = { sezione = i }, text = { Text(titolo, fontWeight = FontWeight.SemiBold) })
            }
        }
        Column(
            Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            if (atleti.isEmpty() || atletaSel == null) {
                Text("Aggiungi prima almeno un atleta nella scheda Atleti.")
            } else if (sezione == 0) {
                SezioneSeduta(vm, rvm)
            } else {
                SelettoreAtleta(atleti, atletaSel.id) { atletaSelId = it }
                if (sezione == 1) SezioneTempi(atletaSel, rvm) else SezioneStorico(atletaSel, vm, rvm)
            }
        }
    }
}

@Composable
private fun SelettoreAtleta(atleti: List<Atleta>, selezionatoId: Long, onScelta: (Long) -> Unit) {
    Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
        atleti.forEach { a ->
            FilterChip(
                selected = a.id == selezionatoId,
                onClick = { onScelta(a.id) },
                label = { Text("${a.cognome} ${a.nome}") }
            )
        }
    }
}

// ---------------------------------------------------------------- SEDUTA

private class RigaSeduta(presente: Boolean, metri: String, rpe: String) {
    var presente by mutableStateOf(presente)
    var metri by mutableStateOf(metri)
    var rpe by mutableStateOf(rpe)
}

private fun RigaSeduta.valida(): Boolean {
    val m = metri.toIntOrNull()
    val r = rpe.toIntOrNull()
    val metriOk = metri.isBlank() || (m != null && m in 0..20_000)
    val rpeOk = rpe.isBlank() || (r != null && r in 1..10)
    return metriOk && rpeOk
}

private fun creaRiga(
    a: Atleta,
    data: LocalDate?,
    assenzeAtleta: List<Assenza>,
    micro: List<Microciclo>,
    log: List<LogSeduta>
): RigaSeduta {
    if (data == null) return RigaSeduta(true, "", "")
    val esistente = log.firstOrNull { it.atletaId == a.id && it.data == data }
    if (esistente != null) {
        return RigaSeduta(
            esistente.presente,
            if (esistente.presente) esistente.metriEffettivi.toString() else "",
            esistente.rpe?.toString() ?: ""
        )
    }
    val assente = assenzeAtleta.any { !data.isBefore(it.dal) && !data.isAfter(it.al) }
    val settimana = micro.firstOrNull { !data.isBefore(it.inizio) && !data.isAfter(it.fine) }
    val previsti = if (settimana != null && settimana.sedutePreviste > 0) {
        VolumeIndividuale.settimana(settimana, a, assenzeAtleta).metri / settimana.sedutePreviste
    } else 0
    return RigaSeduta(!assente, if (previsti > 0) previsti.toString() else "", "")
}

@Composable
private fun SezioneSeduta(vm: MainViewModel, rvm: RegistroViewModel) {
    val atleti by vm.atleti.collectAsStateWithLifecycle()
    val assenze by vm.assenze.collectAsStateWithLifecycle()
    val meso by vm.meso.collectAsStateWithLifecycle()
    val micro by vm.micro.collectAsStateWithLifecycle()
    val log by rvm.log.collectAsStateWithLifecycle()

    var dataTesto by remember { mutableStateOf(LocalDate.now().formatta()) }
    var durata by remember { mutableStateOf("60") }
    var schedaGiorno by remember { mutableStateOf<SchedaSeduta?>(null) }

    val data = parseData(dataTesto)
    val durataInt = durata.toIntOrNull()

    val righe = remember(data, atleti, assenze, micro, log) {
        atleti.associate { a -> a.id to creaRiga(a, data, assenze.filter { it.atletaId == a.id }, micro, log) }
    }
    val giaRegistrata = data != null && log.any { it.data == data }

    Titolo("Registra Seduta di Vasca", Icons.Filled.DateRange)
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        CampoData(dataTesto, { dataTesto = it }, "Data", Modifier.weight(1f))
        CampoNumero(durata, { durata = it }, "Durata (minuti)", Modifier.weight(1f), isError = durataInt == null || durataInt !in 1..300)
    }

    // Pulsante per vedere la scheda d'allenamento generata per il giorno
    OutlinedButton(
        onClick = {
            val d = data ?: LocalDate.now()
            val mic = micro.firstOrNull { !d.isBefore(it.inizio) && !d.isAfter(it.fine) }
            val mes = mic?.let { m -> meso.firstOrNull { it.id == m.mesocicloId } }
            val volumeMedia = if (mic != null && mic.sedutePreviste > 0) mic.volumeTargetMetri / mic.sedutePreviste else 1800
            schedaGiorno = GeneratoreSmartSeduta.genera(
                data = d,
                metriTarget = volumeMedia,
                fase = mes?.fase ?: FaseMesociclo.PREPARAZIONE_SPECIFICA,
                tipoMicro = mic?.tipo ?: TipoMicrociclo.CARICO
            )
        },
        modifier = Modifier.fillMaxWidth()
    ) {
        Text("Scheda Bordo Vasca del Giorno 🏊‍♂️")
    }

    Text(
        "Spunta i presenti e indica metri effettivi e RPE (1-10). I metri sono precompilati dal piano.",
        style = MaterialTheme.typography.bodySmall
    )
    if (giaRegistrata) {
        Text(
            "Per questa data c'è già una seduta registrata: salvando verrà sostituita.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.tertiary
        )
    }

    atleti.forEach { a ->
        val r = righe[a.id] ?: return@forEach
        Card(
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
            shape = RoundedCornerShape(10.dp),
            modifier = Modifier.fillMaxWidth().padding(vertical = 2.dp)
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                modifier = Modifier.padding(8.dp)
            ) {
                Checkbox(checked = r.presente, onCheckedChange = { r.presente = it })
                Text("${a.cognome} ${a.nome}", Modifier.weight(1f), fontWeight = FontWeight.Bold)
                if (r.presente) {
                    CampoNumero(r.metri, { r.metri = it }, "Metri", Modifier.width(100.dp))
                    CampoNumero(r.rpe, { r.rpe = it }, "RPE (1-10)", Modifier.width(90.dp), isError = !r.valida())
                }
            }
        }
    }

    val valido = data != null && durataInt != null && durataInt in 1..300 &&
        righe.values.all { !it.presente || it.valida() }

    Button(
        enabled = valido,
        onClick = {
            if (data != null && durataInt != null) {
                rvm.salvaSeduta(
                    data,
                    atleti.mapNotNull { a ->
                        righe[a.id]?.let { r ->
                            LogSeduta(
                                atletaId = a.id,
                                data = data,
                                presente = r.presente,
                                durataMin = if (r.presente) durataInt else 0,
                                metriEffettivi = if (r.presente) r.metri.toIntOrNull() ?: 0 else 0,
                                rpe = if (r.presente) r.rpe.toIntOrNull() else null
                            )
                        }
                    }
                )
            }
        },
        modifier = Modifier.fillMaxWidth()
    ) { Text(if (giaRegistrata) "Aggiorna Seduta" else "Salva Seduta") }

    schedaGiorno?.let { scheda ->
        DialogSchedaSedutaSmart(
            scheda = scheda,
            onChiudi = { schedaGiorno = null }
        )
    }
}

// ---------------------------------------------------------------- TEMPI

@Composable
private fun SezioneTempi(atleta: Atleta, rvm: RegistroViewModel) {
    val tempi by rvm.tempi.collectAsStateWithLifecycle()
    val mieiTempi = tempi.filter { it.atletaId == atleta.id }

    var dataTesto by remember { mutableStateOf(LocalDate.now().formatta()) }
    var stile by remember { mutableStateOf(Stile.STILE_LIBERO) }
    var distanza by remember { mutableStateOf("50") }
    var tempoTesto by remember { mutableStateOf("") }
    var contesto by remember { mutableStateOf(ContestoTempo.GARA) }
    var vasca by remember { mutableStateOf(25) }
    var note by remember { mutableStateOf("") }

    val data = parseData(dataTesto)
    val distanzaInt = distanza.toIntOrNull()
    val centesimi = parseTempo(tempoTesto)

    Titolo("Nuovo Tempo · ${atleta.nome}", Icons.Filled.DateRange)
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        CampoData(dataTesto, { dataTesto = it }, "Data", Modifier.weight(1f))
        CampoNumero(distanza, { distanza = it }, "Distanza (m)", Modifier.weight(1f), isError = distanzaInt == null || distanzaInt !in 25..1500)
    }
    Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
        Stile.entries.forEach { s ->
            FilterChip(selected = s == stile, onClick = { stile = s }, label = { Text(NOMI_STILI.getValue(s)) })
        }
    }
    OutlinedTextField(
        value = tempoTesto,
        onValueChange = { tempoTesto = it },
        label = { Text("Tempo (es. 1:02.35 o 28.40)") },
        singleLine = true,
        isError = tempoTesto.isNotBlank() && centesimi == null,
        modifier = Modifier.fillMaxWidth()
    )
    Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
        ContestoTempo.entries.forEach { c ->
            FilterChip(selected = c == contesto, onClick = { contesto = c }, label = { Text(NOMI_CONTESTI.getValue(c)) })
        }
        listOf(25, 50).forEach { v ->
            FilterChip(selected = v == vasca, onClick = { vasca = v }, label = { Text("Vasca $v m") })
        }
    }
    OutlinedTextField(note, { note = it }, label = { Text("Note") }, modifier = Modifier.fillMaxWidth())
    Button(
        enabled = data != null && distanzaInt != null && distanzaInt in 25..1500 && centesimi != null,
        onClick = {
            if (data != null && distanzaInt != null && centesimi != null) {
                rvm.aggiungiTempo(
                    Tempo(
                        atletaId = atleta.id,
                        data = data,
                        stile = stile,
                        distanzaMetri = distanzaInt,
                        centesimi = centesimi,
                        contesto = contesto,
                        vascaMetri = vasca,
                        note = note.trim()
                    )
                )
                tempoTesto = ""
                note = ""
            }
        },
        modifier = Modifier.fillMaxWidth()
    ) { Text("Aggiungi Tempo") }

    HorizontalDivider()

    Titolo("Primati Personali Ufficiali (Gara)", Icons.Filled.List)
    val primati = primatiPersonali(mieiTempi)
    if (primati.isEmpty()) {
        Text("Nessun tempo di gara registrato.", style = MaterialTheme.typography.bodySmall)
    } else {
        primati.forEach { p ->
            Card(
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer),
                shape = RoundedCornerShape(8.dp),
                modifier = Modifier.fillMaxWidth().padding(vertical = 2.dp)
            ) {
                Row(
                    modifier = Modifier.padding(10.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        "${NOMI_STILI.getValue(p.stile)} ${p.distanzaMetri} m (vasca ${p.vascaMetri}m)",
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onPrimaryContainer
                    )
                    Text(
                        "${formattaTempo(p.centesimi)} · ${p.data.formatta()}",
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary
                    )
                }
            }
        }
    }

    HorizontalDivider()

    Titolo("Storico Tempi Registrati", Icons.Filled.List)
    if (mieiTempi.isEmpty()) {
        Text("Nessun tempo registrato.", style = MaterialTheme.typography.bodySmall)
    }
    mieiTempi.forEach { t ->
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text(
                    "${NOMI_STILI.getValue(t.stile)} ${t.distanzaMetri} m · ${formattaTempo(t.centesimi)}",
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    "${t.data.formatta()} · ${NOMI_CONTESTI.getValue(t.contesto)} · Vasca ${t.vascaMetri} m" +
                        if (t.note.isNotBlank()) " · ${t.note}" else "",
                    style = MaterialTheme.typography.bodySmall
                )
            }
            TextButton(onClick = { rvm.eliminaTempo(t) }) { Text("Elimina") }
        }
    }
}

// ---------------------------------------------------------------- STORICO

@Composable
private fun SezioneStorico(atleta: Atleta, vm: MainViewModel, rvm: RegistroViewModel) {
    val log by rvm.log.collectAsStateWithLifecycle()
    val micro by vm.micro.collectAsStateWithLifecycle()
    val assenze by vm.assenze.collectAsStateWithLifecycle()

    val mioLog = log.filter { it.atletaId == atleta.id }
    val presenti = mioLog.count { it.presente }
    val settimane = Riepilogo.perAtleta(atleta, mioLog, micro, assenze.filter { it.atletaId == atleta.id })

    Titolo("Storico Presenze e Carico · ${atleta.nome}", Icons.Filled.Info)
    if (mioLog.isEmpty()) {
        Text("Nessuna seduta registrata.", style = MaterialTheme.typography.bodySmall)
        return
    }

    // Monitoraggio Carico Acuto / Cronico ACWR
    val carichiPrecedenti = settimane.drop(1).map { it.caricoSrpe }
    val caricoAcuto = settimane.firstOrNull()?.caricoSrpe ?: 0
    val acwr = remember(caricoAcuto, carichiPrecedenti) {
        CalcoloScienzaNuoto.calcolaACWR(caricoAcuto, carichiPrecedenti)
    }

    if (acwr.avvisoInfortunio != null) {
        Card(
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer),
            shape = RoundedCornerShape(12.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text("Monitoraggio Infortuni ACWR: ${acwr.livelloRischio}", fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onErrorContainer, style = MaterialTheme.typography.titleSmall)
                Text(acwr.avvisoInfortunio, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onErrorContainer)
            }
        }
    }

    Text("Presenze: $presenti su ${mioLog.size} sedute registrate", fontWeight = FontWeight.SemiBold)
    Text(
        "Carico sRPE = RPE x durata (minuti) della seduta. Stato Carico ACWR: ${acwr.livelloRischio}",
        style = MaterialTheme.typography.bodySmall
    )
    settimane.forEach { s ->
        Card(
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
            shape = RoundedCornerShape(10.dp),
            modifier = Modifier.fillMaxWidth().padding(vertical = 2.dp)
        ) {
            Column(Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text("Settimana del ${s.lunedi.formatta()}", style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.Bold)
                val previsti = s.metriPrevisti?.let { " (previsti $it m)" } ?: ""
                Text("${s.sedute} sedute effettuate · ${s.metri} m$previsti", style = MaterialTheme.typography.bodySmall)
                val rpe = s.rpeMedio?.let { "RPE medio ${String.format(Locale.ITALY, "%.1f", it)} · " } ?: ""
                val assenzeTesto = if (s.assenze > 0) " · ${s.assenze} assenze" else ""
                Text("${rpe}Carico sRPE: ${s.caricoSrpe}$assenzeTesto", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.primary)
            }
        }
    }
}
