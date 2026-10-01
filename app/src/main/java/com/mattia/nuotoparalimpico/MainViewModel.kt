package com.mattia.nuotoparalimpico.ui

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.mattia.nuotoparalimpico.data.AppDatabase
import com.mattia.nuotoparalimpico.data.Assenza
import com.mattia.nuotoparalimpico.data.Atleta
import com.mattia.nuotoparalimpico.data.Chiusura
import com.mattia.nuotoparalimpico.data.CondizioneMedica
import com.mattia.nuotoparalimpico.data.Gara
import com.mattia.nuotoparalimpico.data.ImpostazioniPiano
import com.mattia.nuotoparalimpico.data.ImpostazioniStore
import com.mattia.nuotoparalimpico.data.LogSeduta
import com.mattia.nuotoparalimpico.data.Macrociclo
import com.mattia.nuotoparalimpico.data.Mesociclo
import com.mattia.nuotoparalimpico.data.Microciclo
import com.mattia.nuotoparalimpico.data.Stagione
import com.mattia.nuotoparalimpico.data.StatoClassificazione
import com.mattia.nuotoparalimpico.data.Tempo
import com.mattia.nuotoparalimpico.domain.AutoPianificatore
import com.mattia.nuotoparalimpico.domain.Avviso
import com.mattia.nuotoparalimpico.domain.FINPSpecialistAI
import com.mattia.nuotoparalimpico.domain.Festivita
import com.mattia.nuotoparalimpico.domain.ParametriPiano
import com.mattia.nuotoparalimpico.domain.PianoGenerator
import com.mattia.nuotoparalimpico.domain.PianoValidator
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.Period
import java.time.temporal.TemporalAdjusters
import kotlin.math.abs
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.FlowPreview
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.debounce
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

private data class InputPiano(
    val stagione: Stagione?,
    val chiusure: List<Chiusura>,
    val gare: List<Gara>,
    val parametri: ParametriPiano
)

@OptIn(ExperimentalCoroutinesApi::class, FlowPreview::class)
class MainViewModel(app: Application) : AndroidViewModel(app) {

    private val db = AppDatabase.get(app)
    private val atletaDao = db.atletaDao()
    private val pianoDao = db.pianoDao()
    private val store = ImpostazioniStore(app)

    private fun <T> stato(flow: Flow<T>, iniziale: T): StateFlow<T> =
        flow.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), iniziale)

    private fun <T> perStagione(f: (Long) -> Flow<List<T>>): StateFlow<List<T>> =
        stato(
            stagione.flatMapLatest { s -> if (s == null) flowOf(emptyList<T>()) else f(s.id) },
            emptyList<T>()
        )

    private suspend fun stagioneCorrente(): Stagione? = pianoDao.osservaStagione().first()

    // ---------- Atleti ----------
    val atleti: StateFlow<List<Atleta>> = stato(atletaDao.osservaAtleti(), emptyList())
    val condizioni: StateFlow<List<CondizioneMedica>> = stato(atletaDao.osservaCondizioni(), emptyList())
    val assenze: StateFlow<List<Assenza>> = stato(atletaDao.osservaAssenze(), emptyList())
    val tuttiTempi: StateFlow<List<Tempo>> = stato(atletaDao.osservaTuttiTempi(), emptyList())
    val tuttiLog: StateFlow<List<LogSeduta>> = stato(atletaDao.osservaTuttiLog(), emptyList())

    fun aggiungiAtleta(a: Atleta) { viewModelScope.launch { atletaDao.inserisci(a) } }
    fun aggiornaAtleta(a: Atleta) { viewModelScope.launch { atletaDao.aggiorna(a) } }
    fun eliminaAtleta(a: Atleta) { viewModelScope.launch { atletaDao.elimina(a) } }
    fun aggiungiCondizione(c: CondizioneMedica) { viewModelScope.launch { atletaDao.inserisciCondizione(c) } }
    fun eliminaCondizione(c: CondizioneMedica) { viewModelScope.launch { atletaDao.eliminaCondizione(c) } }
    fun aggiungiAssenza(a: Assenza) { viewModelScope.launch { atletaDao.inserisciAssenza(a) } }
    fun eliminaAssenza(a: Assenza) { viewModelScope.launch { atletaDao.eliminaAssenza(a) } }

    // ---------- Tempi e Log ----------
    fun osservaTempi(atletaId: Long): Flow<List<Tempo>> = atletaDao.osservaTempi(atletaId)
    fun osservaLogSedute(atletaId: Long): Flow<List<LogSeduta>> = atletaDao.osservaLogSedute(atletaId)

    fun aggiungiTempo(tempo: Tempo) { viewModelScope.launch { atletaDao.inserisciTempo(tempo) } }
    fun eliminaTempo(tempo: Tempo) { viewModelScope.launch { atletaDao.eliminaTempo(tempo) } }
    fun inserisciLogSeduta(log: LogSeduta) { viewModelScope.launch { atletaDao.inserisciLogSeduta(log) } }
    fun aggiornaLogSeduta(log: LogSeduta) { viewModelScope.launch { atletaDao.aggiornaLogSeduta(log) } }

    suspend fun leggiTempi(atletaId: Long): List<Tempo> = atletaDao.leggiTempi(atletaId)
    suspend fun leggiLogSedute(atletaId: Long): List<LogSeduta> = atletaDao.leggiLogSedute(atletaId)

    // ---------- Stagione e piano ----------
    val stagione: StateFlow<Stagione?> = stato(pianoDao.osservaStagione(), null)
    val chiusure: StateFlow<List<Chiusura>> = perStagione<Chiusura> { pianoDao.osservaChiusure(it) }
    val gare: StateFlow<List<Gara>> = perStagione<Gara> { pianoDao.osservaGare(it) }
    val macro: StateFlow<List<Macrociclo>> = perStagione<Macrociclo> { pianoDao.osservaMacro(it) }
    val meso: StateFlow<List<Mesociclo>> = perStagione<Mesociclo> { pianoDao.osservaMeso(it) }
    val micro: StateFlow<List<Microciclo>> = perStagione<Microciclo> { pianoDao.osservaMicro(it) }

    val avvisiPiano: StateFlow<List<Avviso>> = stato(
        combine(stagione, micro, gare) { s, m, g ->
            if (s == null || m.isEmpty()) emptyList() else PianoValidator.valida(s, m, g)
        },
        emptyList()
    )

    // ---------- Impostazioni: null = automatico ----------
    private val _impostazioni = MutableStateFlow(store.leggi())
    val impostazioni: StateFlow<ImpostazioniPiano> = _impostazioni.asStateFlow()

    fun salvaImpostazioni(i: ImpostazioniPiano) {
        store.salva(i)
        _impostazioni.value = i
    }

    /** Parametri realmente in uso: quelli manuali se impostati, altrimenti quelli calcolati dall'app. */
    val parametriEffettivi: StateFlow<ParametriPiano> = stato(
        combine(_impostazioni, atleti, tuttiLog, stagione) { imp, at, log, s ->
            val auto = AutoPianificatore.parametriAuto(at, log, s, LocalDate.now())
            ParametriPiano(
                giorniAllenamento = imp.giorni ?: auto.giorniAllenamento,
                numeroMacrocicli = imp.numeroMacrocicli ?: auto.numeroMacrocicli,
                metriBaseSeduta = imp.metriBaseSeduta ?: auto.metriBaseSeduta,
                settimaneCicloCarico = imp.settimaneCicloCarico ?: auto.settimaneCicloCarico
            )
        },
        ParametriPiano()
    )

    fun creaStagione(nome: String, inizio: LocalDate, fine: LocalDate) {
        viewModelScope.launch {
            val id = pianoDao.inserisciStagione(Stagione(nome = nome, inizio = inizio, fine = fine))
            val feste = Festivita.perStagione(Stagione(id = id, nome = nome, inizio = inizio, fine = fine))
            if (feste.isNotEmpty()) pianoDao.inserisciChiusure(feste)
        }
    }

    fun eliminaStagione() {
        viewModelScope.launch { stagioneCorrente()?.let { pianoDao.eliminaStagione(it) } }
    }

    fun aggiungiChiusura(dal: LocalDate, al: LocalDate, motivo: String) {
        viewModelScope.launch {
            val s = stagioneCorrente() ?: return@launch
            pianoDao.inserisciChiusura(Chiusura(stagioneId = s.id, dal = dal, al = al, motivo = motivo))
        }
    }

    fun eliminaChiusura(c: Chiusura) { viewModelScope.launch { pianoDao.eliminaChiusura(c) } }

    fun aggiungiFestivitaNazionali() {
        viewModelScope.launch {
            val s = stagioneCorrente() ?: return@launch
            val giaPresenti = pianoDao.leggiChiusure(s.id).map { it.dal }.toSet()
            val nuove = Festivita.perStagione(s).filter { it.dal !in giaPresenti }
            if (nuove.isNotEmpty()) pianoDao.inserisciChiusure(nuove)
        }
    }

    fun aggiungiGara(nome: String, dal: LocalDate, al: LocalDate, prioritaria: Boolean) {
        viewModelScope.launch {
            val s = stagioneCorrente() ?: return@launch
            pianoDao.inserisciGara(Gara(stagioneId = s.id, nome = nome, dal = dal, al = al, prioritaria = prioritaria))
        }
    }

    fun eliminaGara(g: Gara) { viewModelScope.launch { pianoDao.eliminaGara(g) } }

    /** Rigenerazione manuale completa: ricalcola anche le settimane passate (restano solo quelle bloccate). */
    fun rigeneraPianoCompleto() {
        viewModelScope.launch {
            val s = stagioneCorrente() ?: return@launch
            val c = pianoDao.leggiChiusure(s.id)
            val g = pianoDao.leggiGare(s.id)
            val p = parametriEffettivi.value
            rigeneraPiano(s, c, g, p, conservaPassato = false)
            store.salvaFirmaPiano(firmaPiano(InputPiano(s, c, g, p)).hashCode())
        }
    }

    fun generaPiano(parametri: ParametriPiano) {
        viewModelScope.launch {
            val s = stagioneCorrente() ?: return@launch
            rigeneraPiano(s, pianoDao.leggiChiusure(s.id), pianoDao.leggiGare(s.id), parametri, conservaPassato = false)
        }
    }

    /** Salva una modifica manuale: la settimana viene marcata come bloccata. */
    fun modificaMicro(m: Microciclo) { viewModelScope.launch { pianoDao.aggiornaMicro(m.copy(bloccato = true)) } }

    /** La settimana torna automatica: verrà ricalcolata alla prossima rigenerazione. */
    fun sbloccaMicro(m: Microciclo) { viewModelScope.launch { pianoDao.aggiornaMicro(m.copy(bloccato = false)) } }

    // ---------- Logica automatica ----------

    private suspend fun rigeneraPiano(
        s: Stagione,
        chiusure: List<Chiusura>,
        gare: List<Gara>,
        parametri: ParametriPiano,
        conservaPassato: Boolean
    ) {
        val vecchi = pianoDao.leggiMicro(s.id).associateBy { it.inizio }
        val lunediCorrente = LocalDate.now().with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))

        val piano = PianoGenerator.genera(s, chiusure, gare, parametri).map { macroGen ->
            macroGen.copy(
                meso = macroGen.meso.map { mesoGen ->
                    mesoGen.copy(
                        micro = mesoGen.micro.map { mi ->
                            val vecchio = vecchi[mi.inizio]
                            when {
                                vecchio == null -> mi
                                vecchio.bloccato -> mi.copy(
                                    tipo = vecchio.tipo, sedutePreviste = vecchio.sedutePreviste,
                                    volumeTargetMetri = vecchio.volumeTargetMetri, note = vecchio.note, bloccato = true
                                )
                                conservaPassato && mi.inizio.isBefore(lunediCorrente) -> mi.copy(
                                    tipo = vecchio.tipo, sedutePreviste = vecchio.sedutePreviste,
                                    volumeTargetMetri = vecchio.volumeTargetMetri, note = vecchio.note, bloccato = false
                                )
                                else -> mi
                            }
                        }
                    )
                }
            )
        }
        pianoDao.salvaPiano(s.id, piano)
    }

    private fun firmaPiano(i: InputPiano): String = buildString {
        val s = i.stagione
        append(s?.id).append('|').append(s?.inizio).append('|').append(s?.fine).append('|')
        i.chiusure.forEach { append(it.dal).append('-').append(it.al).append(';') }
        append('|')
        i.gare.forEach { append(it.dal).append('-').append(it.al).append(it.prioritaria).append(it.nome).append(';') }
        append('|')
        append(i.parametri.giorniAllenamento.sortedBy { it.value }.joinToString(",") { it.name })
        append('|').append(i.parametri.numeroMacrocicli)
        append('|').append(i.parametri.metriBaseSeduta)
        append('|').append(i.parametri.settimaneCicloCarico)
    }

    init {
        // 1. Il piano si rigenera da solo quando cambia qualcosa di rilevante.
        viewModelScope.launch {
            combine(stagione, chiusure, gare, parametriEffettivi) { s, c, g, p -> InputPiano(s, c, g, p) }
                .debounce(1_000)
                .collectLatest { inp ->
                    val s = inp.stagione ?: return@collectLatest
                    val firma = firmaPiano(inp).hashCode()
                    val esistente = pianoDao.leggiMicro(s.id)
                    if (esistente.isNotEmpty() && store.ultimaFirmaPiano() == firma) return@collectLatest
                    rigeneraPiano(s, inp.chiusure, inp.gare, inp.parametri, conservaPassato = esistente.isNotEmpty())
                    store.salvaFirmaPiano(firma)
                }
        }

        // 2. Volume degli atleti in automatico + classi provvisorie dalla prima analisi FINP.
        viewModelScope.launch {
            combine(atleti, condizioni) { a, c -> a to c }
                .debounce(500)
                .collect { (elenco, tutte) ->
                    val oggi = LocalDate.now()
                    for (a in elenco) {
                        val mie = tutte.filter { it.atletaId == a.id && it.attiva }
                        var nuovo = a

                        if (a.volumeAuto) {
                            val f = AutoPianificatore.fattoreVolumeSuggerito(a, mie, oggi)
                            if (abs(f - a.fattoreVolume) > 0.001) nuovo = nuovo.copy(fattoreVolume = f)
                        }

                        if (mie.isNotEmpty() && a.stato == StatoClassificazione.IN_ATTESA &&
                            a.classeS == null && a.classeSB == null && a.classeSM == null &&
                            !store.classiGiaStimate(a.id)
                        ) {
                            val eta = a.dataNascita?.let { Period.between(it, oggi).years }
                            val st = FINPSpecialistAI.analizza(
                                mie.joinToString(" | ") { it.descrizione },
                                mie.joinToString(" | ") { it.limitazioni },
                                eta
                            ).stimaClassi
                            if (st.eleggibile && st.affidabilita != "Bassa") {
                                nuovo = nuovo.copy(classeS = st.classeS, classeSB = st.classeSB, classeSM = st.classeSM)
                                store.segnaClassiStimate(a.id)
                            }
                        }

                        if (nuovo != a) atletaDao.aggiorna(nuovo)
                    }
                }
        }
    }
}