import React, { useState } from 'react';
import { Atleta, CodiceAllenamentoKey, CondizioneMedica, Assenza, Gara, Tempo, StimaClassiFINP, LogSeduta, Mesociclo, Microciclo, ParametriPiano, Stagione, ImpostazioniPiano } from '../types';
import { formattaData, todayISO, yearsBetween, isBefore } from '../domain/dateUtils';
import { AtletaValidator } from '../domain/validatori';
import { FINPSpecialistAI } from '../domain/finpAnalisiMedica';
import { VolumeIndividuale } from '../domain/volumeIndividuale';
import { generaCodiciSeduta } from '../domain/generatoreCodiciSeduta';
import { ElencoAvvisi } from './ElencoAvvisi';
import { CodiciSeduta } from './CodiciSeduta';
import { Sezione } from './Sezione';
import { AtletaBiomeccanicaView } from './AtletaBiomeccanicaView';
import { GareAmmissibiliCard } from './GareAmmissibiliCard';
import { PianoAtletaPanel } from './PianoAtletaPanel';
import { Button, Input, Tabs } from './ui';
import {
  AlertTriangle,
  Calendar,
  Check,
  Edit2,
  HeartPulse,
  Sliders,
  Sparkles,
  Timer,
  Trash2,
  Waves,
  X
} from 'lucide-react';
import { ModalAtleta, ModalTempiAtleta } from './atletiModali';
import { SezioneAssenzeAtleta } from './atletaAssenzeSezione';

// ------------------------------------------------ Modal Dettaglio Atleta
export interface ModalDettaglioProps {
  atleta: Atleta;
  condizioni: CondizioneMedica[];
  assenze: Assenza[];
  tempi: Tempo[];
  log: LogSeduta[];
  meso: Mesociclo[];
  micro: Microciclo[];
  onChiudi: () => void;
  onAggiornaAtleta: (a: Atleta) => void;
  onEliminaAtleta: (id: number) => void;
  onAggiungiCondizione: (c: Omit<CondizioneMedica, 'id'>) => void;
  onEliminaCondizione: (id: number) => void;
  onAggiungiAssenza: (a: Omit<Assenza, 'id'>) => void;
  onEliminaAssenza: (id: number) => void;
  onAggiungiTempo: (t: Omit<Tempo, 'id'>) => void;
  onEliminaTempo: (id: number) => void;
  parametriEffettivi: ParametriPiano;
  stagione: Stagione | null;
  impostazioni: ImpostazioniPiano;
  gare: Gara[];
}

export const ModalDettaglioAtleta: React.FC<ModalDettaglioProps> = ({
  atleta,
  condizioni,
  assenze,
  tempi,
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
  gare
}) => {
  const [modificaOpen, setModificaOpen] = useState(false);
  const [codiciProposti, setCodiciProposti] = useState<CodiceAllenamentoKey[] | null>(null);
  const [gestioneTempiOpen, setGestioneTempiOpen] = useState(false);

  // New condition inputs
  const [nuovaCond, setNuovaCond] = useState('');
  const [nuovaLimitaz, setNuovaLimitaz] = useState('');

  const oggi = todayISO();
  const eta = atleta.dataNascita ? yearsBetween(atleta.dataNascita, oggi) : null;
  const avvisi = AtletaValidator.valida(atleta, condizioni, assenze, oggi);

  const generaCodici = () => {
    const microCorrente = micro.find(m => !isBefore(oggi, m.inizio) && !isBefore(m.fine, oggi)) ?? micro[0];
    const mesoCorrente = microCorrente ? meso.find(me => me.id === microCorrente.mesocicloId) : null;

    setCodiciProposti(generaCodiciSeduta({
      fase: mesoCorrente?.fase ?? 'PREPARAZIONE_SPECIFICA',
      tipoMicro: microCorrente?.tipo ?? 'CARICO',
      etaAtleta: eta,
      condizioni,
    }).codici);
  };

  const [tabDettaglio, setTabDettaglio] = useState<'biomeccanica' | 'progressione' | 'certificati'>('biomeccanica');

  const applicaClassiStimate = (stima: StimaClassiFINP) => {
    onAggiornaAtleta({
      ...atleta,
      classeS: stima.classeS,
      classeSB: stima.classeSB,
      classeSM: stima.classeSM
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-surface-container-lowest rounded-xl shadow-float max-w-2xl w-full max-h-[92vh] flex flex-col border border-outline-variant">
        {/* Athlete Top Bio Capsule - Stitch Aquatic Design System */}
        <div className="p-4 sm:p-5 border-b border-outline-variant flex flex-col gap-3 shrink-0 bg-surface-container-low rounded-t-2xl">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="relative shrink-0">
                <div className="w-12 h-12 rounded-full bg-primary-fixed text-on-primary-fixed-variant flex items-center justify-center font-headline-sm font-bold shadow-card ring-2 ring-primary-fixed-dim">
                  {atleta.nome?.[0] || 'A'}{atleta.cognome?.[0] || 'T'}
                </div>
                <div className="absolute -bottom-1 -right-1 bg-secondary text-on-secondary p-0.5 rounded-full flex items-center justify-center shadow-card ring-2 ring-surface-container-low">
                  <Check size={10} strokeWidth={3.5} />
                </div>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-headline-sm text-headline-md text-on-surface leading-tight max-w-full">
                    {atleta.cognome} {atleta.nome}
                  </h2>
                  {eta != null && (
                    <span className="font-label-caps text-label-caps font-bold px-2 py-0.5 rounded bg-tertiary-fixed text-on-tertiary-fixed-variant uppercase shrink-0">
                      {eta} anni
                    </span>
                  )}
                </div>
                <div className="font-label-caps text-label-caps text-on-surface-variant font-semibold mt-0.5 leading-snug uppercase tracking-wider">
                  Fed. FINP / World Para Swimming · Squadra Nazionale
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setModificaOpen(true)}
                className="w-12 h-12 flex items-center justify-center text-primary-container hover:bg-surface-container rounded-xl transition"
                title="Modifica anagrafica"
              >
                <Edit2 size={16} />
              </button>
              <button onClick={onChiudi} aria-label="Chiudi dettaglio atleta" className="w-12 h-12 flex items-center justify-center text-on-surface-variant hover:text-on-surface-variant rounded-xl transition">
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Paralympic Passport & Class Badges */}
          <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-3 bg-surface-container-lowest rounded-xl p-3 border border-outline-variant">
            <div className="flex items-center gap-2 min-w-0 flex-wrap">
              <span className="font-label-caps text-label-caps font-bold bg-primary-fixed text-on-primary-fixed-variant px-2 py-0.5 rounded uppercase tracking-wider shrink-0">
                {atleta.classeS != null ? `S${atleta.classeS}` : 'S-'}
              </span>
              {atleta.classeSB != null && (
                <span className="font-label-caps text-label-caps bg-surface-container text-on-surface-variant px-2 py-0.5 rounded uppercase">
                  SB{atleta.classeSB}
                </span>
              )}
              {atleta.classeSM != null && (
                <span className="font-label-caps text-label-caps bg-surface-container text-on-surface-variant px-2 py-0.5 rounded uppercase">
                  SM{atleta.classeSM}
                </span>
              )}
              <span className="font-label-caps text-label-caps text-on-surface-variant font-semibold leading-snug">
                Passaporto Ufficiale FINP / WPS
              </span>
            </div>
            <span className={`inline-flex items-center gap-1.5 font-label-caps text-label-caps font-bold px-3 py-1 rounded-full uppercase self-start xs:self-auto shrink-0 ${
              atleta.stato === 'UFFICIALE'
                ? 'bg-secondary-container text-on-secondary-container'
                : 'bg-tertiary-fixed text-on-tertiary-fixed-variant'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${atleta.stato === 'UFFICIALE' ? 'bg-secondary' : 'bg-tertiary'}`} />
              {atleta.stato === 'UFFICIALE' ? 'Ufficiale' : 'In revisione'}
            </span>
          </div>

          {/* WPS Exception Codes Display */}
          {atleta.codiciEccezione && atleta.codiciEccezione.length > 0 && (
            <div className="bg-warning-container text-on-warning-container rounded-xl p-3 border border-warning/30">
              <div className="flex items-center gap-3 mb-1">
                <AlertTriangle size={14} className="shrink-0" />
                <span className="text-xs font-bold uppercase tracking-wider">Codici di Eccezione WPS</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {atleta.codiciEccezione.map(codice => (
                  <span
                    key={codice}
                    className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-warning text-on-warning font-headline font-bold text-sm"
                  >
                    {codice}
                  </span>
                ))}
              </div>
              <div className="text-xs mt-1 opacity-90">
                Regole speciali per partenze, virate, uso tapper
              </div>
            </div>
          )}

        </div>

        {/* Tabs profilo — lista fissa, pannello scrollabile */}
        <Tabs
          tabs={[
            { id: 'biomeccanica', label: 'Biomeccanica', icon: <Sliders size={15} /> },
            { id: 'progressione', label: 'Progressione', icon: <Timer size={15} /> },
            { id: 'certificati', label: 'Certificati', icon: <HeartPulse size={15} /> },
          ]}
          activeId={tabDettaglio}
          onChange={(id) => setTabDettaglio(id as 'biomeccanica' | 'progressione' | 'certificati')}
          ariaLabel="Sezioni del profilo atleta"
          className="flex-1 min-h-0"
          panelClassName="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 pb-4 space-y-4 text-sm"
        >
          {avvisi.length > 0 && <ElencoAvvisi avvisi={avvisi} />}

          {/* TAB 1: BIOMECCANICA & WPS */}
          {tabDettaglio === 'biomeccanica' && (
            <div className="space-y-4">
              <AtletaBiomeccanicaView atleta={atleta} tempi={tempi} />

              <GareAmmissibiliCard atleta={atleta} />

              <Sezione 
                titolo="Analisi Specialistica AI & Stima Classi" 
                icon={<Sparkles size={16} />}
                riepilogoChiuso={condizioni.filter(c => c.attiva).length > 0 ? `${condizioni.filter(c => c.attiva).length} condizioni analizzate` : 'Nessuna condizione'}
                storageKey="atleta_analisi"
                defaultAperto={true}
              >
                {condizioni.filter(c => c.attiva).length === 0 ? (
                  <p className="text-xs text-on-surface-variant">
                    Nessuna condizione medica registrata: aggiungine una nella scheda Certificati per ottenere l'analisi biomeccanica
                    e la stima indicativa delle classi FINP.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {condizioni.filter(c => c.attiva).map(c => {
                      const analisi = FINPSpecialistAI.analizza(c.descrizione, c.limitazioni, eta);
                      return (
                        <div key={c.id} className="p-3 bg-surface-container-low rounded-lg border border-primary-fixed-dim/60 space-y-2 text-xs">
                          <div className="font-headline-sm text-headline-sm text-on-surface">
                            Condizione: {c.descrizione}
                          </div>
                          <p className="text-on-surface-variant leading-relaxed">{analisi.riassuntoIdrodinamico}</p>

                          {analisi.fattoriNuotata.length > 0 && (
                            <div>
                              <span className="font-bold text-on-surface block mb-0.5">Fattori di nuotata:</span>
                              <ul className="list-disc list-inside text-on-surface-variant space-y-0.5">
                                {analisi.fattoriNuotata.map((f, i) => <li key={i}>{f}</li>)}
                              </ul>
                            </div>
                          )}

                          {atleta.stato === 'IN_ATTESA' && (
                            <div className="p-3 bg-surface-container-low border border-tertiary-fixed-dim rounded-lg space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-on-surface">
                                  Stima WPS: S{analisi.stimaClassi.classeS} · SB{analisi.stimaClassi.classeSB} · SM{analisi.stimaClassi.classeSM}
                                </span>
                                <span className="text-[12px] text-on-surface-variant font-semibold uppercase">
                                  Affidabilità: {analisi.stimaClassi.affidabilita}
                                </span>
                              </div>
                              <p className="text-on-surface-variant text-xs">{analisi.stimaClassi.motivazione}</p>

                              {(atleta.classeS !== analisi.stimaClassi.classeS ||
                                atleta.classeSB !== analisi.stimaClassi.classeSB ||
                                atleta.classeSM !== analisi.stimaClassi.classeSM) && (
                                <button
                                  type="button"
                                  onClick={() => applicaClassiStimate(analisi.stimaClassi)}
                                  className="mt-1 px-3 py-1 bg-tertiary-container hover:brightness-95 text-on-tertiary rounded-md text-xs font-bold transition"
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
              </Sezione>
            </div>
          )}

          {/* TAB 2: PROGRESSIONE & TEMPI */}
          {tabDettaglio === 'progressione' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={generaCodici}
                  className="flex items-center justify-center gap-2 p-3.5 rounded-xl bg-primary text-on-primary font-headline-sm text-headline-sm transition shadow-primary-sm hover:brightness-110 active:scale-[0.98]"
                >
                  <Waves size={16} />
                  <span>Proponi codici di oggi</span>
                </button>
                <button
                  type="button"
                  onClick={() => setGestioneTempiOpen(true)}
                  className="flex items-center justify-center gap-2 p-3.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-headline-sm text-headline-sm transition active:scale-[0.98]"
                >
                  <Timer size={16} />
                  <span>Storico Tempi & Test ({tempi.length})</span>
                </button>
              </div>
              {codiciProposti && <CodiciSeduta codici={codiciProposti} titolo="Focus codici per oggi" compatto />}

              {/* Volume Target delle prossime 4 settimane */}
              <Sezione 
                titolo="Volume Previsto Prossime Settimane" 
                icon={<Calendar size={15} />}
                riepilogoChiuso="Prossime 4 settimane"
                storageKey="atleta_volume"
                defaultAperto={true}
              >
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {micro.filter(m => !isBefore(m.fine, oggi)).slice(0, 4).map(m => {
                    const v = VolumeIndividuale.settimana(m, atleta, assenze);
                    return (
                      <div key={m.id} className="p-2.5 bg-surface-container-low rounded-lg text-center shadow-sm">
                        <div className="font-label-caps text-label-caps text-on-surface-variant uppercase">{formattaData(m.inizio)}</div>
                        <div className="font-headline-md text-headline-md text-primary mt-0.5 tabular-nums">{v.metri} m</div>
                        <div className="font-label-caps text-label-caps text-on-surface-variant capitalize mt-0.5">{m.tipo.toLowerCase()}</div>
                      </div>
                    );
                  })}
                </div>
              </Sezione>
            </div>
          )}

          {/* TAB 3: CERTIFICATI & LIMITAZIONI */}
          {tabDettaglio === 'certificati' && (
            <div className="space-y-4">
              <Sezione 
                titolo="Condizioni Mediche & Limitazioni" 
                icon={<HeartPulse size={15} />}
                badge={condizioni.length}
                riepilogoChiuso={`${condizioni.length} registrate`}
                storageKey="atleta_condizioni"
                defaultAperto={true}
              >
                <div className="space-y-2">
                  {condizioni.map(c => (
                <div
                  key={c.id}
                  className="p-3 bg-surface-container-low rounded-lg border border-outline-variant flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <span className="font-headline-sm text-headline-sm text-on-surface block break-words">{c.descrizione}</span>
                    {c.limitazioni && (
                      <span className="text-on-surface-variant block mt-0.5 break-words">Limitazioni: {c.limitazioni}</span>
                    )}
                  </div>
                  <button
                    onClick={() => onEliminaCondizione(c.id)}
                    aria-label="Elimina condizione"
                    className="w-12 h-12 -m-2 flex items-center justify-center text-on-surface-variant hover:text-error rounded-lg hover:bg-surface-container transition shrink-0"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}

              {/* Add Condition Form */}
              <div className="p-3 bg-surface-container-low rounded-xl border border-dashed border-outline-variant space-y-2">
                <Input
                  type="text"
                  placeholder="Diagnosi / Condizione medica (es. Paraplegia T6, Acondroplasia...)"
                  aria-label="Diagnosi / Condizione medica"
                  value={nuovaCond}
                  onChange={e => setNuovaCond(e.target.value)}
                />
                <Input
                  type="text"
                  placeholder="Limitazioni fisiche per l'allenamento in vasca..."
                  aria-label="Limitazioni fisiche"
                  value={nuovaLimitaz}
                  onChange={e => setNuovaLimitaz(e.target.value)}
                />
                <Button
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
                  className="w-full"
                >
                  Aggiungi Condizione Medica
                </Button>
              </div>
            </div>
          </Sezione>

          {/* Assenze Programmate Management */}
          <SezioneAssenzeAtleta
            atletaId={atleta.id}
            assenze={assenze}
            gare={gare}
            onEliminaAssenza={onEliminaAssenza}
            onAggiungiAssenza={onAggiungiAssenza}
          />

          {/* Piano individuale dell'atleta (C4): volumi, tapering, gare */}
          <Sezione
            titolo="Piano Atleta"
            icon={<Calendar size={15} />}
            storageKey="atleta_piano"
            defaultAperto={false}
          >
            <PianoAtletaPanel atleta={atleta} />
          </Sezione>
            </div>
          )}
        </Tabs>

        {/* Footer Actions */}
        <div className="p-4 border-t border-outline-variant flex items-center justify-between shrink-0 bg-surface-container-low rounded-b-2xl">
          <div className="flex gap-2">
            <Button
              variant="secondary"
              icon={<Edit2 size={14} />}
              onClick={() => setModificaOpen(true)}
            >
              Modifica
            </Button>
            <Button
              variant="danger"
              icon={<Trash2 size={14} />}
              onClick={() => {
                if (window.confirm(`Sei sicuro di voler eliminare ${atleta.nome} ${atleta.cognome}?`)) {
                  onEliminaAtleta(atleta.id);
                }
              }}
            >
              Elimina
            </Button>
          </div>

          <Button variant="secondary" onClick={onChiudi}>
            Chiudi
          </Button>
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
