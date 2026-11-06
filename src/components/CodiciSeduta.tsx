import React from 'react';
import { CodiceAllenamentoKey } from '../types';

interface Props {
  codici: CodiceAllenamentoKey[];
  titolo?: string;
  compatto?: boolean;
  centrato?: boolean;
}

export const CodiciSeduta: React.FC<Props> = ({ codici, titolo, compatto = false, centrato = false }) => (
  <section className={`rounded-2xl border border-primary/20 bg-primary/5 ${compatto ? 'p-3' : 'p-5 sm:p-6'}`}>
    {titolo && <div className={`text-xs font-bold uppercase tracking-wider text-primary mb-2 ${centrato ? 'text-center' : ''}`}>{titolo}</div>}
    <div className={`flex flex-wrap items-center gap-2 ${centrato ? 'justify-center' : ''} ${compatto ? '' : 'sm:gap-3'}`} aria-label={`Codici: ${codici.join(' + ')}`}>
      {codici.map((codice, index) => (
        <React.Fragment key={codice}>
          {index > 0 && <span className="text-lg font-bold text-on-surface-variant" aria-hidden="true">+</span>}
          <span className={`font-headline font-bold text-primary ${compatto ? 'text-2xl' : 'text-4xl sm:text-5xl'}`}>
            {codice}
          </span>
        </React.Fragment>
      ))}
    </div>
  </section>
);
