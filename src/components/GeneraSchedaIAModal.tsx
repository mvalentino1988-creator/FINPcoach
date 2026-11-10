import React, { useMemo, useState } from 'react';
import {
  Atleta,
  CodiceAllenamentoKey,
  FaseMesociclo,
  ParametriSeduta,
  Tempo,
  TipoMicrociclo,
} from '../types';
import { todayISO, formattaData } from '../domain/dateUtils';
import { FINPStorage } from '../data/storage';
import {
  IAConfig,
  IAContesto,
  apriIAWeb,
  chiamaIA,
  costruisciPromptScheda,
  estraiRisposta,
  rispostaToTesto,
  urlProviderWeb,
} from '../domain/iaEsterna';
import { Bot, Copy, ExternalLink, Loader2, Settings, Sparkles, X } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  onSchedaGenerata: (testo: string) => void;
  data: string;
  atleta: Atleta | null;
  fase: FaseMesociclo;
  tipoMicro: TipoMicrociclo;
  parametri: ParametriSeduta;
  volumeSessione: number;
  volumeSettimana: number;
  tempi: Tempo[];
  codiciAllenamento: CodiceAllenamentoKey[];
}

export const GeneraSchedaIAModal: React.FC<Props> = ({
  open,
  onClose,
  onSchedaGenerata,
  data,
  atleta,
  fase,
  tipoMicro,
  parametri,
  volumeSessione,
  volumeSettimana,
  tempi,
  codiciAllenamento,
}) => {
  const [config, setConfig] = useState<IAConfig>(() => FINPStorage.getIAConfig());
  const [mostraConfig, setMostraConfig] = useState(false);
  const [caricamento, setCaricamento] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [testoIA, setTestoIA] = useState('');
  const [copiato, setCopiato] = useState(false);
  const [avvisoWeb, setAvvisoWeb] = useState<string | null>(null);

  const etaAtleta = useMemo(() => {
    if (!atleta?.dataNascita) return null;
    const oggi = new Date(todayISO());
    const nasc = new Date(atleta.dataNascita);
    let eta = oggi.getFullYear() - nasc.getFullYear();
    const m = oggi.getMonth() - nasc.getMonth();
    if (m < 0 || (m === 0 && oggi.getDate() < nasc.getDate())) eta--;
    return eta;
  }, [atleta]);

  const ctx: IAContesto = useMemo(
    () => ({
      data,
      atleta,
      squadra: !atleta,
      etaAtleta,
      fase,
      tipoMicro,
      parametri,
      volumeSessione,
      volumeSettimana,
      tempi,
    }),
    [data, atleta, etaAtleta, fase, tipoMicro, parametri, volumeSessione, volumeSettimana, tempi]
  );

  const promptGenerato = useMemo(
    () => costruisciPromptScheda(ctx, codiciAllenamento),
    [ctx, codiciAllenamento]
  );

  const salvaConfig = () => {
    FINPStorage.saveIAConfig(config);
    setMostraConfig(false);
  };

  const generaConAPI = async () => {
    setCaricamento(true);
    setErrore(null);
    setTestoIA('');
    const esito = await chiamaIA(config, promptGenerato);
    setCaricamento(false);
    if (!esito.ok || !esito.testo) {
      setErrore(esito.errore || 'Errore sconosciuto');
      return;
    }
    setTestoIA(esito.testo);
  };

  const copiaPrompt = async () => {
    try {
      await navigator.clipboard.writeText(promptGenerato);
      setCopiato(true);
      setTimeout(() => setCopiato(false), 2000);
    } catch {
      setCopiato(false);
    }
  };

  const apriWeb = async () => {
    const copiatoNegliAppunti = await apriIAWeb(config.providerWeb, promptGenerato);
    setAvvisoWeb(
      copiatoNegliAppunti
        ? 'Prompt copiato negli appunti: se l’IA non si apre con il testo già pronto, incollalo manualmente.'
        : 'Copia automatica non riuscita: seleziona il prompt e copialo manualmente.'
    );
  };

  const testoDaSalvare = useMemo(() => {
    const risposta = estraiRisposta(testoIA);
    if (risposta) {
      const convertito = rispostaToTesto(risposta);
      if (convertito) return convertito;
    }
    return testoIA.trim();
  }, [testoIA]);

  const anteprimaTesto = useMemo(() => testoDaSalvare || '', [testoDaSalvare]);

  const usaTestoIA = () => {
    if (!anteprimaTesto) {
      setErrore('Incolla prima la risposta dell’IA o genera una scheda con l’endpoint.');
      return;
    }
    onSchedaGenerata(anteprimaTesto);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-fade-in">
      <div className="w-full sm:max-w-2xl bg-surface-container-lowest rounded-t-3xl sm:rounded-3xl border border-outline-variant shadow-float max-h-[94dvh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-4 sm:px-5 pt-4 sm:pt-5 pb-3 border-b border-outline-variant shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-10 h-10 rounded-xl bg-primary-fixed text-on-primary-fixed-variant flex items-center justify-center shrink-0">
              <Bot size={20} />
            </span>
            <div className="min-w-0">
              <h3 className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface leading-snug">
                Genera Scheda con IA Esterna
              </h3>
              <p className="text-xs text-on-surface-variant mt-0.5 truncate">
                {atleta ? `${atleta.cognome} ${atleta.nome}` : 'Squadra'} · {formattaData(data)} · {volumeSessione} m
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button type="button" onClick={() => setMostraConfig(!mostraConfig)} className="ds-btn-icon" title="Configurazione IA">
              <Settings size={18} />
            </button>
            <button type="button" onClick={onClose} className="ds-btn-icon" aria-label="Chiudi">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
          {mostraConfig && (
            <div className="ds-card-flat p-3.5 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-body-bold font-body-bold text-on-surface">Endpoint OpenAI-compatible</span>
                <span className="ds-label">Salvato in locale</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  value={config.endpoint}
                  onChange={(e) => setConfig({ ...config, endpoint: e.target.value })}
                  placeholder="https://api.openai.com/v1"
                  className="ds-input !h-11"
                />
                <input
                  value={config.model}
                  onChange={(e) => setConfig({ ...config, model: e.target.value })}
                  placeholder="gpt-4o-mini"
                  className="ds-input !h-11"
                />
              </div>
              <input
                type="password"
                value={config.apiKey}
                onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                placeholder="API key"
                className="ds-input"
              />
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <select
                  value={config.providerWeb}
                  onChange={(e) => setConfig({ ...config, providerWeb: e.target.value as any })}
                  className="ds-select flex-1"
                >
                  <option value="chatgpt">ChatGPT</option>
                  <option value="claude">Claude</option>
                  <option value="gemini">Gemini</option>
                </select>
                <button type="button" onClick={salvaConfig} className="ds-btn-primary !min-h-[44px]">
                  Salva configurazione
                </button>
              </div>
            </div>
          )}

          <div className="ds-card-flat p-3.5 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-body-bold font-body-bold text-on-surface">Prompt preimpostato</span>
              <div className="flex items-center gap-1">
                <button type="button" onClick={copiaPrompt} className="ds-btn-icon !w-9 !h-9" title="Copia prompt">
                  <Copy size={16} />
                </button>
                <button type="button" onClick={apriWeb} className="ds-btn-icon !w-9 !h-9" title="Apri IA web">
                  <ExternalLink size={16} />
                </button>
              </div>
            </div>
            <textarea
              readOnly
              value={promptGenerato}
              className="ds-input !h-auto min-h-[10rem] p-3 font-mono text-xs resize-none"
            />
            {copiato && <p className="ds-chip-green self-start !min-h-0">Prompt copiato negli appunti.</p>}
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={generaConAPI}
              disabled={caricamento}
              className="ds-btn-primary flex-1 disabled:opacity-50"
            >
              {caricamento ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
              <span>Genera con endpoint configurato</span>
            </button>
            <button type="button" onClick={apriWeb} className="ds-btn-secondary flex-1">
              <ExternalLink size={18} />
              <span>Copia prompt e apri {config.providerWeb}</span>
            </button>
          </div>

          {avvisoWeb && (
            <div className="rounded-xl border border-primary/30 bg-primary-fixed/30 p-3 text-body-base font-body-base text-on-surface">
              {avvisoWeb}
            </div>
          )}

          {errore && (
            <div className="ds-chip-coral !min-h-0 self-start">
              {errore}
            </div>
          )}

          <div className="ds-card-flat p-3.5 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-body-bold font-body-bold text-on-surface">Risposta IA</span>
              <span className="ds-label">Revisione prima del salvataggio</span>
            </div>
            <textarea
              value={testoIA}
              onChange={(e) => setTestoIA(e.target.value)}
              placeholder="Incolla qui la risposta dell'IA (JSON o testo con le serie)…"
              className="ds-input !h-auto min-h-[8rem] p-3 font-mono text-xs resize-none"
            />
            {anteprimaTesto && (
              <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-3 max-h-36 overflow-y-auto">
                <div className="ds-label mb-1.5">Anteprima scheda</div>
                <pre className="whitespace-pre-wrap text-xs text-on-surface font-body-base">{anteprimaTesto}</pre>
              </div>
            )}
            <button
              type="button"
              onClick={usaTestoIA}
              disabled={!anteprimaTesto}
              className="ds-btn-primary w-full disabled:opacity-50"
            >
              <Sparkles size={18} />
              <span>Salva scheda</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
