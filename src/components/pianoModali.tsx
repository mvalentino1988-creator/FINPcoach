import React, { useState } from 'react';
import { Microciclo, TipoMicrociclo, TIPO_MICROCICLO_LABEL } from '../types';
import { formattaData, parseData, formatDataInput } from '../domain/dateUtils';
import { CalendarDays, Lock, Sparkles, Unlock, X } from 'lucide-react';
import { microSemantica } from '../lib/semantica';

export const tipoMicroVisual = (tipo: TipoMicrociclo) => {
  const m = microSemantica(tipo);
  return {
    bar: m.solid,
    chip: `${m.chip} border`,
    accent: m.text,
    dot: m.solid,
  };
};

export interface NuovaStagioneFormProps {
  inizioStagione: string;
  setInizioStagione: (v: string) => void;
  fineStagione: string;
  setFineStagione: (v: string) => void;
  nomeStagione: string;
  setNomeStagione: (v: string) => void;
  inizioParsed: string | null;
  fineEffettiva: string | null;
  nomeAuto: string;
  nomeEffettivo: string;
  creaStagione: (nome: string, inizio: string, fine: string) => void;
}

export const NuovaStagioneForm: React.FC<NuovaStagioneFormProps> = ({
  inizioStagione, setInizioStagione, fineStagione, setFineStagione, nomeStagione, setNomeStagione, inizioParsed, fineEffettiva, nomeAuto, nomeEffettivo, creaStagione
}) => {
  return (
    <div className="mx-auto max-w-xl">
      <section className="overflow-hidden rounded-xl border border-border-hairline bg-surface-container-lowest shadow-card">
        <div className="relative overflow-hidden bg-primary px-5 py-5 text-on-primary">
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
          <div className="relative flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
                <CalendarDays size={22} />
              </span>
              <div className="min-w-0">
                <p className="font-label-caps text-label-caps uppercase tracking-[0.16em] text-on-primary">Pianificatore FINP</p>
                <h2 className="font-headline text-headline-lg leading-tight">Nuova stagione agonistica</h2>
              </div>
            </div>
            <span className="hidden rounded-full bg-white/15 px-2.5 py-1 font-label-caps text-label-caps uppercase tracking-wider sm:inline-flex">
              Auto-plan
            </span>
          </div>
          <p className="relative mt-3 max-w-md text-sm leading-relaxed text-on-primary">
            Definisci l'arco della stagione: il sistema genererà macrocicli, mesocicli e microcicli in base a età, carico storico, chiusure e gare.
          </p>
        </div>

        <div className="space-y-4 p-5 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-surface-container-low px-3 py-2">
              <p className="font-label-caps text-label-caps uppercase text-on-surface-variant">Inizio stimato</p>
              <p className="mt-0.5 font-headline-sm text-headline-sm font-bold text-on-surface">
                {inizioParsed ? formattaData(inizioParsed) : '—'}
              </p>
            </div>
            <div className="rounded-lg bg-surface-container-low px-3 py-2">
              <p className="font-label-caps text-label-caps uppercase text-on-surface-variant">Fine stimata</p>
              <p className="mt-0.5 font-headline-sm text-headline-sm font-bold text-on-surface">
                {fineEffettiva ? formattaData(fineEffettiva) : '—'}
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="stagione-inizio" className="block font-label-caps text-label-caps uppercase text-on-surface-variant">
              Data inizio <span className="text-error">*</span>
            </label>
            <input
              id="stagione-inizio"
              type="text"
              value={inizioStagione}
              onChange={e => setInizioStagione(formatDataInput(e.target.value))}
              placeholder="gg/mm/aaaa"
              className="ds-input"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="stagione-fine" className="block font-label-caps text-label-caps uppercase text-on-surface-variant">
              Data fine <span className="text-on-surface-variant">(opzionale)</span>
            </label>
            <input
              id="stagione-fine"
              type="text"
              value={fineStagione}
              onChange={e => setFineStagione(formatDataInput(e.target.value))}
              placeholder={fineEffettiva ? formattaData(fineEffettiva) : 'Auto'}
              className="ds-input"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="stagione-nome" className="block font-label-caps text-label-caps uppercase text-on-surface-variant">
              Nome stagione
            </label>
            <input
              id="stagione-nome"
              type="text"
              value={nomeStagione}
              onChange={e => setNomeStagione(e.target.value)}
              placeholder={nomeAuto || 'Es. Stagione Invernale 2026/27'}
              className="ds-input"
            />
            {nomeAuto && (
              <p className="text-[12px] text-on-surface-variant">
                Suggerimento: <span className="font-semibold text-primary">{nomeAuto}</span>
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              const ini = parseData(inizioStagione);
              const fin = parseData(fineStagione) || (fineEffettiva ? parseData(fineEffettiva) : null);
              if (ini && fin) {
                creaStagione(nomeEffettivo || 'Stagione Agonistica', ini, fin);
              }
            }}
            className="ds-btn-primary w-full justify-center"
          >
            <Sparkles size={17} />
            Crea stagione e piano automatico
          </button>
        </div>
      </section>
    </div>
  );
};

// ------------------------------------------------ Submodal Modifica Microciclo
export interface ModalModificaMicroProps {
  micro: Microciclo;
  onChiudi: () => void;
  onSalva: (micro: Microciclo) => void;
  onSblocca: (micro: Microciclo) => void;
}

export const ModalModificaMicro: React.FC<ModalModificaMicroProps> = ({
  micro,
  onChiudi,
  onSalva,
  onSblocca
}) => {
  const [tipo, setTipo] = useState<TipoMicrociclo>(micro.tipo);
  const [sedute, setSedute] = useState(micro.sedutePreviste.toString());
  const [metri, setMetri] = useState(micro.volumeTargetMetri.toString());
  const [note, setNote] = useState(micro.note);
  const [luogo, setLuogo] = useState(micro.luogo || '');
  const [inizioHHMM, setInizioHHMM] = useState(micro.inizioHHMM || '');
  const [fineHHMM, setFineHHMM] = useState(micro.fineHHMM || '');

  const seduteInt = parseInt(sedute, 10);
  const metriInt = parseInt(metri, 10);
  const valido = !isNaN(seduteInt) && seduteInt >= 0 && seduteInt <= 14 && !isNaN(metriInt) && metriInt >= 0;

  const tipi: TipoMicrociclo[] = ['CARICO', 'SCARICO', 'RECUPERO', 'GARA', 'ADATTAMENTO', 'PAUSA'];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-border-hairline bg-surface-container-lowest shadow-float sm:rounded-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border-hairline bg-surface-container-low px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tipoMicroVisual(micro.tipo).chip}`}>
              <CalendarDays size={18} />
            </span>
            <div className="min-w-0">
              <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                Settimana del {formattaData(micro.inizio)}
              </h3>
              <p className="truncate text-xs text-on-surface-variant">
                {formattaData(micro.inizio)} – {formattaData(micro.fine)} · {TIPO_MICROCICLO_LABEL[tipo]}
              </p>
            </div>
          </div>
          <button onClick={onChiudi} aria-label="Chiudi" className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-on-surface-variant transition hover:bg-surface-container-high hover:text-on-surface">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 p-5 text-xs">
          <div>
            <span id="micro-tipo-label" className="mb-1.5 block font-label-caps text-label-caps uppercase text-on-surface-variant">Tipo microciclo</span>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3" role="group" aria-labelledby="micro-tipo-label">
              {tipi.map(t => {
                const selected = tipo === t;
                const visual = tipoMicroVisual(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTipo(t)}
                    className={`min-h-[48px] rounded-lg border px-2.5 py-2 text-left font-headline-sm text-headline-sm font-bold transition ${
                      selected ? 'border-primary bg-primary text-on-primary shadow-sm' : 'border-border-hairline bg-surface-container-low text-on-surface hover:border-primary/40'
                    }`}
                  >
                    <span className={`mb-1 block h-1.5 w-8 rounded-full ${visual.bar}`} />
                    {TIPO_MICROCICLO_LABEL[t]}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 xs:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="micro-sedute" className="block font-label-caps text-label-caps uppercase text-on-surface-variant">Sedute previste</label>
              <input
                id="micro-sedute"
                type="number"
                min="0"
                max="14"
                value={sedute}
                onChange={e => setSedute(e.target.value)}
                className="ds-input"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="micro-metri" className="block font-label-caps text-label-caps uppercase text-on-surface-variant">Volume squadra (m)</label>
              <input
                id="micro-metri"
                type="number"
                step="50"
                value={metri}
                onChange={e => setMetri(e.target.value)}
                className="ds-input"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 xs:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="micro-luogo" className="block font-label-caps text-label-caps uppercase text-on-surface-variant">Luogo allenamento</label>
              <input
                id="micro-luogo"
                type="text"
                value={luogo}
                onChange={e => setLuogo(e.target.value)}
                placeholder="Es. Piscina comunale"
                className="ds-input"
              />
            </div>
            <div className="space-y-1.5">
              <span id="micro-orario-label" className="block font-label-caps text-label-caps uppercase text-on-surface-variant">Orario</span>
              <div className="grid grid-cols-2 gap-1.5" role="group" aria-labelledby="micro-orario-label">
                <input
                  type="time"
                  aria-label="Orario inizio"
                  value={inizioHHMM}
                  onChange={e => setInizioHHMM(e.target.value)}
                  className="ds-input"
                />
                <input
                  type="time"
                  aria-label="Orario fine"
                  value={fineHHMM}
                  onChange={e => setFineHHMM(e.target.value)}
                  className="ds-input"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="micro-note" className="block font-label-caps text-label-caps uppercase text-on-surface-variant">Note settimana</label>
            <input
              id="micro-note"
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              className="ds-input"
            />
          </div>

          <div className="flex items-start gap-2 rounded-xl border border-border-hairline bg-surface-container-low p-3 text-on-surface-variant">
            <Lock size={15} className="mt-0.5 shrink-0 text-tertiary" />
            <p className="text-xs leading-relaxed">
              Salvando, la settimana viene bloccata: le modifiche manuali non saranno sovrascritte dalle rigenerazioni automatiche.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-border-hairline pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {micro.bloccato && (
              <button
                type="button"
                onClick={() => onSblocca(micro)}
                className="inline-flex h-11 items-center gap-1.5 rounded-lg bg-tertiary-fixed px-3 font-headline-sm text-label-lg font-bold text-on-tertiary-fixed transition hover:brightness-95"
              >
                <Unlock size={15} />
                <span>Sblocca</span>
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onChiudi}
              className="h-11 rounded-lg px-4 font-headline-sm text-label-lg font-bold text-on-surface-variant transition hover:bg-surface-container-high hover:text-on-surface"
            >
              Annulla
            </button>
            <button
              type="button"
              disabled={!valido}
              onClick={() => {
                onSalva({
                  ...micro,
                  tipo,
                  sedutePreviste: seduteInt,
                  volumeTargetMetri: metriInt,
                  note: note.trim(),
                  luogo: luogo.trim() || undefined,
                  inizioHHMM: inizioHHMM || undefined,
                  fineHHMM: fineHHMM || undefined
                });
              }}
              className="h-11 rounded-lg bg-primary-container px-4 font-headline-sm text-label-lg font-bold text-on-primary shadow-card transition hover:bg-primary disabled:opacity-50"
            >
              Salva
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
