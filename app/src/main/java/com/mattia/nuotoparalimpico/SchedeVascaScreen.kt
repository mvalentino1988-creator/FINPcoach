package com.mattia.nuotoparalimpico.ui

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
import androidx.compose.material.icons.filled.List
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
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
import com.mattia.nuotoparalimpico.data.Atleta
import com.mattia.nuotoparalimpico.data.CondizioneMedica
import com.mattia.nuotoparalimpico.data.FaseMesociclo
import com.mattia.nuotoparalimpico.data.TipoMicrociclo
import com.mattia.nuotoparalimpico.domain.GeneratoreSmartSeduta
import com.mattia.nuotoparalimpico.domain.SchedaSeduta
import com.mattia.nuotoparalimpico.domain.VolumeIndividuale
import java.time.LocalDate

@Composable
fun SchedeVascaScreen(vm: MainViewModel) {
    val atleti by vm.atleti.collectAsStateWithLifecycle()
    val condizioni by vm.condizioni.collectAsStateWithLifecycle()
    val assenze by vm.assenze.collectAsStateWithLifecycle()
    val meso by vm.meso.collectAsStateWithLifecycle()
    val micro by vm.micro.collectAsStateWithLifecycle()
    val tuttiTempi by vm.tuttiTempi.collectAsStateWithLifecycle()
    val tuttiLog by vm.tuttiLog.collectAsStateWithLifecycle()
    val parametri by vm.parametriEffettivi.collectAsStateWithLifecycle()

    var atletaSelId by remember { mutableStateOf<Long?>(null) } // null = Scheda di Squadra
    var dataTesto by remember { mutableStateOf(LocalDate.now().formatta()) }
    var metriManual by remember { mutableStateOf("") }          // vuoto = automatico

    val oggi = parseData(dataTesto) ?: LocalDate.now()
    val atletaSel = atleti.firstOrNull { it.id == atletaSelId }

    val microCorrente = micro.firstOrNull { !it.inizio.isAfter(oggi) && !it.fine.isBefore(oggi) } ?: micro.firstOrNull()
    val mesoCorrente = microCorrente?.let { mi -> meso.firstOrNull { it.id == mi.mesocicloId } }

    val volumeCalcolato = remember(atletaSel, microCorrente, metriManual, assenze, parametri) {
        if (atletaSel != null && microCorrente != null) {
            val volumeSett = VolumeIndividuale.settimana(microCorrente, atletaSel, assenze.filter { it.atletaId == atletaSel.id }).metri
            volumeSett / microCorrente.sedutePreviste.coerceAtLeast(1)
        } else {
            metriManual.toIntOrNull()?.coerceIn(400, 10_000)
                ?: microCorrente?.let { it.volumeTargetMetri / it.sedutePreviste.coerceAtLeast(1) }
                ?: parametri.metriBaseSeduta
        }
    }

    val tempiAtleta = remember(tuttiTempi, atletaSel) {
        if (atletaSel != null) tuttiTempi.filter { it.atletaId == atletaSel.id } else emptyList()
    }
    val logAtleta = remember(tuttiLog, atletaSel) {
        if (atletaSel != null) tuttiLog.filter { it.atletaId == atletaSel.id } else emptyList()
    }

    val schedaGenerata = remember(oggi, volumeCalcolato, atletaSel, condizioni, mesoCorrente, microCorrente, tempiAtleta, logAtleta, parametri) {
        GeneratoreSmartSeduta.genera(
            data = oggi,
            metriTarget = volumeCalcolato,
            fase = mesoCorrente?.fase ?: FaseMesociclo.PREPARAZIONE_SPECIFICA,
            tipoMicro = microCorrente?.tipo ?: TipoMicrociclo.CARICO,
            atleta = atletaSel,
            condizioniMediche = seAtleta(atletaSel, condizioni),
            tempi = tempiAtleta,
            logSedute = logAtleta,
            mesocicloCorrente = mesoCorrente,
            giorniAllenamento = parametri.giorniAllenamento
        )
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Titolo("Schede Allenamento Bordo Vasca 🏊‍♂️", Icons.Filled.DateRange)
        Text(
            "Generatore intelligente di sedute basato sulla fase agonistica, età, patologie ed andature con ripartenze a 5 secondi.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        Text("Destinatario della Scheda", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.labelLarge)
        Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            FilterChip(
                selected = atletaSelId == null,
                onClick = { atletaSelId = null },
                label = { Text("Tutta la Squadra") }
            )
            atleti.forEach { a ->
                FilterChip(
                    selected = a.id == atletaSelId,
                    onClick = { atletaSelId = a.id },
                    label = { Text("${a.cognome} ${a.nome}") }
                )
            }
        }

        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            CampoData(dataTesto, { dataTesto = it }, "Data Allenamento", Modifier.weight(1f))
            if (atletaSel == null) {
                CampoNumero(metriManual, { metriManual = it }, "Metri Target (vuoto = auto)", Modifier.weight(1f))
            }
        }

        HorizontalDivider()

        VisualizzatoreSchedaVasca(schedaGenerata)
    }
}

private fun seAtleta(atleta: Atleta?, condizioni: List<CondizioneMedica>): List<CondizioneMedica> {
    return if (atleta == null) emptyList() else condizioni.filter { it.atletaId == atleta.id }
}

@Composable
fun VisualizzatoreSchedaVasca(scheda: SchedaSeduta) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
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
                    Text("Calibrazione sui Tempi e sul Carico", fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onTertiaryContainer, style = MaterialTheme.typography.labelLarge)
                    scheda.noteCalibrazione.forEach { Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onTertiaryContainer) }
                }
            }
        }

        Titolo("Zone Energetiche della Seduta", Icons.Filled.List)
        IndicatoreRipartizioneCodici(scheda.ripartizioneCodici, scheda.volumeTotaleMetri)

        HorizontalDivider()

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