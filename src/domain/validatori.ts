import { Assenza, Atleta, Avviso, CondizioneMedica, Gara, Microciclo, Stagione } from '../types';
import { ClassiSportive } from './classiSportive';
import { daysBetween, formattaData, isAfter, isBefore } from './dateUtils';

export class PianoValidator {
  private static readonly SOGLIA_ATTENZIONE = 0.10;
  private static readonly SOGLIA_ERRORE = 0.20;
  private static readonly MAX_SETTIMANE_CARICO = 4;

  static valida(stagione: Stagione, micro: Microciclo[], gare: Gara[]): Avviso[] {
    const avvisi: Avviso[] = [];

    gare
      .filter(g => isBefore(g.dal, stagione.inizio) || isAfter(g.al, stagione.fine))
      .forEach(g => {
        avvisi.push({
          gravita: 'ERRORE',
          messaggio: `La gara "${g.nome}" è fuori dalla stagione`
        });
      });

    if (!gare.some(g => g.prioritaria)) {
      avvisi.push({
        gravita: 'INFO',
        messaggio: 'Nessuna gara prioritaria: senza, il piano non prevede lo scarico pre-gara (tapering).'
      });
    }

    let riferimento: Microciclo | null = null;
    let caricoConsecutivi = 0;

    const ordinati = [...micro].sort((a, b) => a.inizio.localeCompare(b.inizio));
    for (const m of ordinati) {
      if (m.tipo === 'CARICO') {
        caricoConsecutivi++;
        const r = riferimento;
        if (r && r.sedutePreviste > 0 && m.sedutePreviste > 0) {
          const prima = r.volumeTargetMetri / r.sedutePreviste;
          const ora = m.volumeTargetMetri / m.sedutePreviste;
          if (prima > 0) {
            const incremento = (ora - prima) / prima;
            const percentuale = Math.round(incremento * 100);
            const settimana = formattaData(m.inizio);
            if (incremento > this.SOGLIA_ERRORE) {
              avvisi.push({
                gravita: 'ERRORE',
                messaggio: `Settimana del ${settimana}: volume per seduta +${percentuale}% rispetto alla settimana di carico precedente`
              });
            } else if (incremento > this.SOGLIA_ATTENZIONE) {
              avvisi.push({
                gravita: 'ATTENZIONE',
                messaggio: `Settimana del ${settimana}: volume per seduta +${percentuale}% (soglia consigliata 10%)`
              });
            }
          }
        }
        riferimento = m;
        if (caricoConsecutivi === this.MAX_SETTIMANE_CARICO + 1) {
          avvisi.push({
            gravita: 'ATTENZIONE',
            messaggio: `Più di ${this.MAX_SETTIMANE_CARICO} settimane di carico consecutive dal ${formattaData(m.inizio)}: valuta uno scarico`
          });
        }
      } else {
        caricoConsecutivi = 0;
      }
    }

    return avvisi;
  }
}

export class AtletaValidator {
  static valida(
    atleta: Atleta,
    condizioni: CondizioneMedica[],
    assenze: Assenza[],
    oggi: string
  ): Avviso[] {
    const avvisi: Avviso[] = [];

    ClassiSportive.valida(atleta.classeS, atleta.classeSB, atleta.classeSM).forEach(err => {
      avvisi.push({ gravita: 'ERRORE', messaggio: err });
    });

    if (atleta.stato === 'IN_ATTESA') {
      avvisi.push({
        gravita: 'INFO',
        messaggio: 'Classificazione non ufficiale: classi e indicazioni sulle gare sono provvisorie'
      });
    }

    if (atleta.fattoreVolume < 1.0) {
      avvisi.push({
        gravita: 'INFO',
        messaggio: `Volume ridotto al ${Math.round(atleta.fattoreVolume * 100)}% del volume di squadra`
      });
    }

    condizioni
      .filter(c => c.attiva && c.limitazioni.trim().length > 0)
      .forEach(c => {
        avvisi.push({
          gravita: 'ATTENZIONE',
          messaggio: `${c.descrizione}: ${c.limitazioni}`
        });
      });

    for (const a of assenze) {
      const dur = daysBetween(a.dal, a.al) + 1;
      const inCorso = !isBefore(oggi, a.dal) && !isAfter(oggi, a.al);
      const finitaDaPoco = isBefore(a.al, oggi) && daysBetween(a.al, oggi) <= 7;

      if (inCorso) {
        avvisi.push({
          gravita: 'INFO',
          messaggio: `Assente fino al ${formattaData(a.al)}`
        });
      }

      if (dur >= 14 && (inCorso || finitaDaPoco)) {
        avvisi.push({
          gravita: 'ATTENZIONE',
          messaggio: `Assenza di ${dur} giorni: prevedi un rientro graduale del volume`
        });
      }
    }

    return avvisi;
  }
}
