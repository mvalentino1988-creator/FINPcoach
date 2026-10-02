import React, { useState } from 'react';
import { useApp } from '../data/AppContext';
import { Atleta, CondizioneMedica, Assenza, Tempo, SchedaSeduta, StimaClassiFINP, LogSeduta } from '../types';
import { formattaData, parseData, todayISO, yearsBetween, isBefore } from '../domain/dateUtils';
import { AtletaValidator } from '../domain/validatori';
import { ClassiSportive } from '../domain/classiSportive';
import { FINPSpecialistAI } from '../domain/finpAnalisiMedica';
import { VolumeIndividuale } from '../domain/volumeIndividuale';
import { GeneratoreSmartSeduta } from '../domain/generatoreSmartSeduta';
import { CalcoloRitmiRipartenze } from '../domain/calcoloRitmiRipartenze';
import { formattaTempo, parseTempo } from '../domain/tempoUtils';
import { ElencoAvvisi } from './ElencoAvvisi';
import { SchedaSedutaModal } from './SchedaSedutaModal';
import {
  AlertTriangle,
  Calendar,
  Check,
  ChevronRight,
  ClipboardList,
  Edit2,
  FileText,
  HeartPulse,
  Info,
  Plus,
  Search,
  Sparkles,
  Timer,
  Trash2,
  User,
  UserPlus,
  Waves,
  X
} from 'lucide-react';

export const AtletiScreen: React.FC = () => {
  const {
    atleti,
    condizioni,
    assenze,
    tempi,
    log,
    micro,
    meso,
    parametriEffettivi,
    aggiungiAtleta,
    aggiornaAtleta,
    eliminaAtleta,
    aggiungiCondizione,
    eliminaCondizione,
    aggiungiAssenza,
    eliminaAssenza,
    aggiungiTempo,
    eliminaTempo
  } = useApp();

  const [nuovoOpen, setNuovoOpen] = useState(false);
  const [selezionatoId, setSelezionatoId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState<'ALL' | 'S1-S6' | 'S7-S10' | 'S11-S13' | 'S14'>('ALL');

  const oggi = todayISO();
  const atletaSel = atleti.find(a => a.id === selezionatoId);

  const atletiFiltrati = atleti.filter(a => {
    const q = searchQuery.toLowerCase().trim();
    const matchName = !q || a.nome.toLowerCase().includes(q) || a.cognome.toLowerCase().includes(q);
    if (!matchName) return false;

    if (categoriaFiltro === 'ALL') return true;
    const s = a.classeS;
    if (s == null) return false;
    if (categoriaFiltro === 'S1-S6') return s >= 1 && s <= 6;
    if (categoriaFiltro === 'S7-S10') return s >= 7 && s <= 10;
    if (categoriaFiltro === 'S11-S13') return s >= 11 && s <= 13;
    if (categoriaFiltro === 'S14') return s === 14;
    return true;
  });

  const formatClassi = (a: Atleta) => {
    const list: string[] = [];
    if (a.classeS != null) list.push(`S${a.classeS}`);
    if (a.classeSB != null) list.push(`SB${a.classeSB}`);
    if (a.classeSM != null) list.push(`SM${a.classeSM}`);
    return list.length > 0 ? list.join(' · ') : 'Classi non indicate';
  };

  return (
    <div className="space-y-4">
      {/* Top Action */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight">Atleti Squadra FINP</h2>
          <p className="text-xs text-slate-500">
            {atleti.length} {atleti.length === 1 ? 'atleta registrato' : 'atleti registrati'} · Classificazione World Para Swimming
          </p>
        </div>
        <button
          onClick={() => setNuovoOpen(true)}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-[#006874] hover:bg-[#004f58] text-white rounded-xl text-xs font-bold transition shadow-sm"
        >
          <UserPlus size={16} />
          <span>Nuovo Atleta</span>
        </button>
      </div>

      {/* Search & Class Category Filters */}
      {atleti.length > 0 && (
        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs space-y-2.5">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cerca per cognome o nome..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs placeholder:text-slate-400 focus:bg-white focus:border-[#006874] transition"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="text-slate-400 font-bold mr-1">Filtra:</span>
            {[
              { id: 'ALL', label: 'Tutti' },
              { id: 'S1-S6', label: 'Fisici S1-S6' },
              { id: 'S7-S10', label: 'Fisici S7-S10' },
              { id: 'S11-S13', label: 'Visivi S11-S13' },
              { id: 'S14', label: 'Intellettivi S14' },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setCategoriaFiltro(f.id as any)}
                className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                  categoriaFiltro === f.id
                    ? 'bg-[#006874] text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {atleti.length === 0 && (
        <div className="p-8 text-center bg-white rounded-2xl border border-dashed border-slate-300">
          <User size={36} className="mx-auto text-slate-300 mb-2" />
          <h3 className="font-bold text-slate-700">Nessun atleta inserito</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Aggiungi il primo atleta per iniziare a gestire classi sportive, condizioni mediche e schede personalizzate.
          </p>
        </div>
      )}

      {atleti.length > 0 && atletiFiltrati.length === 0 && (
        <div className="p-6 text-center bg-white rounded-2xl border border-slate-200">
          <p className="text-xs text-slate-500">Nessun atleta corrisponde ai filtri di ricerca impostati.</p>
        </div>
      )}

      {/* Athletes List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {atletiFiltrati.map(a => {
          const mieCondizioni = condizioni.filter(c => c.atletaId === a.id);
          const mieAssenze = assenze.filter(ass => ass.atletaId === a.id);
          const mieiTempi = tempi.filter(t => t.atletaId === a.id);
          const avvisi = AtletaValidator.valida(a, mieCondizioni, mieAssenze, oggi);
          const condAttive = mieCondizioni.filter(c => c.attiva).length;
          const eta = a.dataNascita ? yearsBetween(a.dataNascita, oggi) : null;

          const mesoCorrente = micro.find(m => !isBefore(oggi, m.inizio) && !isBefore(m.fine, oggi))
            ? meso.find(me => me.id === micro.find(m => !isBefore(oggi, m.inizio) && !isBefore(m.fine, oggi))?.mesocicloId)
            : null;

          const formCheck = CalcoloRitmiRipartenze.valutaNecessitaFormCheck(a, mieiTempi, mesoCorrente);

          return (
            <div
              key={a.id}
              onClick={() => setSelezionatoId(a.id)}
              className="bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl p-4 transition shadow-xs cursor-pointer flex flex-col justify-between group"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-base text-slate-900 group-hover:text-[#006874] transition flex items-center gap-1.5">
                      {a.cognome} {a.nome}
                    </h3>
                    <div className="text-xs text-slate-500 font-medium">
                      {formatClassi(a)}
                      {eta != null && ` · ${eta} anni`}
                      {a.stato === 'IN_ATTESA' && (
                        <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] bg-amber-100 text-amber-800 font-semibold">
                          in attesa
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {condAttive > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
                        {condAttive} cond.
                      </span>
                    )}
                    {formCheck.necessario && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 flex items-center gap-1">
                        <Timer size={12} />
                        Form Check
                      </span>
                    )}
                  </div>
                </div>

                {a.fattoreVolume < 1.0 && (
                  <div className="text-xs text-[#006874] font-medium">
                    Volume personalizzato: {Math.round(a.fattoreVolume * 100)}% della squadra
                    {a.volumeAuto ? ' (auto)' : ' (manuale)'}
                  </div>
                )}

                {formCheck.necessario && (
                  <div className="text-[11px] font-medium text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200">
                    {formCheck.titoloTest}
                  </div>
                )}

                {avvisi.length > 0 && <ElencoAvvisi avvisi={avvisi} />}
              </div>

              <div className="pt-3 mt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                <span>Tocca per dettagli, analisi FINP e tempi</span>
                <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-1 transition" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Nuovo Atleta */}
      {nuovoOpen && (
        <ModalAtleta
          iniziale={null}
          onAnnulla={() => setNuovoOpen(false)}
          onSalva={dati => {
            aggiungiAtleta(dati);
            setNuovoOpen(false);
          }}
        />
      )}

      {/* Modal Dettaglio Atleta */}
      {atletaSel && (
        <ModalDettaglioAtleta
          atleta={atletaSel}
          condizioni={condizioni.filter(c => c.atletaId === atletaSel.id)}
          assenze={assenze.filter(ass => ass.atletaId === atletaSel.id)}
          tempi={tempi.filter(t => t.atletaId === atletaSel.id)}
          log={log.filter(l => l.atletaId === atletaSel.id)}
          meso={meso}
          micro={micro}
          onChiudi={() => setSelezionatoId(null)}
          onAggiornaAtleta={aggiornaAtleta}
          onEliminaAtleta={id => {
            eliminaAtleta(id);
            setSelezionatoId(null);
          }}
          onAggiungiCondizione={aggiungiCondizione}
          onEliminaCondizione={eliminaCondizione}
          onAggiungiAssenza={aggiungiAssenza}
          onEliminaAssenza={eliminaAssenza}
          onAggiungiTempo={aggiungiTempo}
          onEliminaTempo={eliminaTempo}
          parametriEffettivi={parametriEffettivi}
        />
      )}
    </div>
  );
};

// ------------------------------------------------ Modal Crea / Modifica Atleta
interface ModalAtletaProps {
  iniziale: Atleta | null;
  onAnnulla: () => void;
  onSalva: (atleta: Omit<Atleta, 'id'>) => void;
}

const ModalAtleta: React.FC<ModalAtletaProps> = ({ iniziale, onAnnulla, onSalva }) => {
  const [nome, setNome] = useState(iniziale?.nome ?? '');
  const [cognome, setCognome] = useState(iniziale?.cognome ?? '');
  const [nascita, setNascita] = useState(iniziale?.dataNascita ? formattaData(iniziale.dataNascita) : '');
  const [s, setS] = useState(iniziale?.classeS?.toString() ?? '');
  const [sb, setSb] = useState(iniziale?.classeSB?.toString() ?? '');
  const [sm, setSm] = useState(iniziale?.classeSM?.toString() ?? '');
  const [ufficiale, setUfficiale] = useState(iniziale?.stato === 'UFFICIALE');
  const [volumeAuto, setVolumeAuto] = useState(iniziale?.volumeAuto ?? true);
  const [fattore, setFattore] = useState(
    iniziale?.fattoreVolume ? Math.round(iniziale.fattoreVolume * 100).toString() : '100'
  );
  const [note, setNote] = useState(iniziale?.note ?? '');

  const cS = s.trim() ? parseInt(s, 10) : null;
  const cSB = sb.trim() ? parseInt(sb, 10) : null;
  const cSM = sm.trim() ? parseInt(sm, 10) : null;

  const errori = ClassiSportive.valida(cS, cSB, cSM);
  const nascitaParsed = nascita.trim() ? parseData(nascita) : null;
  const nascitaOk = nascita.trim() === '' || nascitaParsed != null;

  const fattVal = parseInt(fattore, 10);
  const fattoreOk = volumeAuto || (!isNaN(fattVal) && fattVal >= 10 && fattVal <= 100);

  const valido =
    nome.trim().length > 0 &&
    cognome.trim().length > 0 &&
    errori.length === 0 &&
    nascitaOk &&
    fattoreOk;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valido) return;

    onSalva({
      nome: nome.trim(),
      cognome: cognome.trim(),
      dataNascita: nascitaParsed ?? undefined,
      classeS: cS ?? undefined,
      classeSB: cSB ?? undefined,
      classeSM: cSM ?? undefined,
      stato: ufficiale ? 'UFFICIALE' : 'IN_ATTESA',
      fattoreVolume: volumeAuto ? (iniziale?.fattoreVolume ?? 1.0) : fattVal / 100.0,
      volumeAuto,
      note: note.trim()
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 border border-slate-200 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="font-bold text-slate-800 text-lg">
            {iniziale ? 'Modifica Atleta' : 'Nuovo Atleta'}
          </h3>
          <button onClick={onAnnulla} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="py-4 space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Nome *</label>
              <input
                type="text"
                required
                value={nome}
                onChange={e => setNome(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#006874]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Cognome *</label>
              <input
                type="text"
                required
                value={cognome}
                onChange={e => setCognome(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#006874]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Data di nascita (gg/mm/aaaa)
            </label>
            <input
              type="text"
              placeholder="es. 15/04/2004"
              value={nascita}
              onChange={e => setNascita(e.target.value)}
              className={`w-full px-3 py-2 border rounded-xl ${!nascitaOk ? 'border-rose-400 bg-rose-50' : 'border-slate-300'}`}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Classi FINP / World Para Swimming (S, SB, SM)
            </label>
            <div className="grid grid-cols-3 gap-2">
              <input
                type="number"
                placeholder="Classe S"
                value={s}
                onChange={e => setS(e.target.value)}
                className="px-3 py-2 border rounded-xl border-slate-300 text-center"
              />
              <input
                type="number"
                placeholder="SB (no 10)"
                value={sb}
                onChange={e => setSb(e.target.value)}
                className="px-3 py-2 border rounded-xl border-slate-300 text-center"
              />
              <input
                type="number"
                placeholder="Classe SM"
                value={sm}
                onChange={e => setSm(e.target.value)}
                className="px-3 py-2 border rounded-xl border-slate-300 text-center"
              />
            </div>
            {errori.map((err, i) => (
              <p key={i} className="text-xs text-rose-600 mt-1 font-medium">{err}</p>
            ))}
          </div>

          <div className="p-3 bg-slate-50 rounded-xl space-y-3 border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-semibold text-xs text-slate-700 block">Classificazione Ufficiale</span>
                <span className="text-[11px] text-slate-500">Se disattivato, risulta 'In Attesa'</span>
              </div>
              <input
                type="checkbox"
                checked={ufficiale}
                onChange={e => setUfficiale(e.target.checked)}
                className="w-4 h-4 accent-[#006874] rounded"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-200">
              <div>
                <span className="font-semibold text-xs text-slate-700 block">Volume Automatico</span>
                <span className="text-[11px] text-slate-500">Calcolato su età, condizioni mediche e classe</span>
              </div>
              <input
                type="checkbox"
                checked={volumeAuto}
                onChange={e => setVolumeAuto(e.target.checked)}
                className="w-4 h-4 accent-[#006874] rounded"
              />
            </div>

            {!volumeAuto && (
              <div className="pt-2 border-t border-slate-200">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Volume rispetto alla squadra (10 - 100%)
                </label>
                <input
                  type="number"
                  min="10"
                  max="100"
                  value={fattore}
                  onChange={e => setFattore(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl border-slate-300 text-center font-bold"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Note / Menomazione</label>
            <textarea
              rows={2}
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="es. Amputazione transtibiale arto inferiore sinistro..."
              className="w-full px-3 py-2 border rounded-xl border-slate-300 text-xs"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onAnnulla}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 font-semibold rounded-xl text-xs transition"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={!valido}
              className="px-5 py-2 bg-[#006874] hover:bg-[#004f58] disabled:opacity-50 text-white font-bold rounded-xl text-xs transition shadow-xs"
            >
              Salva Atleta
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ------------------------------------------------ Modal Dettaglio Atleta
interface ModalDettaglioProps {
  atleta: Atleta;
  condizioni: CondizioneMedica[];
  assenze: Assenza[];
  tempi: Tempo[];
  log: LogSeduta[];
  meso: any[];
  micro: any[];
  onChiudi: () => void;
  onAggiornaAtleta: (a: Atleta) => void;
  onEliminaAtleta: (id: number) => void;
  onAggiungiCondizione: (c: Omit<CondizioneMedica, 'id'>) => void;
  onEliminaCondizione: (id: number) => void;
  onAggiungiAssenza: (a: Omit<Assenza, 'id'>) => void;
  onEliminaAssenza: (id: number) => void;
  onAggiungiTempo: (t: Omit<Tempo, 'id'>) => void;
  onEliminaTempo: (id: number) => void;
  parametriEffettivi: any;
}

const ModalDettaglioAtleta: React.FC<ModalDettaglioProps> = ({
  atleta,
  condizioni,
  assenze,
  tempi,
  log,
  meso,
  micro,
  onChiudi,
  onAggiornaAtleta,
  onEliminaAtleta,
  onAggiungiCondizione,
  onEliminaCondizione,
  onAggiungiAssenza,
  onEliminaAssenza,
  onAggiungiTempo,
  onEliminaTempo,
  parametriEffettivi
}) => {
  const [modificaOpen, setModificaOpen] = useState(false);
  const [schedaSmart, setSchedaSmart] = useState<SchedaSeduta | null>(null);
  const [gestioneTempiOpen, setGestioneTempiOpen] = useState(false);

  // New condition inputs
  const [nuovaCond, setNuovaCond] = useState('');
  const [nuovaLimitaz, setNuovaLimitaz] = useState('');

  // New absence inputs
  const [assDal, setAssDal] = useState('');
  const [assAl, setAssAl] = useState('');
  const [assMotivo, setAssMotivo] = useState('');

  const oggi = todayISO();
  const eta = atleta.dataNascita ? yearsBetween(atleta.dataNascita, oggi) : null;
  const avvisi = AtletaValidator.valida(atleta, condizioni, assenze, oggi);

  const dalParsed = parseData(assDal);
  const alParsed = parseData(assAl);
  const assenzaValida = dalParsed != null && alParsed != null && !isBefore(alParsed, dalParsed);

  const generaScheda = () => {
    const microCorrente = micro.find((m: any) => !isBefore(oggi, m.inizio) && !isBefore(m.fine, oggi)) ?? micro[0];
    const mesoCorrente = microCorrente ? meso.find((me: any) => me.id === microCorrente.mesocicloId) : null;

    const volumeSett = microCorrente ? VolumeIndividuale.settimana(microCorrente, atleta, assenze).metri : 1800;
    const sedute = microCorrente?.sedutePreviste ? Math.max(1, microCorrente.sedutePreviste) : 3;
    const metriSeduta = Math.round(volumeSett / sedute);

    const s = GeneratoreSmartSeduta.genera(
      oggi,
      metriSeduta,
      mesoCorrente?.fase ?? 'PREPARAZIONE_SPECIFICA',
      microCorrente?.tipo ?? 'CARICO',
      atleta,
      condizioni,
      tempi,
      log,
      mesoCorrente,
      parametriEffettivi.giorniAllenamento
    );

    setSchedaSmart(s);
  };

  const applicaClassiStimate = (stima: StimaClassiFINP) => {
    onAggiornaAtleta({
      ...atleta,
      classeS: stima.classeS,
      classeSB: stima.classeSB,
      classeSM: stima.classeSM
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col border border-slate-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#006874] text-white flex items-center justify-center font-black text-sm">
              {atleta.nome[0]}{atleta.cognome[0]}
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-lg sm:text-xl">
                {atleta.cognome} {atleta.nome}
              </h2>
              <div className="text-xs text-slate-500 font-medium">
                {atleta.classeS != null ? `S${atleta.classeS} ` : ''}
                {atleta.classeSB != null ? `SB${atleta.classeSB} ` : ''}
                {atleta.classeSM != null ? `SM${atleta.classeSM} ` : ''}
                {eta != null ? `· ${eta} anni ` : ''}
                · Stato: {atleta.stato === 'UFFICIALE' ? 'Ufficiale WPS' : 'In Attesa'}
              </div>
            </div>
          </div>
          <button onClick={onChiudi} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 text-sm">
          {avvisi.length > 0 && <ElencoAvvisi avvisi={avvisi} />}

          {/* Quick Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={generaScheda}
              className="flex items-center justify-center gap-2 p-3 rounded-xl bg-[#006874] hover:bg-[#004f58] text-white font-bold text-xs transition shadow-sm"
            >
              <Waves size={16} />
              <span>Genera Scheda Personalizzata 🏊‍♂️</span>
            </button>
            <button
              onClick={() => setGestioneTempiOpen(true)}
              className="flex items-center justify-center gap-2 p-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition"
            >
              <Timer size={16} />
              <span>Gestione Tempi Gara & Test ⏱️ ({tempi.length})</span>
            </button>
          </div>

          {/* FINP Hydrodynamic Analysis & Class Estimation */}
          <div className="p-4 bg-cyan-50/70 border border-cyan-100 rounded-2xl space-y-3">
            <div className="flex items-center gap-2 text-[#006874] font-bold text-xs uppercase tracking-wider">
              <Sparkles size={16} />
              <span>Analisi Idrodinamica & Stima Classi FINP</span>
            </div>

            {condizioni.filter(c => c.attiva).length === 0 ? (
              <p className="text-xs text-slate-500">
                Nessuna condizione medica registrata: aggiungine una di seguito per ottenere l'analisi biomeccanica
                e la stima indicativa delle classi FINP.
              </p>
            ) : (
              <div className="space-y-3">
                {condizioni.filter(c => c.attiva).map(c => {
                  const analisi = FINPSpecialistAI.analizza(c.descrizione, c.limitazioni, eta);
                  return (
                    <div key={c.id} className="p-3 bg-white/90 rounded-xl border border-cyan-200 space-y-2 text-xs">
                      <div className="font-bold text-slate-800 text-xs">
                        Condizione: {c.descrizione}
                      </div>
                      <p className="text-slate-600 leading-relaxed">{analisi.riassuntoIdrodinamico}</p>

                      {analisi.fattoriNuotata.length > 0 && (
                        <div>
                          <span className="font-bold text-slate-700 block mb-0.5">Fattori di nuotata:</span>
                          <ul className="list-disc list-inside text-slate-600 space-y-0.5">
                            {analisi.fattoriNuotata.map((f, i) => <li key={i}>{f}</li>)}
                          </ul>
                        </div>
                      )}

                      {/* Stima Classi Box */}
                      {atleta.stato === 'IN_ATTESA' && (
                        <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-amber-900">
                              Stima WPS: S{analisi.stimaClassi.classeS} · SB{analisi.stimaClassi.classeSB} · SM{analisi.stimaClassi.classeSM}
                            </span>
                            <span className="text-[10px] text-amber-700 font-semibold uppercase">
                              Affidabilità: {analisi.stimaClassi.affidabilita}
                            </span>
                          </div>
                          <p className="text-amber-800 text-[11px]">{analisi.stimaClassi.motivazione}</p>

                          {(atleta.classeS !== analisi.stimaClassi.classeS ||
                            atleta.classeSB !== analisi.stimaClassi.classeSB ||
                            atleta.classeSM !== analisi.stimaClassi.classeSM) && (
                            <button
                              type="button"
                              onClick={() => applicaClassiStimate(analisi.stimaClassi)}
                              className="mt-1 px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-md text-[11px] font-bold transition"
                            >
                              Applica classi stimate provvisorie
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Volume Target delle prossime 4 settimane */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Calendar size={15} className="text-[#006874]" />
              Volume Previsto Prossime Settimane
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {micro.filter((m: any) => !isBefore(m.fine, oggi)).slice(0, 4).map((m: any) => {
                const v = VolumeIndividuale.settimana(m, atleta, assenze);
                return (
                  <div key={m.id} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-center">
                    <div className="text-[11px] text-slate-500 font-medium">{formattaData(m.inizio)}</div>
                    <div className="text-sm font-black text-[#006874]">{v.metri} m</div>
                    <div className="text-[10px] text-slate-400 capitalize">{m.tipo.toLowerCase()}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Condizioni Mediche Management */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <HeartPulse size={15} className="text-rose-600" />
                Condizioni Mediche & Limitazioni
              </h4>
            </div>

            <div className="space-y-2">
              {condizioni.map(c => (
                <div
                  key={c.id}
                  className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <span className="font-bold text-slate-800 block">{c.descrizione}</span>
                    {c.limitazioni && (
                      <span className="text-slate-500 block mt-0.5">Limitazioni: {c.limitazioni}</span>
                    )}
                  </div>
                  <button
                    onClick={() => onEliminaCondizione(c.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}

              {/* Add Condition Form */}
              <div className="p-3 bg-slate-50 rounded-xl border border-dashed border-slate-300 space-y-2">
                <input
                  type="text"
                  placeholder="Diagnosi / Condizione medica (es. Paraplegia T6, Acondroplasia...)"
                  value={nuovaCond}
                  onChange={e => setNuovaCond(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                />
                <input
                  type="text"
                  placeholder="Limitazioni fisiche per l'allenamento in vasca..."
                  value={nuovaLimitaz}
                  onChange={e => setNuovaLimitaz(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                />
                <button
                  type="button"
                  disabled={!nuovaCond.trim()}
                  onClick={() => {
                    onAggiungiCondizione({
                      atletaId: atleta.id,
                      descrizione: nuovaCond.trim(),
                      limitazioni: nuovaLimitaz.trim(),
                      attiva: true
                    });
                    setNuovaCond('');
                    setNuovaLimitaz('');
                  }}
                  className="w-full py-1.5 bg-[#006874] hover:bg-[#004f58] disabled:opacity-50 text-white rounded-lg text-xs font-bold transition"
                >
                  Aggiungi Condizione Medica
                </button>
              </div>
            </div>
          </div>

          {/* Assenze Programmate Management */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Calendar size={15} className="text-amber-600" />
              Assenze Programmate
            </h4>

            <div className="space-y-2">
              {assenze.map(a => (
                <div
                  key={a.id}
                  className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <span className="font-bold text-slate-800">
                      {formattaData(a.dal)} – {formattaData(a.al)}
                    </span>
                    {a.motivo && <span className="text-slate-500 ml-2">({a.motivo})</span>}
                  </div>
                  <button
                    onClick={() => onEliminaAssenza(a.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}

              {/* Add Absence Form */}
              <div className="p-3 bg-slate-50 rounded-xl border border-dashed border-slate-300 space-y-2 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Dal (gg/mm/aaaa)"
                    value={assDal}
                    onChange={e => setAssDal(e.target.value)}
                    className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg"
                  />
                  <input
                    type="text"
                    placeholder="Al (gg/mm/aaaa)"
                    value={assAl}
                    onChange={e => setAssAl(e.target.value)}
                    className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg"
                  />
                </div>
                <input
                  type="text"
                  placeholder="Motivo (es. Convalescenza, Esami universitari...)"
                  value={assMotivo}
                  onChange={e => setAssMotivo(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg"
                />
                <button
                  type="button"
                  disabled={!assenzaValida}
                  onClick={() => {
                    if (dalParsed && alParsed) {
                      onAggiungiAssenza({
                        atletaId: atleta.id,
                        dal: dalParsed,
                        al: alParsed,
                        motivo: assMotivo.trim()
                      });
                      setAssDal('');
                      setAssAl('');
                      setAssMotivo('');
                    }
                  }}
                  className="w-full py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg font-bold transition"
                >
                  Registra Assenza
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between shrink-0 bg-slate-50 rounded-b-2xl">
          <div className="flex gap-2">
            <button
              onClick={() => setModificaOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-xl text-xs transition"
            >
              <Edit2 size={14} />
              <span>Modifica</span>
            </button>
            <button
              onClick={() => {
                if (window.confirm(`Sei sicuro di voler eliminare ${atleta.nome} ${atleta.cognome}?`)) {
                  onEliminaAtleta(atleta.id);
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-800 font-semibold rounded-xl text-xs transition"
            >
              <Trash2 size={14} />
              <span>Elimina</span>
            </button>
          </div>

          <button
            onClick={onChiudi}
            className="px-5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs transition"
          >
            Chiudi
          </button>
        </div>
      </div>

      {modificaOpen && (
        <ModalAtleta
          iniziale={atleta}
          onAnnulla={() => setModificaOpen(false)}
          onSalva={dati => {
            onAggiornaAtleta({ ...dati, id: atleta.id });
            setModificaOpen(false);
          }}
        />
      )}

      {schedaSmart && (
        <SchedaSedutaModal
          scheda={schedaSmart}
          onChiudi={() => setSchedaSmart(null)}
        />
      )}

      {gestioneTempiOpen && (
        <ModalTempiAtleta
          atleta={atleta}
          tempi={tempi}
          onChiudi={() => setGestioneTempiOpen(false)}
          onAggiungiTempo={onAggiungiTempo}
          onEliminaTempo={onEliminaTempo}
        />
      )}
    </div>
  );
};

// ------------------------------------------------ Submodal Quick Times per Athlete
interface ModalTempiAtletaProps {
  atleta: Atleta;
  tempi: Tempo[];
  onChiudi: () => void;
  onAggiungiTempo: (t: Omit<Tempo, 'id'>) => void;
  onEliminaTempo: (id: number) => void;
}

const ModalTempiAtleta: React.FC<ModalTempiAtletaProps> = ({
  atleta,
  tempi,
  onChiudi,
  onAggiungiTempo,
  onEliminaTempo
}) => {
  const [dataTesto, setDataTesto] = useState(formattaData(todayISO()));
  const [stile, setStile] = useState<any>('STILE_LIBERO');
  const [distanza, setDistanza] = useState('100');
  const [tempoTesto, setTempoTesto] = useState('');
  const [contesto, setContesto] = useState<any>('GARA');
  const [note, setNote] = useState('');

  const dataParsed = parseData(dataTesto);
  const distInt = parseInt(distanza, 10);
  const centesimi = parseTempo(tempoTesto);

  const valido = dataParsed != null && !isNaN(distInt) && distInt >= 25 && centesimi != null;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valido) return;
    onAggiungiTempo({
      atletaId: atleta.id,
      data: dataParsed!,
      stile,
      distanzaMetri: distInt,
      centesimi: centesimi!,
      contesto,
      vascaMetri: 25,
      note: note.trim()
    });
    setTempoTesto('');
    setNote('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-5 border border-slate-200 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="font-bold text-slate-800 text-base">
            Tempi di {atleta.nome} {atleta.cognome} ⏱️
          </h3>
          <button onClick={onChiudi} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
            <X size={18} />
          </button>
        </div>

        <div className="py-3 overflow-y-auto space-y-4 text-xs">
          {/* Add form */}
          <form onSubmit={handleAdd} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Data (gg/mm/aaaa)"
                value={dataTesto}
                onChange={e => setDataTesto(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
              />
              <input
                type="number"
                placeholder="Distanza metri"
                value={distanza}
                onChange={e => setDistanza(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <select
                value={stile}
                onChange={e => setStile(e.target.value)}
                className="px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
              >
                <option value="STILE_LIBERO">Stile libero</option>
                <option value="DORSO">Dorso</option>
                <option value="RANA">Rana</option>
                <option value="FARFALLA">Farfalla</option>
                <option value="MISTI">Misti</option>
              </select>

              <select
                value={contesto}
                onChange={e => setContesto(e.target.value)}
                className="px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
              >
                <option value="GARA">Gara ufficiale</option>
                <option value="ALLENAMENTO">Allenamento</option>
                <option value="TEST">Test in vasca</option>
              </select>
            </div>

            <input
              type="text"
              placeholder="Tempo (es. 1:04.20 o 28.50)"
              value={tempoTesto}
              onChange={e => setTempoTesto(e.target.value)}
              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold"
            />

            <button
              type="submit"
              disabled={!valido}
              className="w-full py-2 bg-[#006874] hover:bg-[#004f58] disabled:opacity-50 text-white rounded-lg font-bold transition shadow-xs"
            >
              Aggiungi Tempo
            </button>
          </form>

          {/* List */}
          <div className="space-y-1.5 max-h-56 overflow-y-auto">
            {tempi.length === 0 ? (
              <p className="text-center text-slate-400 py-4">Nessun tempo registrato</p>
            ) : (
              tempi.map(t => (
                <div
                  key={t.id}
                  className="p-2.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-2"
                >
                  <div>
                    <span className="font-bold text-slate-800">
                      {t.stile.replace('_', ' ')} {t.distanzaMetri}m: {formattaTempo(t.centesimi)}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      {formattaData(t.data)} · {t.contesto.toLowerCase()}
                      {t.note && ` · ${t.note}`}
                    </span>
                  </div>
                  <button
                    onClick={() => onEliminaTempo(t.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 flex justify-end">
          <button
            onClick={onChiudi}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
};
