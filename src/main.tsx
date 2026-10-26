import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';
import { FINPStorage } from './data/storage';
import { caricaDatiStatici } from './data/staticData';

async function avvia() {
  /* Hook di sviluppo: permette agli strumenti di test end-to-end (script
     scripts/ui-shots.mjs) di preparare un ambiente deterministico - ad esempio
     caricare il dataset demo - senza toccare i dati reali dell'allenatore.
     Presente solo in sviluppo: in build di produzione Vite lo rimuove. */
  if (import.meta.env.DEV) {
    (window as unknown as Record<string, unknown>).__FINP_STORAGE = FINPStorage;
  }

  /* Record e regolamenti (~1,2 MB di JSON) vivono in `public/data` e non nel
     bundle: si caricano una sola volta, prima del primo render, così le
     schermate li trovano già disponibili. In Android i file sono negli asset
     e vengono serviti localmente, quindi non serve rete. */
  await caricaDatiStatici();

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

void avvia();
