import React, { useMemo, useState } from 'react';
import { useApp } from '../data/AppContext';
import { Gara, IscrizioneGara, Stile, STILE_LABEL, STATO_ISCRIZIONE_LABEL } from '../types';
import { formattaData } from '../domain/dateUtils';
import { formattaTempo } from '../domain/tempoUtils';
import { gareAmmesse, GaraProgramma } from '../domain/gareAmmissibili';
import { isAssenteInData } from '../domain/assenze';
import { Badge, Button, Select } from './ui';
import { AlertTriangle, ChevronDown, ChevronUp, Plus, Trash2, UserPlus } from 'lucide-react';

const chiaveEvento = (g: GaraProgramma) => `${g.stile}|${g.distanza}`;

/**
 * Pannello "Iscritti" di una gara: gestione iscrizioni atleta/eventi.
 * Mostra solo eventi ammissibili per la classe dell'atleta
 * (programma WPS in gare-ammissibili.json) e avvisa se l'atleta ha
 * un'assenza che copre il periodo della gara.
 */
export const IscrittiGaraPanel: React.FC<{ gara: Gara }> = ({ gara }) => {
  const {
    iscrizioniGare,
    atleti,
    assenze,
    aggiungiIscrizioneGara,
    aggiornaIscrizioneGara,
    eliminaIscrizioneGara,
  } = useApp();
  const [open, setOpen] = useState(false);
  const [atletaScelto, setAtletaScelto] = useState('');
  const [eventiScelti, setEventiScelti] = useState<Set<string>>(new Set());
  const [eventoDaAggiungere, setEventoDaAggiungere] = useState<Record<number, string>>({});

  const iscrizioni = useMemo(
    () => iscrizioniGare.filter(i => i.garaId === gara.id),
    [iscrizioniGare, gara.id]
  );

  const atletiNonIscritti = useMemo(() => {
    const gia = new Set(iscrizioni.map(i => i.atletaId));
    return atleti.filter(a => !gia.has(a.id));
  }, [atleti, iscrizioni]);

  const atletaSelezionato = atleti.find(a => String(a.id) === atletaScelto) ?? null;
  const eventiAmmessi = useMemo(() => {
    if (!atletaSelezionato) return [];
    return gareAmmesse({
      classeS: atletaSelezionato.classeS,
      classeSB: atletaSelezionato.classeSB,
      classeSM: atletaSelezionato.classeSM,
    });
  }, [atletaSelezionato]);

  const toggleEvento = (chiave: string) => {
    setEventiScelti(prev => {
      const next = new Set(prev);
      if (next.has(chiave)) next.delete(chiave);
      else next.add(chiave);
      return next;
    });
  };

  const confermaIscrizione = () => {
    if (!atletaSelezionato || eventiScelti.size === 0) return;
    const eventi = eventiAmmessi
      .filter(g => eventiScelti.has(chiaveEvento(g)))
      .map(g => ({ stile: g.stile as Stile, distanzaMetri: g.distanza }));
    if (eventi.length === 0) return;
    aggiungiIscrizioneGara({ garaId: gara.id, atletaId: atletaSelezionato.id, eventi, stato: 'ISCRITTO' });
    setAtletaScelto('');
    setEventiScelti(new Set());
  };

  const nomeAtleta = (id: number) => {
    const a = atleti.find(x => x.id === id);
    return a ? `${a.cognome} ${a.nome}`.trim() : `atleta ${id}`;
  };

  const assenteAllaGara = (iscr: IscrizioneGara) =>
    iscr.stato === 'ISCRITTO' &&
    isAssenteInData(iscr.atletaId, gara.dal, assenze, 'GARA', gara.id);

  const eventiRimastiAmmessi = (iscr: IscrizioneGara) => {
    const atleta = atleti.find(a => a.id === iscr.atletaId);
    if (!atleta) return [];
    const gia = new Set(iscr.eventi.map(e => `${e.stile}|${e.distanzaMetri}`));
    return gareAmmesse({
      classeS: atleta.classeS,
      classeSB: atleta.classeSB,
      classeSM: atleta.classeSM,
    }).filter(g => !gia.has(chiaveEvento(g)));
  };

  const aggiungiEvento = (iscr: IscrizioneGara) => {
    const chiave = eventoDaAggiungere[iscr.id];
    if (!chiave) return;
    const garaP = eventiRimastiAmmessi(iscr).find(g => chiaveEvento(g) === chiave);
    if (!garaP) return;
    aggiornaIscrizioneGara({
      ...iscr,
      eventi: [...iscr.eventi, { stile: garaP.stile as Stile, distanzaMetri: garaP.distanza }],
    });
    setEventoDaAggiungere(prev => ({ ...prev, [iscr.id]: '' }));
  };

  const rimuoviEvento = (iscr: IscrizioneGara, idx: number) => {
    aggiornaIscrizioneGara({ ...iscr, eventi: iscr.eventi.filter((_, i) => i !== idx) });
  };

  const nIscritti = iscrizioni.filter(i => i.stato === 'ISCRITTO').length;
  const nConAvviso = iscrizioni.filter(assenteAllaGara).length;

  return (
    <div className="rounded-xl border border-border-hairline bg-surface-container-lowest shadow-card">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex w-full min-h-[48px] items-center justify-between gap-2 px-4 py-2.5 text-left"
        aria-expanded={open}
      >
        <span className="flex min-w-0 items-center gap-2">
          <UserPlus size={16} className="shrink-0 text-primary" />
          <span className="truncate font-headline-sm text-headline-sm font-bold text-on-surface">
            Iscritti ({nIscritti})
          </span>
          {nConAvviso > 0 && (
            <Badge variant="coral" size="sm" icon={<AlertTriangle size={11} />}>
              {nConAvviso} assente{nConAvviso === 1 ? '' : 'i'}
            </Badge>
          )}
        </span>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {open && (
        <div className="space-y-3 border-t border-border-hairline p-4">
          <p className="text-xs text-on-surface-variant">
            {formattaData(gara.dal)}{gara.dal !== gara.al ? ` – ${formattaData(gara.al)}` : ''}
            {gara.luogo ? ` · ${gara.luogo}` : ''}
          </p>

          {iscrizioni.length === 0 ? (
            <p className="text-xs text-on-surface-variant">Nessun atleta iscritto a questa gara.</p>
          ) : (
            <ul className="space-y-2">
              {iscrizioni.map(iscr => {
                const assente = assenteAllaGara(iscr);
                const rimasti = eventiRimastiAmmessi(iscr);
                return (
                  <li key={iscr.id} className="rounded-lg border border-border-hairline bg-surface-container-low p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-headline-sm text-headline-sm font-bold text-on-surface">
                            {nomeAtleta(iscr.atletaId)}
                          </span>
                          <Badge variant={iscr.stato === 'ISCRITTO' ? 'green' : 'secondary'} size="sm">
                            {STATO_ISCRIZIONE_LABEL[iscr.stato]}
                          </Badge>
                          {assente && (
                            <Badge variant="coral" size="sm" icon={<AlertTriangle size={11} />}>
                              Assenza nel periodo
                            </Badge>
                          )}
                        </div>
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {iscr.eventi.map((ev, idx) => (
                            <span
                              key={`${ev.stile}-${ev.distanzaMetri}-${idx}`}
                              className="inline-flex items-center gap-1 rounded-md bg-primary-fixed px-1.5 py-0.5 font-label-caps text-label-caps text-on-primary-fixed"
                            >
                              {STILE_LABEL[ev.stile] ?? ev.stile} {ev.distanzaMetri}m
                              {ev.tempoIscrizioneCentesimi != null && ` · ${formattaTempo(ev.tempoIscrizioneCentesimi)}`}
                              <button
                                type="button"
                                onClick={() => rimuoviEvento(iscr, idx)}
                                aria-label={`Rimuovi evento ${ev.distanzaMetri}m`}
                                className="ml-0.5 inline-flex min-h-[28px] min-w-[28px] items-center justify-center rounded text-on-primary-fixed-variant hover:text-error"
                              >
                                <Trash2 size={11} />
                              </button>
                            </span>
                          ))}
                          {iscr.eventi.length === 0 && (
                            <span className="text-xs text-on-surface-variant">Nessun evento</span>
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <select
                          value={iscr.stato}
                          onChange={e => aggiornaIscrizioneGara({ ...iscr, stato: e.target.value as IscrizioneGara['stato'] })}
                          aria-label="Stato iscrizione"
                          className="ds-select !min-h-[44px] !py-1 text-xs"
                        >
                          {(['ISCRITTO', 'RITIRATO', 'ASSENTE'] as const).map(s => (
                            <option key={s} value={s}>{STATO_ISCRIZIONE_LABEL[s]}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Rimuovere l'iscrizione di ${nomeAtleta(iscr.atletaId)}?`)) {
                              eliminaIscrizioneGara(iscr.id);
                            }
                          }}
                          aria-label="Rimuovi iscrizione"
                          className="inline-flex min-h-[44px] items-center gap-1 px-2 text-xs font-semibold text-error hover:brightness-90"
                        >
                          <Trash2 size={13} />Rimuovi
                        </button>
                      </div>
                    </div>
                    {rimasti.length > 0 && (
                      <div className="mt-2 flex items-center gap-2">
                        <select
                          value={eventoDaAggiungere[iscr.id] ?? ''}
                          onChange={e => setEventoDaAggiungere(prev => ({ ...prev, [iscr.id]: e.target.value }))}
                          aria-label="Aggiungi evento"
                          className="ds-select !min-h-[44px] !py-1 text-xs"
                        >
                          <option value="">Aggiungi evento…</option>
                          {rimasti.map(g => (
                            <option key={chiaveEvento(g)} value={chiaveEvento(g)}>
                              {STILE_LABEL[g.stile as Stile] ?? g.stile} {g.distanza}m
                            </option>
                          ))}
                        </select>
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={!eventoDaAggiungere[iscr.id]}
                          onClick={() => aggiungiEvento(iscr)}
                        >
                          <Plus size={13} />Aggiungi
                        </Button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {atletiNonIscritti.length > 0 && (
            <div className="space-y-2 rounded-lg border border-dashed border-outline-variant p-3">
              <Select
                label="Atleta"
                value={atletaScelto}
                onChange={e => {
                  setAtletaScelto(e.target.value);
                  setEventiScelti(new Set());
                }}
                options={[
                  { value: '', label: 'Seleziona atleta…' },
                  ...atletiNonIscritti.map(a => ({
                    value: String(a.id),
                    label: `${a.cognome} ${a.nome}`.trim() + (a.classeS != null ? ` (S${a.classeS})` : ''),
                  })),
                ]}
              />
              {atletaSelezionato && (
                <div>
                  <span className="mb-1 block font-label-caps text-label-caps uppercase text-on-surface-variant">
                    Eventi ammissibili per la sua classe ({eventiAmmessi.length})
                  </span>
                  {eventiAmmessi.length === 0 ? (
                    <p className="text-xs text-on-surface-variant">
                      Nessun evento del programma WPS ammissibile per le classi di questo atleta.
                    </p>
                  ) : (
                    <div className="grid max-h-40 grid-cols-1 gap-1 overflow-y-auto sm:grid-cols-2">
                      {eventiAmmessi.map(g => {
                        const chiave = chiaveEvento(g);
                        const sel = eventiScelti.has(chiave);
                        return (
                          <button
                            key={chiave}
                            type="button"
                            onClick={() => toggleEvento(chiave)}
                            className={`flex min-h-[44px] items-center justify-between gap-1 rounded-lg border px-2 py-1 text-xs transition ${
                              sel
                                ? 'border-primary bg-primary font-bold text-on-primary'
                                : 'border-border-hairline bg-surface-container-lowest text-on-surface-variant hover:border-primary/40'
                            }`}
                          >
                            <span>{STILE_LABEL[g.stile as Stile] ?? g.stile} {g.distanza}m</span>
                            {sel && <span aria-hidden>✓</span>}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  <Button
                    type="button"
                    variant="primary"
                    className="mt-2 w-full"
                    disabled={eventiScelti.size === 0}
                    onClick={confermaIscrizione}
                  >
                    Iscrivi {eventiScelti.size > 0 ? `(${eventiScelti.size} eventi)` : ''}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default IscrittiGaraPanel;
