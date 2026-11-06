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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <div className="w-full sm:max-w-2xl bg-surface-container-lowest rounded-t-2xl sm:rounded-2xl shadow-xl border border-slate-200/70 max-h-[94vh] overflow-y-auto">
        <div className="flex items-center justify-between gap-3 p-4 border-b border-slate-200/70 sticky top-0 bg-surface-container-lowest">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-9 h-9 rounded-lg bg-primary text-on-primary flex items-center justify-center shrink-0">
              <Bot size={18} />
            </span>
            <div className="min-w-0">
              <h3 className="font-headline-sm text-headline-sm text-on-surface leading-snug">
                Genera scheda con IA esterna
              </h3>
              <p className="ds-label !normal-case">
                {atleta ? `${atleta.cognome} ${atleta.nome}` : 'Squadra'} · {formattaData(data)} · {volumeSessione} m
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => setMostraConfig(!mostraConfig)} className="ds-btn-icon" title="Configurazione IA">
              <Settings size={18} />
            </button>
            <button type="button" onClick={onClose} className="ds-btn-icon" aria-label="Chiudi">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {mostraConfig && (
            <div className="rounded-xl border border-slate-200/70 bg-surface-container-low p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-body-bold font-body-bold text-on-surface">Endpoint OpenAI-compatible</span>
                <span className="ds-label">Salvato in locale</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  value={config.endpoint}
                  onChange={(e) => setConfig({ ...config, endpoint: e.target.value })}
                  placeholder="https://api.openai.com/v1"
                  className="px-3 h-11 border border-outline-variant rounded-lg text-sm"
                />
                <input
                  value={config.model}
                  onChange={(e) => setConfig({ ...config, model: e.target.value })}
                  placeholder="gpt-4o-mini"
                  className="px-3 h-11 border border-outline-variant rounded-lg text-sm"
                />
              </div>
              <input
                type="password"
                value={config.apiKey}
                onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                placeholder="API key"
                className="w-full px-3 h-11 border border-outline-variant rounded-lg text-sm"
              />
              <div className="flex items-center justify-between gap-2">
                <select
                  value={config.providerWeb}
                  onChange={(e) => setConfig({ ...config, providerWeb: e.target.value as any })}
                  className="px-3 h-11 border border-outline-variant rounded-lg text-sm"
                >
                  <option value="chatgpt">ChatGPT</option>
                  <option value="claude">Claude</option>
                  <option value="gemini">Gemini</option>
                </select>
                <button type="button" onClick={salvaConfig} className="ds-btn-primary">
                  Salva configurazione
                </button>
              </div>
            </div>
          )}

          <div className="rounded-xl border border-slate-200/70 bg-surface-container-low p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-body-bold font-body-bold text-on-surface">Prompt preimpostato</span>
              <div className="flex items-center gap-1">
                <button type="button" onClick={copiaPrompt} className="ds-btn-icon" title="Copia prompt">
                  <Copy size={16} />
                </button>
                <button type="button" onClick={apriWeb} className="ds-btn-icon" title="Apri IA web">
                  <ExternalLink size={16} />
                </button>
              </div>
            </div>
            <textarea
              readOnly
              value={promptGenerato}
              className="w-full h-40 p-3 border border-outline-variant rounded-lg text-xs font-mono resize-none"
            />
            {copiato && <p className="text-body-base font-body-base text-primary">Prompt copiato negli appunti.</p>}
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={generaConAPI}
              disabled={caricamento}
              className="ds-btn-primary flex-1"
            >
              {caricamento ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
              <span>Genera con endpoint configurato</span>
            </button>
            <button type="button" onClick={apriWeb} className="ds-btn-ghost flex-1">
              <ExternalLink size={18} />
              <span>Copia prompt e apri {config.providerWeb}</span>
            </button>
          </div>

          {avvisoWeb && (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-body-base font-body-base text-on-surface">
              {avvisoWeb}
            </div>
          )}

          {errore && (
            <div className="rounded-xl border border-error/40 bg-error-container p-3 text-body-base font-body-base text-on-error-container">
              {errore}
            </div>
          )}

          <div className="rounded-xl border border-slate-200/70 bg-surface-container-low p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-body-bold font-body-bold text-on-surface">Risposta IA</span>
              <span className="ds-label">Revisione prima del salvataggio</span>
            </div>
            <textarea
              value={testoIA}
              onChange={(e) => setTestoIA(e.target.value)}
              placeholder="Incolla qui la risposta dell'IA (JSON o testo con le serie)…"
              className="w-full h-32 p-3 border border-outline-variant rounded-lg text-xs font-mono resize-none"
            />
            {anteprimaTesto && (
              <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-3 max-h-36 overflow-y-auto">
                <div className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1">Anteprima scheda</div>
                <pre className="whitespace-pre-wrap text-xs text-on-surface font-body">{anteprimaTesto}</pre>
              </div>
            )}
            <button
              type="button"
              onClick={usaTestoIA}
              disabled={!anteprimaTesto}
              className="ds-btn-primary disabled:opacity-50"
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
