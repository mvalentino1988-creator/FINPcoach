import React, { useState, useEffect } from 'react';
import { useApp } from '../data/AppContext';
import {
  Activity,
  AlertTriangle,
  Award,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Layers,
  Printer,
  ShieldAlert,
  Sliders,
  Sparkles,
  Users,
  Waves,
  Zap,
  EyeOff,
  ArrowLeft,
  HeartPulse
} from 'lucide-react';
import { PageHeader } from './PageHeader';
import { Marquee } from './Marquee';

export const RegiaTecnicaCorsie: React.FC = () => {
  const { atleti, condizioni } = useApp();
  const [showBack, setShowBack] = useState(false);

  useEffect(() => {
    const isFromAltro = sessionStorage.getItem('finp_from_altro') === 'true';
    setShowBack(isFromAltro);
  }, []);

  const handleBack = () => {
    sessionStorage.removeItem('finp_from_altro');
    window.history.back();
  };

  const [vascaAttiva, setVascaAttiva] = useState<'50m' | '25m'>('50m');
  const [prescrizioniEspanso, setPrescrizioniEspanso] = useState(false);
  const [caricoDettaglio, setCaricoDettaglio] = useState(false);

  // Active medical conditions
  const miePrescrizioni = condizioni.filter(c => c.attiva);

  // Assegnazione dinamica delle corsie con supporto multi-atleta per corsia
  const corsie = [1, 2, 3, 4].map(num => {
    const a = atleti[num - 1];
    const conds = a ? condizioni.filter(c => c.atletaId === a.id && c.attiva) : [];
    return {
      numero: num,
      atletiList: a ? [{
        id: a.id,
        nome: `${a.cognome} ${a.nome}`,
        classe: a.classeS != null ? `S${a.classeS}` : 'S9',
        hasPrescrizione: conds.length > 0,
        prescrizioneText: conds.map(c => c.descrizione || c.limitazioni).join(', ')
      }] : [],
      targetPacing: a ? 'Passo Gara' : '—',
      focus: a ? 'Spinta uniforme' : 'Corsia disponibile'
    };
  });

  return (
    <div className="flex flex-1 min-h-0 flex-col gap-2 overflow-hidden">
      {/* Intestazione pagina */}
      <div className="shrink-0">
        <PageHeader
          label="Pianificatore"
          title={`Regia Tecnica · Vasca ${vascaAttiva}`}
          icon={<Sliders size={13} />}
          meta="Assegnazione corsie, prescrizioni mediche e controllo carico"
          right={
            <div className="flex items-center gap-1.5">
              {showBack && (
                <button
                  onClick={handleBack}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-surface-container-high text-on-surface hover:bg-surface-container-highest transition text-xs font-bold"
                  aria-label="Indietro"
                >
                  <ArrowLeft size={15} />
                  <span>Indietro</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setVascaAttiva(v => (v === '50m' ? '25m' : '50m'))}
                className="ds-btn-secondary !min-h-[38px] !px-2.5 text-xs shrink-0"
              >
                <Waves size={14} />
                <span>Vasca {vascaAttiva}</span>
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="ds-btn-primary !min-h-[38px] !px-2.5 text-xs shrink-0"
              >
                <Printer size={14} />
                <span>Stampa</span>
              </button>
            </div>
          }
        />
      </div>

      {/* 1. TELEMETRIA COMPRESSA IN UNA RIGA DI CHIP */}
      <section aria-label="Telemetria" className="shrink-0 ds-card p-2 flex items-center justify-between gap-1.5 overflow-x-auto text-xs">
        <span className="ds-chip bg-primary/10 text-primary border border-primary/20 shrink-0">
          <Activity size={13} /> Corsie: {atleti.length > 0 ? Math.min(4, atleti.length) : 0}/4
        </span>
        <span className="ds-chip bg-surface-container text-on-surface border border-outline-variant shrink-0">
          <Waves size={13} /> Vasca {vascaAttiva}
        </span>
        <span className="ds-chip bg-surface-container text-on-surface border border-outline-variant shrink-0">
          <Zap size={13} /> Squadra FINP
        </span>
        <span className="ds-chip bg-success-container text-on-success-container border border-success/30 shrink-0">
          <CheckCircle2 size={13} /> Pronto Bordo Vasca
        </span>
      </section>

      {/* 2. PRESCRIZIONI MEDICHE (SEMPRE VISIBILE BANNER ROSSO COMPATTO) */}
      <section className="shrink-0 ds-card p-2.5 bg-error-container/80 border-l-4 border-l-error text-on-error-container space-y-1.5">
        <button
          type="button"
          onClick={() => setPrescrizioniEspanso(v => !v)}
          className="w-full flex items-center justify-between gap-2 text-left"
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <ShieldAlert size={16} className="text-error shrink-0" />
            <span className="font-headline font-bold text-xs uppercase tracking-wider">
              Prescrizioni Mediche ({miePrescrizioni.length})
            </span>
            {!prescrizioniEspanso && miePrescrizioni.length > 0 && (
              <div className="min-w-0 flex-1 font-bold text-xs truncate">
                <Marquee text={`${miePrescrizioni[0].atletaId ? atleti.find(a => a.id === miePrescrizioni[0].atletaId)?.cognome || 'Atleta' : 'Squadra'}: ${miePrescrizioni[0].descrizione || miePrescrizioni[0].limitazioni}`} />
              </div>
            )}
          </div>
          <span className="w-6 h-6 rounded-full bg-error/20 text-error flex items-center justify-center shrink-0">
            {prescrizioniEspanso ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </span>
        </button>

        {prescrizioniEspanso && (
          <div className="space-y-1 pt-1 border-t border-error/30 text-xs max-h-36 overflow-y-auto animate-fade-in">
            {miePrescrizioni.map((c, idx) => {
              const a = atleti.find(atl => atl.id === c.atletaId);
              return (
                <div key={c.id || idx} className="p-1.5 rounded-lg bg-white/60 dark:bg-black/30 border border-error/20 flex items-start gap-1.5">
                  <HeartPulse size={14} className="text-error shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <span className="font-bold text-on-error-container">{a ? `${a.cognome} ${a.nome}` : 'Atleta'}: </span>
                    <span>{c.descrizione || c.limitazioni} {c.limitazioni ? `(${c.limitazioni})` : ''}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 3. CARICO FISIOLOGICO (UNA SOLA RIGA SEGMENTATA) */}
      <section className="shrink-0 ds-card p-2.5 space-y-1.5">
        <button
          type="button"
          onClick={() => setCaricoDettaglio(v => !v)}
          className="w-full flex items-center justify-between text-xs font-bold font-headline text-on-surface"
        >
          <span className="flex items-center gap-1.5 text-primary">
            <Activity size={15} /> Carico Fisiologico (4.200m)
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-on-surface-variant font-mono">A1/A2: 45% · B1/B2: 38% · Tec: 17%</span>
            {caricoDettaglio ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </button>

        <div className="w-full h-2.5 rounded-full overflow-hidden flex bg-surface-container">
          <div className="h-full bg-zone-a" style={{ width: '45%' }} title="A1/A2: 1.890m (45%)" />
          <div className="h-full bg-zone-b" style={{ width: '38%' }} title="B1/B2: 1.596m (38%)" />
          <div className="h-full bg-zone-tec" style={{ width: '17%' }} title="Tecnica: 714m (17%)" />
        </div>

        {caricoDettaglio && (
          <div className="grid grid-cols-3 gap-2 pt-1.5 border-t border-outline-variant/60 text-xs animate-fade-in">
            <div className="p-2 rounded-xl bg-zone-a/10 border border-zone-a/30">
              <div className="font-bold text-zone-a">A1 / A2 Aerobico</div>
              <div className="font-mono font-bold text-on-surface">1.890m (45%)</div>
            </div>
            <div className="p-2 rounded-xl bg-zone-b/10 border border-zone-b/30">
              <div className="font-bold text-zone-b">B1 / B2 Soglia</div>
              <div className="font-mono font-bold text-on-surface">1.596m (38%)</div>
            </div>
            <div className="p-2 rounded-xl bg-zone-tec/10 border border-zone-tec/30">
              <div className="font-bold text-zone-tec">Tecnica / Def</div>
              <div className="font-mono font-bold text-on-surface">714m (17%)</div>
            </div>
          </div>
        )}
      </section>

      {/* 4. BLOCCO PRINCIPALE: ASSEGNAZIONE CORSIE (CARD COMPATTE CON INDICATORE MEDICO) */}
      <section className="flex-1 min-h-0 ds-card p-3 space-y-2 flex flex-col">
        <div className="flex items-center justify-between shrink-0">
          <h3 className="font-headline font-bold text-xs text-on-surface uppercase tracking-wider">
            Assegnazione Corsie (Vasca {vascaAttiva})
          </h3>
          <span className="text-xs font-bold text-primary font-headline">4 Corsie</span>
        </div>

        <div className="flex-1 min-h-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 overflow-y-auto pr-0.5">
          {corsie.map(c => (
            <div
              key={c.numero}
              className="p-3 rounded-2xl bg-surface-container-low border border-outline-variant/80 flex flex-col justify-between gap-2 min-w-0"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2 border-b border-outline-variant/60 pb-1.5">
                  <span className="w-7 h-7 rounded-xl bg-primary text-white font-headline text-xs font-bold flex items-center justify-center shadow-sm">
                    C{c.numero}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-surface-container text-primary font-mono">
                    {c.targetPacing}
                  </span>
                </div>

                {c.atletiList.length === 0 ? (
                  <div className="text-xs text-on-surface-variant italic py-2">Corsia libera</div>
                ) : (
                  <div className="space-y-1.5">
                    {c.atletiList.map(ath => (
                      <div key={ath.id} className="p-2 rounded-xl bg-surface-container-lowest border border-outline-variant/60 flex items-center justify-between gap-1.5 text-xs">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-on-surface truncate min-w-0 flex-1">
                              <Marquee text={ath.nome} />
                            </span>
                            <span className="px-1.5 py-0.2 rounded bg-primary text-white font-bold text-[10px] shrink-0 font-headline">
                              {ath.classe}
                            </span>
                            {ath.hasPrescrizione && (
                              <span className="w-5 h-5 rounded-full bg-error-container text-error flex items-center justify-center shrink-0" title={`Prescrizione: ${ath.prescrizioneText}`}>
                                <ShieldAlert size={12} />
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="text-[11px] text-on-surface-variant font-medium pt-1.5 border-t border-outline-variant/60 truncate">
                Focus: {c.focus}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
