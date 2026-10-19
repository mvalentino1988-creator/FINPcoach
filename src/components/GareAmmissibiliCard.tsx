import React, { useMemo, useState } from 'react';
import { STILE_LABEL, type Atleta } from '../types';
import {
  FONTE_PROGRAMMA,
  classiMancanti,
  valutaProgramma,
  type EsitoGara,
  type FamigliaClasse,
  type Vasca,
} from '../domain/gareAmmissibili';

type FiltroVasca = 'tutte' | Vasca;

const FAMIGLIA_LABEL: Record<FamigliaClasse, string> = {
  S: 'S (stile libero, dorso, farfalla)',
  SB: 'SB (rana)',
  SM: 'SM (misti)',
};

const etichettaGara = (e: EsitoGara): string =>
  `${e.gara.distanza} m ${STILE_LABEL[e.gara.stile]}${e.gara.soloVascaCorta ? ' (solo vasca corta)' : ''}`;

const chiaveGara = (e: EsitoGara): string => `${e.gara.stile}-${e.gara.distanza}`;

interface Props {
  atleta: Atleta;
}

export const GareAmmissibiliCard: React.FC<Props> = ({ atleta }) => {
  const [vasca, setVasca] = useState<FiltroVasca>('tutte');
  const { classeS, classeSB, classeSM } = atleta;

  const esiti = useMemo(
    () => valutaProgramma({ classeS, classeSB, classeSM }, vasca === 'tutte' ? undefined : vasca),
    [classeS, classeSB, classeSM, vasca]
  );

  const mancanti = classiMancanti({ classeS, classeSB, classeSM });
  const ammesse = esiti.filter((e) => e.stato === 'ammessa');
  const nonAmmesse = esiti.filter((e) => e.stato === 'non_ammessa');

  return (
    <section aria-labelledby="gare-ammissibili-titolo" className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 id="gare-ammissibili-titolo" className="text-base font-semibold text-slate-900">
          Gare ammissibili
        </h3>
        <select
          aria-label="Vasca"
          value={vasca}
          onChange={(e) => setVasca(e.target.value as FiltroVasca)}
          className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
        >
          <option value="tutte">Tutte le vasche</option>
          <option value="corta">Vasca corta (25 m)</option>
          <option value="lunga">Vasca lunga (50 m)</option>
        </select>
      </div>

      {mancanti.length > 0 && (
        <p role="note" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          Classi mancanti: {mancanti.map((f) => FAMIGLIA_LABEL[f]).join('; ')}. Le gare collegate non
          si possono valutare finché non vengono inserite.
        </p>
      )}

      {ammesse.length === 0 ? (
        <p className="text-sm text-slate-600">Nessuna gara ammessa con i dati attuali.</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {ammesse.map((e) => (
            <li
              key={chiaveGara(e)}
              className="rounded-full bg-teal-50 px-3 py-1 text-sm text-teal-900"
            >
              {etichettaGara(e)}
            </li>
          ))}
        </ul>
      )}

      {nonAmmesse.length > 0 && (
        <details className="text-sm text-slate-600">
          <summary className="cursor-pointer">Non ammesse ({nonAmmesse.length})</summary>
          <ul className="mt-2 space-y-1">
            {nonAmmesse.map((e) => (
              <li key={chiaveGara(e)}>
                <span className="font-medium">{etichettaGara(e)}</span>: {e.motivo}
              </li>
            ))}
          </ul>
        </details>
      )}

      <p className="text-xs text-slate-500">
        Fonte: {FONTE_PROGRAMMA.fonte}, {FONTE_PROGRAMMA.riferimento} (versione{' '}
        {FONTE_PROGRAMMA.versione}). Solo gare individuali: verifica sempre il regolamento della
        singola manifestazione.
      </p>
    </section>
  );
};
