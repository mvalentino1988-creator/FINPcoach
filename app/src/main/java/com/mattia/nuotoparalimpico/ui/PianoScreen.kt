package com.mattia.nuotoparalimpico.ui

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.KeyboardArrowLeft
import androidx.compose.material.icons.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.KeyboardArrowUp
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.mattia.nuotoparalimpico.data.Chiusura
import com.mattia.nuotoparalimpico.data.FaseMesociclo
import com.mattia.nuotoparalimpico.data.Gara
import com.mattia.nuotoparalimpico.data.Mesociclo
import com.mattia.nuotoparalimpico.data.Microciclo
import com.mattia.nuotoparalimpico.data.Stagione
import com.mattia.nuotoparalimpico.data.Tempo
import com.mattia.nuotoparalimpico.data.TipoMicrociclo
import com.mattia.nuotoparalimpico.domain.Avviso
import com.mattia.nuotoparalimpico.domain.Calendario
import com.mattia.nuotoparalimpico.domain.GeneratoreSmartSeduta
import com.mattia.nuotoparalimpico.domain.GiornoCalendario
import com.mattia.nuotoparalimpico.domain.ParametriPiano
import com.mattia.nuotoparalimpico.domain.SchedaSeduta
import com.mattia.nuotoparalimpico.domain.VolumeIndividuale
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.YearMonth
import java.time.format.TextStyle
import java.util.Locale
import kotlinx.coroutines.flow.flowOf

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
    val s = stagione
    if (s == null) {
        Column(
            Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) { FormStagione(vm) }
    } else {
        ContenutoStagione(vm, s)
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

    var sezione by rememberSaveable { mutableIntStateOf(0) }
    var microSelezionato by remember { mutableStateOf<Microciclo?>(null) }

    Column(Modifier.fillMaxSize()) {
        TabRow(selectedTabIndex = sezione) {
            listOf("Calendario", "Programma", "Stagione").forEachIndexed { i, titolo ->
                Tab(selected = sezione == i, onClick = { sezione = i }, text = { Text(titolo, fontWeight = FontWeight.SemiBold) })
            }
        }
        Column(
            Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            when (sezione) {
                0 -> SezioneCalendario(vm, s, chiusure, gare, meso, micro) { microSelezionato = it }
                1 -> SezioneProgramma(avvisi, macro, meso, micro, gare) { microSelezionato = it }
                else -> SezioneStagione(vm, s, chiusure, gare, micro)
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
}

// ================================================================ CALENDARIO

@Composable
private fun coloreMicro(tipo: TipoMicrociclo): Color = when (tipo) {
    TipoMicrociclo.CARICO -> MaterialTheme.colorScheme.primaryContainer
    TipoMicrociclo.SCARICO, TipoMicrociclo.RECUPERO -> MaterialTheme.colorScheme.secondaryContainer
    TipoMicrociclo.GARA -> MaterialTheme.colorScheme.tertiaryContainer
    TipoMicrociclo.ADATTAMENTO, TipoMicrociclo.PAUSA -> MaterialTheme.colorScheme.surfaceVariant
}

@Composable
private fun SezioneCalendario(
    vm: MainViewModel,
    s: Stagione,
    chiusure: List<Chiusura>,
    gare: List<Gara>,
    meso: List<Mesociclo>,
    micro: List<Microciclo>,
    onModifica: (Microciclo) -> Unit
) {
    val oggi = remember { LocalDate.now() }
    val iniziale = when {
        oggi.isBefore(s.inizio) -> s.inizio
        oggi.isAfter(s.fine) -> s.fine
        else -> oggi
    }
    var meseEpoch by rememberSaveable { mutableLongStateOf(iniziale.withDayOfMonth(1).toEpochDay()) }
    var selEpoch by rememberSaveable { mutableStateOf<Long?>(null) }
    val mese = YearMonth.from(LocalDate.ofEpochDay(meseEpoch))
    val selezionato = selEpoch?.let { LocalDate.ofEpochDay(it) }

    if (micro.isEmpty()) {
        Text(
            "Nessun piano generato: vai in «Stagione» e premi Genera Piano Agonistico per popolare il calendario.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.error
        )
    }

    // Intestazione mese
    Row(
        Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        IconButton(onClick = { meseEpoch = mese.minusMonths(1).atDay(1).toEpochDay() }) {
            Icon(Icons.Filled.KeyboardArrowLeft, contentDescription = "Mese precedente")
        }
        Text(
            mese.month.getDisplayName(TextStyle.FULL, Locale.ITALIAN).replaceFirstChar { it.uppercase() } + " " + mese.year,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold
        )
        IconButton(onClick = { meseEpoch = mese.plusMonths(1).atDay(1).toEpochDay() }) {
            Icon(Icons.Filled.KeyboardArrowRight, contentDescription = "Mese successivo")
        }
    }

    Row(Modifier.fillMaxWidth()) {
        listOf("L", "M", "M", "G", "V", "S", "D").forEach {
            Text(
                it,
                Modifier.weight(1f),
                textAlign = TextAlign.Center,
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }

    // Griglia
    val offset = mese.atDay(1).dayOfWeek.value - 1
    val giorniMese = mese.lengthOfMonth()
    val righe = (offset + giorniMese + 6) / 7
    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        for (r in 0 until righe) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                for (c in 0 until 7) {
                    val n = r * 7 + c - offset + 1
                    if (n < 1 || n > giorniMese) {
                        Spacer(Modifier.weight(1f).height(56.dp))
                    } else {
                        val d = mese.atDay(n)
                        CellaGiorno(
                            g = Calendario.giorno(d, s, micro, chiusure, gare),
                            selezionato = d == selezionato,
                            oggi = d == oggi,
                            modifier = Modifier.weight(1f),
                            onClick = { selEpoch = d.toEpochDay() }
                        )
                    }
                }
            }
        }
    }

    Text(
        "🏊 seduta · 🏆 gara · ⛔ chiusura. Il colore indica il tipo di settimana (carico, scarico, gara...).",
        style = MaterialTheme.typography.labelSmall,
        color = MaterialTheme.colorScheme.onSurfaceVariant
    )

    HorizontalDivider()

    if (selezionato == null) {
        Text("Tocca un giorno per vedere la scheda d'allenamento.", style = MaterialTheme.typography.bodyMedium)
    } else {
        DettaglioGiorno(
            vm = vm,
            g = Calendario.giorno(selezionato, s, micro, chiusure, gare),
            meso = meso,
            onModifica = onModifica
        )
    }
}

@Composable
private fun CellaGiorno(
    g: GiornoCalendario,
    selezionato: Boolean,
    oggi: Boolean,
    modifier: Modifier,
    onClick: () -> Unit
) {
    val colore = g.micro?.let { coloreMicro(it.tipo) } ?: MaterialTheme.colorScheme.surface
    val forma = RoundedCornerShape(8.dp)
    var m = modifier.height(56.dp).clip(forma).background(colore)
    if (selezionato) m = m.border(2.dp, MaterialTheme.colorScheme.primary, forma)
    else if (oggi) m = m.border(1.dp, MaterialTheme.colorScheme.outline, forma)

    Column(
        m.clickable(onClick = onClick).padding(4.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            "${g.data.dayOfMonth}",
            style = MaterialTheme.typography.labelLarge,
            fontWeight = if (oggi) FontWeight.Bold else FontWeight.Normal
        )
        val marker = buildString {
            if (g.gare.isNotEmpty()) append("🏆")
            if (g.seduta) append("🏊")
            if (g.chiusura != null) append("⛔")
        }
        if (marker.isNotEmpty()) Text(marker, style = MaterialTheme.typography.labelSmall)
    }
}

@Composable
private fun DettaglioGiorno(
    vm: MainViewModel,
    g: GiornoCalendario,
    meso: List<Mesociclo>,
    onModifica: (Microciclo) -> Unit
) {
    val nomeGiorno = g.data.dayOfWeek.getDisplayName(TextStyle.FULL, Locale.ITALIAN).replaceFirstChar { it.uppercase() }
    Titolo("$nomeGiorno ${g.data.formatta()}", Icons.Filled.DateRange)

    val mi = g.micro
    if (mi == null) {
        Text("Questo giorno è fuori dal piano generato.", style = MaterialTheme.typography.bodySmall)
    } else {
        val me = meso.firstOrNull { it.id == mi.mesocicloId }
        Text(
            "${me?.fase?.etichetta?.plus(" · ") ?: ""}${mi.tipo.etichetta}${if (mi.bloccato) " 🔒" else ""} · " +
                    "${mi.sedutePreviste} sedute · ${mi.volumeTargetMetri} m (squadra)",
            style = MaterialTheme.typography.bodySmall
        )
        if (mi.note.isNotBlank()) Text(mi.note, style = MaterialTheme.typography.bodySmall)
        OutlinedButton(onClick = { onModifica(mi) }) { Text("Modifica settimana") }
    }

    g.chiusura?.let { Text("⛔ Chiusura: ${it.motivo}", fontWeight = FontWeight.SemiBold) }
    g.gare.forEach {
        Text("🏆 ${it.nome}" + if (it.prioritaria) " (prioritaria)" else "", fontWeight = FontWeight.SemiBold)
    }

    if (mi != null && g.seduta) {
        SchedaDelGiorno(vm, g.data, mi, meso.firstOrNull { it.id == mi.mesocicloId })
    } else if (mi != null && g.chiusura == null && g.gare.isEmpty()) {
        Text("Nessuna seduta prevista in questo giorno.", style = MaterialTheme.typography.bodySmall)
    }
}

@Composable
private fun SchedaDelGiorno(vm: MainViewModel, data: LocalDate, mi: Microciclo, me: Mesociclo?) {
    val atleti by vm.atleti.collectAsStateWithLifecycle()
    val condizioni by vm.condizioni.collectAsStateWithLifecycle()
    val assenze by vm.assenze.collectAsStateWithLifecycle()
    val clipboard = LocalClipboardManager.current

    var atletaSelId by rememberSaveable { mutableStateOf<Long?>(null) } // null = scheda di squadra
    var variante by remember(data) { mutableIntStateOf(0) }
    var copiato by remember(data, atletaSelId, variante) { mutableStateOf(false) }

    val atletaSel = atleti.firstOrNull { it.id == atletaSelId }
    val condAtleta = remember(condizioni, atletaSel) {
        if (atletaSel == null) emptyList() else condizioni.filter { it.atletaId == atletaSel.id }
    }
    val assenzeAtleta = remember(assenze, atletaSel) {
        if (atletaSel == null) emptyList() else assenze.filter { it.atletaId == atletaSel.id }
    }
    val tempiFlow = remember(atletaSel?.id) {
        atletaSel?.let { vm.osservaTempi(it.id) } ?: flowOf(emptyList<Tempo>())
    }
    val tempi by tempiFlow.collectAsStateWithLifecycle(initialValue = emptyList())

    val metriSeduta = remember(mi, atletaSel, assenzeAtleta) {
        val volume = if (atletaSel != null) VolumeIndividuale.settimana(mi, atletaSel, assenzeAtleta).metri else mi.volumeTargetMetri
        Calendario.metriSeduta(mi, volume)
    }
    val assente = atletaSel != null &&
            assenzeAtleta.any { !data.isBefore(it.dal) && !data.isAfter(it.al) }

    val scheda = remember(data, metriSeduta, atletaSel, condAtleta, tempi, me, mi, variante) {
        GeneratoreSmartSeduta.genera(
            data = data,
            metriTarget = metriSeduta,
            fase = me?.fase ?: FaseMesociclo.PREPARAZIONE_SPECIFICA,
            tipoMicro = mi.tipo,
            atleta = atletaSel,
            condizioniMediche = condAtleta,
            tempi = tempi,
            mesocicloCorrente = me,
            variante = variante
        )
    }

    HorizontalDivider()
    Text("Destinatario della Scheda", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.labelLarge)
    Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
        FilterChip(selected = atletaSelId == null, onClick = { atletaSelId = null }, label = { Text("Tutta la Squadra") })
        atleti.forEach { a ->
            FilterChip(
                selected = a.id == atletaSelId,
                onClick = { atletaSelId = a.id },
                label = { Text("${a.cognome} ${a.nome}") }
            )
        }
    }

    if (assente) {
        Text(
            "⚠️ ${atletaSel?.nome} risulta assente in questa data (assenza programmata).",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.error
        )
    }

    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        OutlinedButton(onClick = { variante++ }) { Text("🔀 Altra variante") }
        Button(onClick = {
            clipboard.setText(AnnotatedString(scheda.comeTesto()))
            copiato = true
        }) { Text(if (copiato) "Copiato ✅" else "Copia 📋") }
    }

    VisualizzatoreSchedaVasca(scheda)
}

/** Testo pronto da incollare su WhatsApp / stampare per il bordo vasca. */
private fun SchedaSeduta.comeTesto(): String = buildString {
    appendLine("🏊‍♂️ $titolo")
    data?.let { appendLine("📅 ${it.formatta()}") }
    appendLine("📊 Volume totale: $volumeTotaleMetri m")
    appendLine("🎯 Fase: ${faseStagione.etichetta} (${tipoMicrociclo.etichetta})")
    categoriaEta?.let { appendLine("👤 Categoria: $it") }
    appendLine()
    if (avvertenzeMediche.isNotEmpty()) {
        appendLine("⚠️ ADATTAMENTI MEDICI:")
        avvertenzeMediche.forEach { appendLine("- $it") }
        appendLine()
    }
    appendLine("📋 SERIE BORDO VASCA:")
    tratti.forEachIndexed { i, t ->
        appendLine("${i + 1}. [${t.codice.codice}] ${t.sezione} - ${t.ripetizioni} (${t.metri}m)")
        appendLine("   ${t.descrizione}")
        t.ripartenza?.let { appendLine("   ⏱️ $it") }
        t.notaSpecifica?.let { appendLine("   • $it") }
        appendLine()
    }
}

// ================================================================ PROGRAMMA

@Composable
private fun SezioneProgramma(
    avvisi: List<Avviso>,
    macro: List<com.mattia.nuotoparalimpico.data.Macrociclo>,
    meso: List<Mesociclo>,
    micro: List<Microciclo>,
    gare: List<Gara>,
    onModifica: (Microciclo) -> Unit
) {
    if (micro.isEmpty()) {
        Text("Nessun piano generato. Vai in «Stagione» per crearlo.", style = MaterialTheme.typography.bodyMedium)
        return
    }

    if (avvisi.isNotEmpty()) {
        Titolo("Controlli sul Piano", Icons.Filled.Info)
        ElencoAvvisi(avvisi)
        HorizontalDivider()
    }

    Titolo("Programmazione e Microcicli", Icons.Filled.DateRange)
    Text("Tocca una settimana per modificarla. Le schede dei singoli giorni sono nel Calendario.", style = MaterialTheme.typography.bodySmall)
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
                    gareSettimana = gare.filter { !it.dal.isAfter(mi.fine) && !it.al.isBefore(mi.inizio) },
                    volumeMax = volumeMax,
                    onClick = { onModifica(mi) }
                )
            }
        }
    }
}

@Composable
private fun CardMicro(
    mi: Microciclo,
    gareSettimana: List<Gara>,
    volumeMax: Int,
    onClick: () -> Unit
) {
    Card(
        colors = CardDefaults.cardColors(containerColor = coloreMicro(mi.tipo)),
        shape = RoundedCornerShape(12.dp),
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick)
    ) {
        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text(
                "${mi.inizio.formatta()} · ${mi.tipo.etichetta}" + if (mi.bloccato) " 🔒" else "",
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Bold
            )
            Text("${mi.sedutePreviste} sedute · ${mi.volumeTargetMetri} m (squadra)", style = MaterialTheme.typography.bodySmall)
            if (volumeMax > 0) {
                LinearProgressIndicator(
                    progress = { mi.volumeTargetMetri.toFloat() / volumeMax },
                    modifier = Modifier.fillMaxWidth()
                )
            }
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

// ================================================================ STAGIONE

@Composable
private fun SezioneStagione(
    vm: MainViewModel,
    s: Stagione,
    chiusure: List<Chiusura>,
    gare: List<Gara>,
    micro: List<Microciclo>
) {
    var confermaElimina by remember { mutableStateOf(false) }
    var chiusureEspanso by remember { mutableStateOf(false) }

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

    // ----- Chiusure e festività -----
    Card(
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
        shape = RoundedCornerShape(12.dp),
        modifier = Modifier.fillMaxWidth().clickable { chiusureEspanso = !chiusureEspanso }
    ) {
        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Icon(Icons.Filled.Info, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                    Text(
                        "Chiusure e Festività (${chiusure.size} registrate)",
                        fontWeight = FontWeight.Bold,
                        style = MaterialTheme.typography.titleSmall
                    )
                }
                Icon(
                    if (chiusureEspanso) Icons.Filled.KeyboardArrowUp else Icons.Filled.KeyboardArrowDown,
                    contentDescription = if (chiusureEspanso) "Riduci" else "Espandi"
                )
            }

            AnimatedVisibility(visible = chiusureEspanso) {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(top = 8.dp)) {
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
                }
            }
        }
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

    // ----- Parametri e generazione -----
    Titolo("Generazione Smart del Piano", Icons.Filled.Edit)
    var giorni by remember(s.giorniAllenamento) { mutableStateOf(Calendario.giorni(s.giorniAllenamento)) }
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