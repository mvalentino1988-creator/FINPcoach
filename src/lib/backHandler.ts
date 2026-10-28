/**
 * Gestione del tasto "indietro" di Android.
 *
 * MainActivity chiama window.__finpHandleBack() prima di usare la cronologia della WebView.
 * Se un gestore risponde `true`, il tasto è stato consumato (es. ha chiuso un popup);
 * se nessuno risponde `true`, l'app esce.
 *
 * I gestori registrati per ultimi hanno la precedenza (il popup aperto viene chiuso
 * prima di cambiare schermata).
 */
type BackHandler = () => boolean;

const handlers: BackHandler[] = [];

/** Registra un gestore. Restituisce la funzione per rimuoverlo (da usare nel cleanup di useEffect). */
export function pushBackHandler(handler: BackHandler): () => void {
  handlers.push(handler);
  return () => {
    const index = handlers.lastIndexOf(handler);
    if (index >= 0) handlers.splice(index, 1);
  };
}

/** Restituisce true se un gestore ha consumato il tasto indietro. */
export function handleBack(): boolean {
  for (let i = handlers.length - 1; i >= 0; i--) {
    if (handlers[i]()) return true;
  }
  return false;
}

if (typeof window !== 'undefined') {
  (window as unknown as { __finpHandleBack?: () => boolean }).__finpHandleBack = handleBack;
}
