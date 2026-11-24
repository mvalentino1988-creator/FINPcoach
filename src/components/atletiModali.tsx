import React, { useState } from 'react';
import { Atleta, Tempo, Stile, ContestoTempo } from '../types';
import { formattaData, parseData, todayISO } from '../domain/dateUtils';
import { ClassiSportive } from '../domain/classiSportive';
import { formattaTempo, parseTempo } from '../domain/tempoUtils';
import { Button, Input, Select } from './ui';
import {
  Trash2,
  X
} from 'lucide-react';

// ------------------------------------------------ Modal Crea / Modifica Atleta
export interface ModalAtletaProps {
  iniziale: Atleta | null;
  onAnnulla: () => void;
  onSalva: (atleta: Omit<Atleta, 'id'>) => void;
}

export const ModalAtleta: React.FC<ModalAtletaProps> = ({ iniziale, onAnnulla, onSalva }) => {
  const [nome, setNome] = useState(iniziale?.nome ?? '');
  const [cognome, setCognome] = useState(iniziale?.cognome ?? '');
  const [annoNascita, setAnnoNascita] = useState(
    iniziale?.dataNascita ? iniziale.dataNascita.substring(0, 4) : ''
  );
  const [s, setS] = useState(iniziale?.classeS?.toString() ?? '');
  const [sb, setSb] = useState(iniziale?.classeSB?.toString() ?? '');
  const [sm, setSm] = useState(iniziale?.classeSM?.toString() ?? '');
  const [ufficiale, setUfficiale] = useState(iniziale?.stato === 'UFFICIALE');
  const [volumeAuto, setVolumeAuto] = useState(iniziale?.volumeAuto ?? true);
  const [fattore, setFattore] = useState(
    iniziale?.fattoreVolume ? Math.round(iniziale.fattoreVolume * 100).toString() : '100'
  );
  const [note, setNote] = useState(iniziale?.note ?? '');
  const [codiciEccezione, setCodiciEccezione] = useState<string[]>(iniziale?.codiciEccezione ?? []);

  const cS = s.trim() ? parseInt(s, 10) : null;
  const cSB = sb.trim() ? parseInt(sb, 10) : null;
  const cSM = sm.trim() ? parseInt(sm, 10) : null;

  const errori = ClassiSportive.valida(cS, cSB, cSM);
  const annoVal = parseInt(annoNascita.trim(), 10);
  const annoOk = annoNascita.trim() === '' || (!isNaN(annoVal) && annoVal >= 1930 && annoVal <= new Date().getFullYear());
  const dataNascitaFormatted = !isNaN(annoVal) && annoVal >= 1930 ? `${annoVal}-01-01` : undefined;

  const fattVal = parseInt(fattore, 10);
  const fattoreOk = volumeAuto || (!isNaN(fattVal) && fattVal >= 10 && fattVal <= 100);

  const valido =
    nome.trim().length > 0 &&
    cognome.trim().length > 0 &&
    errori.length === 0 &&
    annoOk &&
    fattoreOk;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valido) return;

    onSalva({
      nome: nome.trim(),
      cognome: cognome.trim(),
      dataNascita: dataNascitaFormatted,
      classeS: cS ?? undefined,
      classeSB: cSB ?? undefined,
      classeSM: cSM ?? undefined,
      stato: ufficiale ? 'UFFICIALE' : 'IN_ATTESA',
      fattoreVolume: volumeAuto ? (iniziale?.fattoreVolume ?? 1.0) : fattVal / 100.0,
      volumeAuto,
      note: note.trim(),
      codiciEccezione: codiciEccezione.length > 0 ? codiciEccezione : undefined
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-surface-container-lowest rounded-t-2xl sm:rounded-xl shadow-float max-w-lg w-full p-4 sm:p-6 border border-outline-variant max-h-[92dvh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-outline-variant gap-2">
          <h3 className="font-bold text-on-surface text-lg whitespace-normal break-words">
            {iniziale ? 'Modifica Atleta' : 'Nuovo Atleta'}
          </h3>
          <button onClick={onAnnulla} aria-label="Annulla" className="w-12 h-12 -mr-2 flex items-center justify-center text-on-surface-variant hover:text-on-surface rounded-lg shrink-0">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="py-4 space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Nome *"
              type="text"
              required
              value={nome}
              onChange={e => setNome(e.target.value)}
            />
            <Input
              label="Cognome *"
              type="text"
              required
              value={cognome}
              onChange={e => setCognome(e.target.value)}
            />
          </div>

          <Input
            label="Anno di nascita (es. 2004)"
            type="number"
            placeholder="es. 2004"
            value={annoNascita}
            onChange={e => setAnnoNascita(e.target.value)}
            error={annoNascita.trim() !== '' && !annoOk ? 'Anno non valido' : undefined}
          />

          <div>
            <span className="ds-label block mb-1">
              Classi FINP / World Para Swimming (S, SB, SM) — SB = senza i 10m
            </span>
            <div className="grid grid-cols-3 gap-2">
              <Input
                label="S"
                type="number"
                placeholder="S"
                value={s}
                onChange={e => setS(e.target.value)}
              />
              <Input
                label="SB"
                type="number"
                placeholder="SB"
                value={sb}
                onChange={e => setSb(e.target.value)}
              />
              <Input
                label="SM"
                type="number"
                placeholder="SM"
                value={sm}
                onChange={e => setSm(e.target.value)}
              />
            </div>
            {errori.map((err, i) => (
              <p key={i} className="text-xs text-error mt-1 font-medium">{err}</p>
            ))}
          </div>

          <div className="p-3 bg-surface-container-low rounded-xl space-y-1 border border-outline-variant">
            <label htmlFor="atleta-ufficiale" aria-label="Classificazione Ufficiale" className="flex items-center justify-between gap-3 min-h-[48px] cursor-pointer rounded-lg px-1 -mx-1 hover:bg-surface-container transition-colors">
              <span className="min-w-0">
                <span className="font-semibold text-xs text-on-surface block">Classificazione Ufficiale</span>
                <span className="text-xs text-on-surface-variant">Se disattivato, risulta 'In Attesa'</span>
              </span>
              <input
                id="atleta-ufficiale"
                type="checkbox"
                checked={ufficiale}
                onChange={e => setUfficiale(e.target.checked)}
                className="w-5 h-5 shrink-0 accent-primary"
              />
            </label>

            <label htmlFor="atleta-volume-auto" aria-label="Volume Automatico" className="flex items-center justify-between gap-3 min-h-[48px] cursor-pointer rounded-lg px-1 -mx-1 hover:bg-surface-container transition-colors pt-2 border-t border-outline-variant">
              <span className="min-w-0">
                <span className="font-semibold text-xs text-on-surface block">Volume Automatico</span>
                <span className="text-xs text-on-surface-variant">Calcolato su età, condizioni mediche e classe</span>
              </span>
              <input
                id="atleta-volume-auto"
                type="checkbox"
                checked={volumeAuto}
                onChange={e => setVolumeAuto(e.target.checked)}
                className="w-5 h-5 shrink-0 accent-primary"
              />
            </label>

            {!volumeAuto && (
              <div className="pt-2 border-t border-outline-variant">
                <Input
                  label="Volume rispetto alla squadra (10 - 100%)"
                  type="number"
                  min="10"
                  max="100"
                  value={fattore}
                  onChange={e => setFattore(e.target.value)}
                  className="text-center font-bold"
                />
              </div>
            )}
          </div>

          <div>
            <span id="atleta-codici-label" className="block text-xs font-semibold text-on-surface-variant mb-1">
              Codici di Eccezione WPS
              <span className="text-xs text-on-surface-variant font-normal ml-1">
                (es. * T A Y E 7 9 - Regole speciali per partenze, virate, tapper)
              </span>
            </span>
            <div className="flex flex-wrap gap-1.5" role="group" aria-labelledby="atleta-codici-label">
              {['*', 'T', 'A', 'Y', 'E', '7', '9'].map(codice => (
                <button
                  key={codice}
                  type="button"
                  onClick={() => {
                    setCodiciEccezione(prev =>
                      prev.includes(codice)
                        ? prev.filter(c => c !== codice)
                        : [...prev, codice]
                    );
                  }}
                  className={`w-10 min-h-[48px] rounded-lg font-headline font-bold text-sm transition ${
                    codiciEccezione.includes(codice)
                      ? 'bg-primary text-on-primary shadow-primary-sm'
                      : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                  }`}
                >
                  {codice}
                </button>
              ))}
            </div>
            {codiciEccezione.length > 0 && (
              <div className="mt-2 text-xs text-primary font-semibold">
                Codici attivi: {codiciEccezione.join(', ')}
              </div>
            )}
          </div>

          <div>
            <label htmlFor="atleta-note" className="block text-xs font-semibold text-on-surface-variant mb-1">Note / Menomazione</label>
            <textarea
              id="atleta-note"
              rows={2}
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="es. Amputazione transtibiale arto inferiore sinistro..."
              aria-label="Note / Menomazione"
              className="ds-input h-auto min-h-[56px] py-3 resize-y"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-outline-variant">
            <Button type="button" variant="ghost" onClick={onAnnulla}>
              Annulla
            </Button>
            <Button type="submit" disabled={!valido}>
              Salva Atleta
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ------------------------------------------------ Submodal Quick Times per Athlete
export interface ModalTempiAtletaProps {
  atleta: Atleta;
  tempi: Tempo[];
  onChiudi: () => void;
  onAggiungiTempo: (t: Omit<Tempo, 'id'>) => void;
  onEliminaTempo: (id: number) => void;
}

export const ModalTempiAtleta: React.FC<ModalTempiAtletaProps> = ({
  atleta,
  tempi,
  onChiudi,
  onAggiungiTempo,
  onEliminaTempo
}) => {
  const [dataTesto, setDataTesto] = useState(formattaData(todayISO()));
  const [stile, setStile] = useState<Stile>('STILE_LIBERO');
  const [distanza, setDistanza] = useState('100');
  const [tempoTesto, setTempoTesto] = useState('');
  const [contesto, setContesto] = useState<ContestoTempo>('GARA');
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-surface-container-lowest rounded-t-2xl sm:rounded-xl shadow-float max-w-lg w-full p-4 sm:p-5 border border-outline-variant max-h-[92dvh] flex flex-col">
        <div className="flex items-center justify-between pb-3 border-b border-outline-variant gap-3 shrink-0">
          <h3 className="font-bold text-on-surface text-base truncate">
            Tempi di {atleta.nome} {atleta.cognome} ⏱️
          </h3>
          <button onClick={onChiudi} aria-label="Chiudi" className="w-12 h-12 -mr-2 flex items-center justify-center text-on-surface-variant hover:text-on-surface rounded-lg shrink-0">
            <X size={18} />
          </button>
        </div>

        <div className="py-3 overflow-y-auto space-y-4 text-xs flex-1 min-h-0">
          {/* Add form */}
          <form onSubmit={handleAdd} className="p-3 bg-surface-container-low border border-outline-variant rounded-xl space-y-2.5">
            <div className="grid grid-cols-1 xs:grid-cols-2 gap-2">
              <Input
                type="text"
                placeholder="Data (gg/mm/aaaa)"
                aria-label="Data del tempo"
                value={dataTesto}
                onChange={e => setDataTesto(e.target.value)}
              />
              <Input
                type="number"
                placeholder="Distanza metri"
                aria-label="Distanza in metri"
                value={distanza}
                onChange={e => setDistanza(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 xs:grid-cols-2 gap-2">
              <Select
                value={stile}
                onChange={e => setStile(e.target.value as Stile)}
                aria-label="Stile"
                options={[
                  { value: 'STILE_LIBERO', label: 'Stile libero' },
                  { value: 'DORSO', label: 'Dorso' },
                  { value: 'RANA', label: 'Rana' },
                  { value: 'FARFALLA', label: 'Farfalla' },
                  { value: 'MISTI', label: 'Misti' },
                ]}
              />
              <Select
                value={contesto}
                onChange={e => setContesto(e.target.value as ContestoTempo)}
                aria-label="Contesto"
                options={[
                  { value: 'GARA', label: 'Gara ufficiale' },
                  { value: 'ALLENAMENTO', label: 'Allenamento' },
                  { value: 'TEST', label: 'Test in vasca' },
                ]}
              />
            </div>

            <Input
              type="text"
              placeholder="Tempo (es. 1:04.20 o 28.50)"
              aria-label="Tempo"
              value={tempoTesto}
              onChange={e => setTempoTesto(e.target.value)}
              className="font-bold"
            />

            <Button type="submit" disabled={!valido} className="w-full">
              Aggiungi Tempo
            </Button>
          </form>

          {/* List */}
          <div className="space-y-1.5 max-h-56 overflow-y-auto">
            {tempi.length === 0 ? (
              <p className="text-center text-on-surface-variant py-4">Nessun tempo registrato</p>
            ) : (
              tempi.map(t => (
                <div
                  key={t.id}
                  className="p-3 bg-surface-container-lowest border border-outline-variant rounded-xl flex items-center justify-between gap-2"
                >
                  <div>
                    <span className="font-bold text-on-surface">
                      {t.stile.replace('_', ' ')} {t.distanzaMetri}m: {formattaTempo(t.centesimi)}
                    </span>
                    <span className="text-xs text-on-surface-variant block">
                      {formattaData(t.data)} · {t.contesto.toLowerCase()}
                      {t.note && ` · ${t.note}`}
                    </span>
                  </div>
                  <button
                    onClick={() => onEliminaTempo(t.id)}
                    aria-label="Elimina tempo"
                    className="w-12 h-12 -m-2 flex items-center justify-center text-on-surface-variant hover:text-error rounded-lg shrink-0"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="pt-3 border-t border-outline-variant flex justify-end">
          <Button variant="secondary" onClick={onChiudi}>
            Chiudi
          </Button>
        </div>
      </div>
    </div>
  );
};
