package com.mattia.nuotoparalimpico.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Info
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
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
import com.mattia.nuotoparalimpico.data.ContestoTempo
import com.mattia.nuotoparalimpico.data.FaseMesociclo
import com.mattia.nuotoparalimpico.data.Mesociclo
import com.mattia.nuotoparalimpico.data.Microciclo
import com.mattia.nuotoparalimpico.data.StatoClassificazione
import com.mattia.nuotoparalimpico.data.Stile
import com.mattia.nuotoparalimpico.data.Tempo
import com.mattia.nuotoparalimpico.data.TipoMicrociclo
import com.mattia.nuotoparalimpico.domain.AtletaValidator
import com.mattia.nuotoparalimpico.domain.Avviso
import com.mattia.nuotoparalimpico.domain.CalcoloRitmiRipartenze
import com.mattia.nuotoparalimpico.domain.ClassiSportive
import com.mattia.nuotoparalimpico.domain.FINPSpecialistAI
import com.mattia.nuotoparalimpico.domain.GeneratoreSmartSeduta
import com.mattia.nuotoparalimpico.domain.SchedaSeduta
import com.mattia.nuotoparalimpico.domain.StimaClassiFINP
import com.mattia.nuotoparalimpico.domain.VolumeIndividuale
import com.mattia.nuotoparalimpico.domain.formattaTempo
import com.mattia.nuotoparalimpico.domain.parseTempo
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
    val tuttiTempi by vm.tuttiTempi.collectAsStateWithLifecycle()
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
            val tempiAtleta = tuttiTempi.filter { it.atletaId == a.id }
            val mesoCorrente = micro.firstOrNull { !it.inizio.isAfter(oggi) && !it.fine.isBefore(oggi) }?.let { mi ->
                meso.firstOrNull { it.id == mi.mesocicloId }
            }
            val formCheck = CalcoloRitmiRipartenze.valutaNecessitaFormCheck(a, tempiAtleta, emptyList(), mesoCorrente)

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
                        Text("${a.cognome} ${a.nome}", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                        Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                            if (condAttive > 0) {
                                Surface(
                                    color = MaterialTheme.colorScheme.errorContainer,
                                    shape = RoundedCornerShape(6.dp)
                                ) {
                                    Text(
                                        "$condAttive cond.",
                                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                                        style = MaterialTheme.typography.labelSmall,
                                        color = MaterialTheme.colorScheme.onErrorContainer
                                    )
                                }
                            }
                            if (formCheck.necessario) {
                                Surface(
                                    color = MaterialTheme.colorScheme.tertiaryContainer,
                                    shape = RoundedCornerShape(6.dp)
                                ) {
                                    Text(
                                        "Form Check",
                                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                                        style = MaterialTheme.typography.labelSmall,
                                        color = MaterialTheme.colorScheme.onTertiaryContainer
                                    )
                                }
                            }
                        }
                    }
                    Text(descrizioneClasseEAge(a, oggi), style = MaterialTheme.typography.bodyMedium)
                    if (a.fattoreVolume < 1.0) {
                        Text(
                            "Volume personalizzato: ${(a.fattoreVolume * 100).roundToInt()}% della squadra" +
                                    if (a.volumeAuto) " (auto)" else "",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.primary
                        )
                    }
                    if (formCheck.necessario) {
                        Text("⚡ ${formCheck.titoloTest}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.tertiary)
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
    var volumeAuto by remember { mutableStateOf(iniziale?.volumeAuto ?: true) }
    var fattore by remember { mutableStateOf(((iniziale?.fattoreVolume ?: 1.0) * 100).roundToInt().toString()) }
    var note by remember { mutableStateOf(iniziale?.note ?: "") }

    val cS = s.toIntOrNull()
    val cSB = sb.toIntOrNull()
    val cSM = sm.toIntOrNull()
    val errori = ClassiSportive.valida(cS, cSB, cSM)
    val nascitaOk = nascita.isBlank() || parseData(nascita) != null
    val fatt = fattore.toIntOrNull()
    val fattoreOk = volumeAuto || (fatt != null && fatt in 10..100)
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
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("Volume automatico (età, condizioni, classe)", Modifier.weight(1f))
                    Switch(checked = volumeAuto, onCheckedChange = { volumeAuto = it })
                }
                if (volumeAuto) {
                    Text(
                        "Attuale: $fattore% della squadra, calcolato dall'app",
                        style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.primary
                    )
                } else {
                    CampoNumero(
                        fattore, { fattore = it }, "Volume rispetto alla squadra (10-100 %)",
                        modifier = Modifier.fillMaxWidth(), isError = !fattoreOk
                    )
                }
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
                            fattoreVolume = if (volumeAuto) (iniziale?.fattoreVolume ?: 1.0) else (fatt ?: 100) / 100.0,
                            volumeAuto = volumeAuto,
                            note = note.trim()
                        )
                    )
                }
            ) { Text("Salva") }
        },
        dismissButton = { TextButton(onClick = onAnnulla) { Text("Annulla") } }
    )
}

/** Stima delle classi (solo per atleti in attesa di classificazione) con pulsante per applicarla. */
@Composable
private fun BloccoStima(atleta: Atleta, stima: StimaClassiFINP, onApplica: (StimaClassiFINP) -> Unit) {
    if (atleta.stato != StatoClassificazione.IN_ATTESA) return
    HorizontalDivider(modifier = Modifier.padding(vertical = 4.dp))
    Surface(
        color = MaterialTheme.colorScheme.tertiaryContainer,
        shape = RoundedCornerShape(8.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(Modifier.padding(8.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            if (stima.eleggibile) {
                Text(
                    "Stima Classi FINP: S${stima.classeS} · SB${stima.classeSB} · SM${stima.classeSM}",
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onTertiaryContainer,
                    style = MaterialTheme.typography.labelLarge
                )
                Text(
                    "Affidabilità: ${stima.affidabilita}",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onTertiaryContainer
                )
                Text(stima.motivazione, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onTertiaryContainer)
                val diversa = atleta.classeS != stima.classeS || atleta.classeSB != stima.classeSB || atleta.classeSM != stima.classeSM
                if (diversa) {
                    TextButton(onClick = { onApplica(stima) }) { Text("Applica classi stimate (provvisorie)") }
                }
            } else {
                Text(
                    "Stima classi non attendibile",
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onTertiaryContainer,
                    style = MaterialTheme.typography.labelLarge
                )
                Text(stima.motivazione, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onTertiaryContainer)
            }
        }
    }
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
    var mostraGestioneTempi by remember { mutableStateOf(false) }

    val tuttiTempi by vm.tuttiTempi.collectAsStateWithLifecycle()
    val tuttiLog by vm.tuttiLog.collectAsStateWithLifecycle()
    val tempi = remember(tuttiTempi, atleta.id) { tuttiTempi.filter { it.atletaId == atleta.id } }
    val logSedute = remember(tuttiLog, atleta.id) { tuttiLog.filter { it.atletaId == atleta.id } }

    val dalData = parseData(dal)
    val alData = parseData(al)
    val etaAnni = atleta.dataNascita?.let { Period.between(it, oggi).years }

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

                // Scheda personalizzata
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
                            condizioniMediche = condizioni,
                            tempi = tempi,
                            logSedute = logSedute,
                            mesocicloCorrente = mesoCorrente,
                            giorniAllenamento = vm.parametriEffettivi.value.giorniAllenamento
                        )
                    },
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Genera Scheda Personalizzata 🏊‍♂️")
                }

                Button(
                    onClick = { mostraGestioneTempi = true },
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Gestione Tempi Gara e Test ⏱️")
                }

                // Analisi FINP per condizione medica e stima classi
                Titolo("Analisi Idrodinamica & Stima Classi FINP", Icons.Filled.Info)
                val condAttive = condizioni.filter { it.attiva }

                if (condAttive.isEmpty()) {
                    if (atleta.note.isBlank()) {
                        Text(
                            "Nessuna condizione medica registrata: aggiungine una per ottenere analisi e stima delle classi.",
                            style = MaterialTheme.typography.bodySmall
                        )
                    } else {
                        val analisiNote = FINPSpecialistAI.analizza(atleta.note, "", etaAnni)
                        Card(
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.secondaryContainer),
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                Text("Profilo dalle note dell'atleta", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleSmall, color = MaterialTheme.colorScheme.onSecondaryContainer)
                                Text(analisiNote.riassuntoIdrodinamico, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSecondaryContainer)
                                BloccoStima(atleta, analisiNote.stimaClassi) { st ->
                                    vm.aggiornaAtleta(atleta.copy(classeS = st.classeS, classeSB = st.classeSB, classeSM = st.classeSM))
                                }
                            }
                        }
                    }
                } else {
                    condAttive.forEach { c ->
                        val analisi = FINPSpecialistAI.analizza(c.descrizione, c.limitazioni, etaAnni)
                        Card(
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.secondaryContainer),
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)
                        ) {
                            Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                Text(
                                    "Analisi Medica: ${c.descrizione}",
                                    fontWeight = FontWeight.Bold,
                                    color = MaterialTheme.colorScheme.onSecondaryContainer,
                                    style = MaterialTheme.typography.titleSmall
                                )
                                Text(
                                    analisi.riassuntoIdrodinamico,
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSecondaryContainer
                                )
                                if (analisi.fattoriNuotata.isNotEmpty()) {
                                    Text("Fattori Biomeccanici di Nuotata:", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.labelMedium)
                                    analisi.fattoriNuotata.forEach { f ->
                                        Text("• $f", style = MaterialTheme.typography.bodySmall)
                                    }
                                }

                                BloccoStima(atleta, analisi.stimaClassi) { st ->
                                    vm.aggiornaAtleta(atleta.copy(classeS = st.classeS, classeSB = st.classeSB, classeSM = st.classeSM))
                                }

                                if (analisi.raccomandazioniAllenamento.isNotEmpty()) {
                                    Text("Consigli Allenamento:", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.labelMedium)
                                    analisi.raccomandazioniAllenamento.forEach { r ->
                                        Text("• $r", style = MaterialTheme.typography.bodySmall)
                                    }
                                }
                            }
                        }
                    }
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

    if (mostraGestioneTempi) {
        val mesoCorrente = micro.firstOrNull { !it.inizio.isAfter(oggi) && !it.fine.isBefore(oggi) }?.let { mi ->
            meso.firstOrNull { it.id == mi.mesocicloId }
        }
        DialogGestioneTempi(
            atleta = atleta,
            tempi = tempi,
            mesoCorrente = mesoCorrente,
            onChiudi = { mostraGestioneTempi = false },
            onAggiungiTempo = { vm.aggiungiTempo(it) },
            onEliminaTempo = { vm.eliminaTempo(it) }
        )
    }
}

@Composable
private fun DialogGestioneTempi(
    atleta: Atleta,
    tempi: List<Tempo>,
    mesoCorrente: Mesociclo?,
    onChiudi: () -> Unit,
    onAggiungiTempo: (Tempo) -> Unit,
    onEliminaTempo: (Tempo) -> Unit
) {
    var data by remember { mutableStateOf(LocalDate.now().formatta()) }
    var stile by remember { mutableStateOf(Stile.STILE_LIBERO) }
    var distanza by remember { mutableStateOf("100") }
    var tempoText by remember { mutableStateOf("") }
    var contesto by remember { mutableStateOf(ContestoTempo.GARA) }
    var note by remember { mutableStateOf("") }
    var testoImport by remember { mutableStateOf("") }
    var mostraImport by remember { mutableStateOf(false) }

    val dataParsed = parseData(data)
    val distanzaInt = distanza.toIntOrNull()?.coerceIn(25, 1500) ?: 100
    val tempoCentesimi = parseTempo(tempoText)

    AlertDialog(
        onDismissRequest = onChiudi,
        title = {
            Column {
                Text("Gestione Tempi ⏱️", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                Text("Carica tempi di gara e test per calibrare l'allenamento", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        },
        text = {
            Column(Modifier.verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                val formCheck = CalcoloRitmiRipartenze.valutaNecessitaFormCheck(atleta, tempi, emptyList(), mesoCorrente)
                if (formCheck.necessario) {
                    Card(
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.tertiaryContainer),
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            Text(formCheck.titoloTest, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onTertiaryContainer)
                            Text(formCheck.motivazione, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onTertiaryContainer)
                            Text(formCheck.istruzioniVasca, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onTertiaryContainer)
                        }
                    }
                }

                Button(
                    onClick = { mostraImport = true },
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Importa da Testo/Screenshot 📄")
                }

                HorizontalDivider()

                Text("Inserimento Manuale", fontWeight = FontWeight.Bold)
                CampoData(data, { data = it }, "Data", modifier = Modifier.fillMaxWidth())

                Text("Stile", style = MaterialTheme.typography.labelSmall)
                Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    Stile.entries.forEach { s ->
                        FilterChip(
                            selected = s == stile,
                            onClick = { stile = s },
                            label = { Text(s.name.replace("_", " ")) }
                        )
                    }
                }

                CampoNumero(distanza, { distanza = it }, "Distanza (m)", modifier = Modifier.fillMaxWidth())
                OutlinedTextField(tempoText, { tempoText = it }, label = { Text("Tempo (es. 1:02.35 o 62.35)") }, singleLine = true, modifier = Modifier.fillMaxWidth())

                Text("Contesto", style = MaterialTheme.typography.labelSmall)
                Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    ContestoTempo.entries.forEach { c ->
                        FilterChip(
                            selected = c == contesto,
                            onClick = { contesto = c },
                            label = { Text(c.name.lowercase()) }
                        )
                    }
                }

                OutlinedTextField(note, { note = it }, label = { Text("Note (opzionale)") }, modifier = Modifier.fillMaxWidth())

                Button(
                    enabled = dataParsed != null && tempoCentesimi != null,
                    onClick = {
                        if (dataParsed != null && tempoCentesimi != null) {
                            onAggiungiTempo(
                                Tempo(
                                    atletaId = atleta.id,
                                    data = dataParsed,
                                    stile = stile,
                                    distanzaMetri = distanzaInt,
                                    centesimi = tempoCentesimi,
                                    contesto = contesto,
                                    note = note.trim()
                                )
                            )
                            data = LocalDate.now().formatta()
                            tempoText = ""
                            note = ""
                        }
                    },
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Aggiungi Tempo")
                }

                HorizontalDivider()

                Text("Tempi Registrati", fontWeight = FontWeight.Bold)
                if (tempi.isEmpty()) {
                    Text("Nessun tempo registrato", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                } else {
                    tempi.forEach { t ->
                        Card(
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Row(
                                modifier = Modifier.padding(10.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(Modifier.weight(1f)) {
                                    Text("${t.stile.name.replace("_", " ")} ${t.distanzaMetri}m", fontWeight = FontWeight.SemiBold)
                                    Text("${t.data.formatta()} · ${t.contesto.name.lowercase()}", style = MaterialTheme.typography.bodySmall)
                                    Text(formattaTempo(t.centesimi), style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.primary)
                                    if (t.note.isNotBlank()) {
                                        Text(t.note, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    }
                                }
                                IconButton(onClick = { onEliminaTempo(t) }) {
                                    Icon(Icons.Filled.Delete, contentDescription = "Elimina", tint = MaterialTheme.colorScheme.error)
                                }
                            }
                        }
                        Spacer(Modifier.height(4.dp))
                    }
                }
            }
        },
        confirmButton = { TextButton(onClick = onChiudi) { Text("Chiudi") } }
    )

    if (mostraImport) {
        AlertDialog(
            onDismissRequest = { mostraImport = false },
            title = { Text("Importa Tempi da Testo") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Incolla qui il testo da screenshot o file (es. risultati gara):", style = MaterialTheme.typography.bodySmall)
                    OutlinedTextField(
                        testoImport,
                        { testoImport = it },
                        label = { Text("Testo da importare") },
                        modifier = Modifier.fillMaxWidth().height(150.dp),
                        maxLines = 8
                    )
                }
            },
            confirmButton = {
                val tempiImportati = CalcoloRitmiRipartenze.parseImportaTempi(testoImport)
                TextButton(
                    onClick = {
                        tempiImportati.forEach { t ->
                            onAggiungiTempo(
                                Tempo(
                                    atletaId = atleta.id,
                                    data = LocalDate.now(),
                                    stile = t.stile,
                                    distanzaMetri = t.distanzaMetri,
                                    centesimi = t.centesimi,
                                    contesto = t.contesto,
                                    note = t.note
                                )
                            )
                        }
                        mostraImport = false
                        testoImport = ""
                    },
                    enabled = tempiImportati.isNotEmpty()
                ) {
                    Text("Importa ${tempiImportati.size} tempi")
                }
            },
            dismissButton = { TextButton(onClick = { mostraImport = false }) { Text("Annulla") } }
        )
    }
}