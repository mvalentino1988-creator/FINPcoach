import React from 'react';
import { CodiceAllenamentoKey } from '../types';

interface Props {
  codici: CodiceAllenamentoKey[];
  titolo?: string;
  compatto?: boolean;
  centrato?: boolean;
}

export const CodiciSeduta: React.FC<Props> = ({ codici, titolo, compatto = false, centrato = false }) => (
  <section className={`rounded-xl border border-outline-variant bg-surface-container-lowest shadow-card ${compatto ? 'p-3' : 'p-4 sm:p-5'}`}>
    {titolo && (
      <div className={`font-label-caps text-label-caps uppercase tracking-wider text-primary font-bold mb-2 ${centrato ? 'text-center' : ''}`}>
        {titolo}
      </div>
    )}
    <div className={`flex flex-wrap items-center gap-2 ${centrato ? 'justify-center' : ''} ${compatto ? '' : 'sm:gap-3'}`} aria-label={`Codici: ${codici.join(' + ')}`}>
      {codici.map((codice, index) => (
        <React.Fragment key={codice}>
          {index > 0 && <span className="text-lg font-bold text-on-surface-variant" aria-hidden="true">+</span>}
          <span className={`font-headline font-bold text-primary tracking-tight ${compatto ? 'text-2xl' : 'text-4xl sm:text-5xl'}`}>
            {codice}
          </span>
        </React.Fragment>
      ))}
    </div>
  </section>
);
