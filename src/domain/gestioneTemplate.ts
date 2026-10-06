/**
 * Sistema di gestione template esercizi
 * Permette di salvare esercizi comuni come suggerimenti riutilizzabili
 */

export interface EsercizioTemplate {
  id: string;
  nome: string;
  distanza: number;
  stile: string;
  ripetizioni: number;
  tempo?: string;
  descrizione?: string;
  note?: string;
  attrezzi: string[];
  creatoIl: string;
  usi: number;
}

export interface Esercizio {
  id: string;
  distanza: number;
  stile: string;
  ripetizioni: number;
  tempo?: string;
  descrizione?: string;
  note?: string;
  attrezzi: string[];
}

const STORAGE_KEY = 'finpcoach_esercizi_template';

export class GestioneTemplate {
  private static template: EsercizioTemplate[] = [];

  static caricaTemplate() {
    try {
      const salvati = localStorage.getItem(STORAGE_KEY);
      if (salvati) {
        this.template = JSON.parse(salvati);
      }
    } catch (e) {
      this.template = [];
    }
  }

  static salvaTemplate() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.template));
  }

  static getTemplate(): EsercizioTemplate[] {
    if (this.template.length === 0) {
      this.caricaTemplate();
    }
    return [...this.template].sort((a, b) => b.usi - a.usi);
  }

  static aggiungiTemplate(template: Omit<EsercizioTemplate, 'id' | 'creatoIl' | 'usi'>) {
    const nuovo: EsercizioTemplate = {
      ...template,
      id: Date.now().toString(),
      creatoIl: new Date().toISOString(),
      usi: 0
    };
    this.template.push(nuovo);
    this.salvaTemplate();
    return nuovo;
  }

  static usaTemplate(id: string) {
    const idx = this.template.findIndex(t => t.id === id);
    if (idx >= 0) {
      this.template[idx].usi++;
      this.salvaTemplate();
    }
  }

  static eliminaTemplate(id: string) {
    this.template = this.template.filter(t => t.id !== id);
    this.salvaTemplate();
  }

  static formattaEsercizio(es: Esercizio): string {
    const parti: string[] = [];
    
    // Ripetizioni e distanza
    if (es.ripetizioni > 1) {
      parti.push(`${es.ripetizioni}x${es.distanza}`);
    } else {
      parti.push(`${es.distanza}`);
    }
    
    // Stile
    if (es.stile) {
      parti.push(es.stile);
    }
    
    // Attrezzi
    if (es.attrezzi && es.attrezzi.length > 0) {
      parti.push(`con ${es.attrezzi.join(', ')}`);
    }
    
    // Tempo
    if (es.tempo) {
      parti.push(`a ${es.tempo}`);
    }
    
    // Descrizione
    if (es.descrizione) {
      parti.push(es.descrizione);
    }
    
    // Note
    if (es.note) {
      parti.push(`(${es.note})`);
    }
    
    return parti.join(' ');
  }

  static calcolaMetriTotali(esercizi: Esercizio[]): number {
    return esercizi.reduce((sum, es) => sum + (es.distanza * es.ripetizioni), 0);
  }
}
