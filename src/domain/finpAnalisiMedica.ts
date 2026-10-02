import { AnalisiMedicaResult, FlagMedici, StimaClassiFINP } from '../types';

class Testo {
  private t: string;
  private negazioni = new Set([
    'no', 'non', 'senza', 'assenza', 'escluso', 'esclusa', 'negativo', 'negativa', 'nessun', 'nessuna'
  ]);
  private reParola = /[\p{L}\d]+/gu;

  constructor(testo: string) {
    this.t = testo.toLowerCase();
  }

  private negato(indice: number): boolean {
    const sub = this.t.substring(0, indice);
    const matches = Array.from(sub.matchAll(this.reParola)).map(m => m[0]);
    const prima = matches.slice(-2);
    return prima.some(p => this.negazioni.has(p));
  }

  pref(...radici: string[]): boolean {
    return radici.some(r => {
      const escaped = r.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(?<![\\p{L}\\d])${escaped}`, 'gui');
      let match: RegExpExecArray | null;
      while ((match = regex.exec(this.t)) !== null) {
        if (!this.negato(match.index)) {
          return true;
        }
      }
      return false;
    });
  }

  parola(...parole: string[]): boolean {
    return parole.some(p => {
      const escaped = p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(?<![\\p{L}\\d])${escaped}(?![\\p{L}\\d])`, 'gui');
      let match: RegExpExecArray | null;
      while ((match = regex.exec(this.t)) !== null) {
        if (!this.negato(match.index)) {
          return true;
        }
      }
      return false;
    });
  }
}

const CODICI_SPINALI: string[] = [
  ...Array.from({ length: 8 }, (_, i) => `c${i + 1}`),
  ...Array.from({ length: 12 }, (_, i) => `t${i + 1}`),
  ...Array.from({ length: 5 }, (_, i) => `l${i + 1}`)
];
const CODICI_ALTI: string[] = Array.from({ length: 7 }, (_, i) => `c${i + 1}`);
const CODICI_MEDI: string[] = Array.from({ length: 8 }, (_, i) => `t${i + 1}`);

function seVuoto(str: string, def: string): string {
  const tr = str.trim();
  return tr.length > 0 ? tr : def;
}

export class FINPSpecialistAI {
  /**
   * Analisi FINP / World Para Swimming. La stima delle classi è sempre indicativa:
   * la classificazione ufficiale spetta alla commissione.
   */
  static analizza(condizione: string, limitazioni: string, eta?: number | null): AnalisiMedicaResult {
    const x = new Testo(`${condizione} ${limitazioni}`);
    const fattori: string[] = [];
    const raccomandazioni: string[] = [];
    let stima: StimaClassiFINP;
    let riassunto: string;

    if (
      x.pref('midoll', 'tetrapleg', 'parapleg', 'spina bifida', 'mielit', 'mielomening', 'sedia a rotelle', 'carrozzina') ||
      x.parola(...CODICI_SPINALI)
    ) {
      const livelloNoto = x.parola(...CODICI_SPINALI);
      const alta = x.pref('tetrapleg') || x.parola(...CODICI_ALTI);
      const media = x.parola(...CODICI_MEDI);
      const aff = livelloNoto ? 'Alta' : 'Media';

      if (alta) {
        riassunto = 'Tetraplegia / Lesione Cervicale: importante riduzione della forza propulsiva negli arti superiori, assenza di controllo del tronco e degli arti inferiori.';
        fattori.push('Assetto idrodinamico: elevato affondamento del bacino, incremento della resistenza di forma.');
        fattori.push('Propulsione: affidata esclusivamente alle braccia (frequenza contenuta).');
        fattori.push("Termoregolazione: alterata sudorazione, sensibile alla temperatura dell'acqua.");
        stima = { classeS: 2, classeSB: 1, classeSM: 2, motivazione: 'Lesione cervicale alta con severa compromissione quadriplegica.', eleggibile: true, affidabilita: aff };
      } else if (media) {
        riassunto = 'Paraplegia Dorsale / Toracica: assenza di spinta dagli arti inferiori con controllo parziale del tronco superiore.';
        fattori.push('Assetto: galleggiamento arti inferiori passivo, necessita di rollio controllato del tronco.');
        fattori.push('Propulsione: bracciata efficiente con buona stabilità della cintura scapolare.');
        stima = { classeS: 4, classeSB: 3, classeSM: 4, motivazione: 'Paraplegia dorsale con assenza di gambata e controllo parziale del tronco.', eleggibile: true, affidabilita: aff };
      } else {
        riassunto = 'Paraplegia Lombare / Spina Bifida: stabilità del tronco conservata, assenza o marcata ipotrofia della gambata.';
        fattori.push("Assetto: posizione orizzontale favorita dall'uso di pull-buoy in allenamento.");
        fattori.push('Propulsione: forza normale degli arti superiori e ottima applicazione della trazione.');
        stima = { classeS: 6, classeSB: 5, classeSM: 6, motivazione: 'Paraplegia lombare con tronco stabile e arti inferiori non propulsivi.', eleggibile: true, affidabilita: aff };
      }
      raccomandazioni.push('Utilizzo del boccaglio frontale per ridurre la resistenza di torsione durante la respirazione.');
      raccomandazioni.push('Esercizi dedicati alla cuffia dei rotatori e stabilizzatori della spalla.');
    } else if (
      x.pref('emipares', 'paralisi cerebr', 'spastic', 'dipleg', 'tetrapares', 'dyston', 'distoni', 'atass',
        'poliomielit', 'ipoton', 'sclerosi', 'parkinson', 'ictus', 'ictu', 'distrof')
    ) {
      const severa = x.pref('grave', 'tetrapares', 'sedia a rotelle', 'carrozzina');
      const moderata = x.pref('emipares', 'dipleg');

      if (severa) {
        riassunto = 'Compromissione Neuromotoria Severa: ipertonia/spasticità quadridistrettuale con alterazione coordinativa globale.';
        fattori.push('Asimmetria propulsiva: deviazione della traiettoria di nuotata.');
        fattori.push("Frequenza di bracciata: svincolo dell'arto affetto rallentato dalla rigidità muscolare.");
        stima = { classeS: 3, classeSB: 2, classeSM: 3, motivazione: 'Compromissione neuromotoria estesa a quattro arti.', eleggibile: true, affidabilita: 'Media' };
      } else if (moderata) {
        riassunto = 'Emiparesi / Diplegia Spastica: asimmetria nella forza tra lato sano e lato affetto, ipertono muscolare accentuato dalla fatica.';
        fattori.push('Traiettoria: richiede compenso del tronco per mantenere la linea di galleggiamento.');
        fattori.push("Aumento spasticità: l'accumulo di acido lattico ad alta intensità accentua gli spasmi.");
        stima = { classeS: 7, classeSB: 6, classeSM: 7, motivazione: "Emiparesi / diplegia moderata con deambulazione autonoma fuori dall'acqua.", eleggibile: true, affidabilita: 'Media' };
      } else {
        riassunto = 'Lieve Compromissione Coordinativa / Paresi Parziale: lieve asimmetria di spinta con buona biomeccanica.';
        fattori.push('Fluidità del gesto: coordinazione braccia-gambe conservata con minima perdita di trazione.');
        stima = { classeS: 8, classeSB: 7, classeSM: 8, motivazione: 'Lieve paresi / ipotono o monoparesi di un arto.', eleggibile: true, affidabilita: 'Bassa' };
      }
      raccomandazioni.push('Mantenere ritmi aerobici regolari (A2/B1) ed evitare serie ad altissimo lattato (C1/C2) che scatenano la spasticità.');
      raccomandazioni.push('Includere fasi di allungamento muscolare passivo prima e dopo la seduta.');
    } else if (
      x.pref('amputaz', 'agenes', 'mancanz', 'moncon', 'protesi', 'scolios', 'nanism', 'acondroplas',
        'lussaz', 'spall', 'ginocchi', 'femor', 'tibia', 'omer') || x.parola('anca')
    ) {
      const braccio = x.pref('bracc', 'superior', 'omer', 'avambracc') || x.parola('mano', 'mani');
      const gamba = x.pref('gamb', 'inferior', 'piede', 'femor', 'tibia');
      const nanismo = x.pref('nanis', 'acondroplas', 'statura');
      const menomazione = x.pref('amputaz', 'agenes', 'mancanz', 'moncon');

      if (nanismo) {
        riassunto = 'Acondroplasia / Riduzione della Statura: proporzioni corporee ridotte con normale forza muscolare relativa.';
        fattori.push('Frequenza di bracciata: necessità di una frequenza di passo elevata per compensare la minore ampiezza.');
        fattori.push('Resistenza idrodinamica: ottima posizione orizzontale in acqua.');
        stima = { classeS: 6, classeSB: 5, classeSM: 6, motivazione: 'Acondroplasia / statura ridotta secondo i criteri di misurazione WPS.', eleggibile: true, affidabilita: 'Media' };
      } else if (menomazione && braccio && gamba) {
        riassunto = "Amputazione / Agenesia Combinata: perdita di punti d'appoggio propulsivi su arti superiori ed inferiori.";
        fattori.push('Galleggiamento: alterazione della spinta idrostatica e del centro di gravità.');
        stima = { classeS: 5, classeSB: 4, classeSM: 5, motivazione: 'Amputazione / agenesia combinata di arto superiore ed inferiore.', eleggibile: true, affidabilita: 'Media' };
      } else if (menomazione && braccio) {
        riassunto = 'Amputazione / Agenesia Arto Superiore: propulsione asimmetrica mono-laterale con forte sollecitazione della muscolatura del tronco.';
        fattori.push("Rollio: accentuato verso il lato privo dell'arto per completare la respirazione.");
        stima = { classeS: 8, classeSB: 7, classeSM: 8, motivazione: 'Amputazione sopra o sotto il gomito di un arto superiore.', eleggibile: true, affidabilita: 'Media' };
      } else if (menomazione && gamba) {
        riassunto = 'Amputazione / Agenesia Arto Inferiore: riduzione della spinta della gambata con asimmetria nel rollio.';
        fattori.push("Assetto: lieve affondamento dal lato dell'arto mancante.");
        stima = { classeS: 9, classeSB: 8, classeSM: 9, motivazione: 'Amputazione transfemorale o transtibiale di un arto inferiore.', eleggibile: true, affidabilita: 'Media' };
      } else {
        riassunto = 'Limitazione Articolare / Posturale: ridotta mobilità o forza su uno o più distretti articolari.';
        fattori.push('Ampiezza di bracciata: adattata per evitare sovraccarichi o dolore articolare.');
        stima = {
          classeS: 10,
          classeSB: 9,
          classeSM: 10,
          motivazione: 'Limitazione generica: non basta a indicare una menomazione classificabile (stima solo indicativa).',
          eleggibile: false,
          affidabilita: 'Bassa'
        };
      }
      raccomandazioni.push('Rinforzo della muscolatura core per prevenire scoliosi e squilibri posturali.');
    } else if (
      x.pref('visiv', 'cecit', 'cieco', 'ciech', 'non vedent', 'ipovedent', 'ipovision', 'retin', 'glaucom', 'ottic') ||
      x.parola('s11', 's12', 's13')
    ) {
      const totale = x.parola('s11') || x.pref('cieco', 'ciech', 'non vedent', 'totale');
      if (totale) {
        riassunto = 'Disabilità Visiva Totale (Classe S11): assenza di percezione visiva. Nuotata con occhialini oscurati e tapper per le virate.';
        fattori.push('Traiettoria: orientamento mantenuto tramite appoggio tattile alle corsie galleggianti.');
        fattori.push("Sincronia virata: chiamata della virata tramite la toccata del tapper sull'asta imbottita.");
        stima = { classeS: 11, classeSB: 11, classeSM: 11, motivazione: 'Non vedente totale secondo i criteri World Para Swimming B1/S11.', eleggibile: true, affidabilita: 'Alta' };
      } else {
        riassunto = 'Disabilità Visiva Parziale (Classe S12/S13): acuità visiva ridotta o campo visivo tubolare.';
        fattori.push('Orientamento: percezione delle linee sul fondo e dei blocchi di partenza.');
        stima = { classeS: 12, classeSB: 12, classeSM: 12, motivazione: 'Ipovedente con residuo visivo limitato (S12 o S13: serve la valutazione).', eleggibile: true, affidabilita: 'Bassa' };
      }
      raccomandazioni.push('Mantenere costante il conteggio delle bracciate per vasca per perfezionare il tempo della virata.');
    } else if (
      x.pref('intellet', 'cognitiv', 'autis', 'relazional', 'ritard') ||
      x.parola('down', 's14')
    ) {
      riassunto = 'Disabilità Intellettivo-Relazionale (Classe S14): capacità fisiche ed idrodinamiche integre, con necessità di semplificazione degli schemi di allenamento.';
      fattori.push('Biomeccanica: nuotata efficiente con potenziale propulsivo analogo agli atleti olimpici.');
      fattori.push('Gestione del ritmo: necessità di supporto per la regolarità delle ripartenze e del passo.');
      stima = { classeS: 14, classeSB: 14, classeSM: 14, motivazione: 'Disabilità intellettivo-relazionale (criteri INAS/Virtus).', eleggibile: true, affidabilita: 'Media' };
      raccomandazioni.push('Utilizzare tabelle con tempi tondi sul cronometro (es. ripartenze a tempi fissi di 5s).');
    } else {
      const testoCond = seVuoto(condizione, 'Condizione Fisica / Organica');
      riassunto = `Analisi per '${testoCond}': condizione che richiede adattamento della frequenza cardiaca e del recupero.`;
      fattori.push('Assetto idrodinamico: preservare la posizione orizzontale del corpo ed il bilanciamento.');
      fattori.push('Gestione della fatica: adattare i volumi in base alle risposte individuali dell\'atleta.');
      stima = {
        classeS: 10,
        classeSB: 9,
        classeSM: 10,
        motivazione: 'Condizione non riconducibile a una menomazione classificabile: stima solo indicativa.',
        eleggibile: false,
        affidabilita: 'Bassa'
      };
      raccomandazioni.push('Regolare le ripartenze a tempi di 5 in 5 secondi e monitorare la frequenza cardiaca.');
    }

    return {
      condizione: seVuoto(condizione, 'Condizione Fisica'),
      riassuntoIdrodinamico: riassunto,
      fattoriNuotata: fattori,
      stimaClassi: stima,
      raccomandazioniAllenamento: raccomandazioni
    };
  }

  /** Segnali medici rilevanti per l'allenamento (parole intere, negazioni gestite). */
  static flagMedici(testo: string): FlagMedici {
    const x = new Testo(testo);
    const spalla = x.pref('spall', 'cuffia', 'rotator', 'impingement');
    const neurologica = x.pref(
      'neurolog', 'spastic', 'ipertono', 'sclerosi', 'midoll', 'parapleg', 'tetrapleg', 'cerebr',
      'emipares', 'distrof', 'parkinson', 'atass', 'affaticament', 'mielomening', 'spina bifida'
    );
    const cardiorespiratoria = x.pref(
      'cardi', 'cuore', 'ipertension', 'pression', 'aritmi', 'asma', 'bronch', 'fibrosi cistica', 'respirat', 'polmon'
    );
    const visiva = x.pref('visiv', 'cecit', 'ciec', 'non vedent', 'ipovedent', 'ipovision', 'retin', 'glaucom') ||
      x.parola('s11', 's12', 's13', 'b1', 'b2', 'b3');
    const epilessia = x.pref('epiless', 'epilett', 'convulsion');
    const termoregolazione = x.pref('midoll', 'tetrapleg', 'parapleg', 'sclerosi multipla', 'ustion');

    return {
      spalla,
      neurologica,
      cardiorespiratoria,
      visiva,
      epilessia,
      termoregolazione,
      coperta: spalla || neurologica || cardiorespiratoria || visiva || epilessia || termoregolazione
    };
  }
}
