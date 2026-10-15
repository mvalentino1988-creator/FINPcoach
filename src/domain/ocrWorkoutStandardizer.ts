import { Atleta } from '../types';

export class OcrWorkoutStandardizer {
  static standardizzaEsepara(testoOcr: string, atleti: Atleta[]): { atletaId: number | null; testo: string }[] {
    const linee = testoOcr.split('\n');
    const risultati: { atletaId: number | null; testo: string }[] = [];

    let atletaCorrenteId: number | null = null;
    let lineeCorrenti: string[] = [];

    for (const riga of linee) {
      const rigaTrim = riga.trim();
      if (!rigaTrim) continue;

      let atletaTrovato: Atleta | null = null;
      for (const a of atleti) {
        const nomeFull = `${a.cognome} ${a.nome}`.toLowerCase();
        const cognome = a.cognome.toLowerCase();
        const rigaLower = rigaTrim.toLowerCase();
        if (rigaLower.startsWith(nomeFull) || rigaLower.startsWith(cognome) || rigaLower.includes(`per ${cognome}`)) {
          atletaTrovato = a;
          break;
        }
      }

      if (atletaTrovato) {
        if (lineeCorrenti.length > 0) {
          risultati.push({
            atletaId: atletaCorrenteId,
            testo: this.formattaStandard(lineeCorrenti.join('\n'))
          });
          lineeCorrenti = [];
        }
        atletaCorrenteId = atletaTrovato.id;
        const testoPulito = rigaTrim.replace(new RegExp(`^(${atletaTrovato.cognome}|${atletaTrovato.cognome}\\s*${atletaTrovato.nome})[:\\-\\s]*`, 'i'), '').trim();
        if (testoPulito) lineeCorrenti.push(testoPulito);
      } else {
        lineeCorrenti.push(rigaTrim);
      }
    }

    if (lineeCorrenti.length > 0) {
      risultati.push({
        atletaId: atletaCorrenteId,
        testo: this.formattaStandard(lineeCorrenti.join('\n'))
      });
    }

    if (risultati.length === 0 && testoOcr.trim()) {
      risultati.push({
        atletaId: null,
        testo: this.formattaStandard(testoOcr)
      });
    }

    return risultati;
  }

  static formattaStandard(testo: string): string {
    const righe = testo.split('\n');
    const formattate: string[] = [];

    for (const riga of righe) {
      let t = riga.trim();
      if (!t) continue;
      t = t.replace(/(\d+)\s*[xX]\s*(\d+)/g, '$1x$2');
      t = t.replace(/(\d+)\s*m\b/gi, '$1m');
      formattate.push(t);
    }

    return formattate.join('\n');
  }
}
