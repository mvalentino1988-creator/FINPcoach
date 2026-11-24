import React, { useState } from 'react';
import { Assenza, Gara, AmbitoAssenza, AMBITO_ASSENZA_LABEL } from '../types';
import { formattaData, parseData, isBefore } from '../domain/dateUtils';
import { Sezione } from './Sezione';
import { Badge, Button, Input, Select } from './ui';
import { Calendar, Trash2 } from 'lucide-react';

interface Props {
  atletaId: number;
  assenze: Assenza[];
  gare: Gara[];
  onEliminaAssenza: (id: number) => void;
  onAggiungiAssenza: (a: Omit<Assenza, 'id'>) => void;
}

export const SezioneAssenzeAtleta: React.FC<Props> = ({
  atletaId, assenze, gare, onEliminaAssenza, onAggiungiAssenza,
}) => {
  const [assDal, setAssDal] = useState('');
  const [assAl, setAssAl] = useState('');
  const [assMotivo, setAssMotivo] = useState('');
  const [assAmbito, setAssAmbito] = useState<AmbitoAssenza>('TUTTO');
  const [assGaraId, setAssGaraId] = useState<number | null>(null);

  const dalParsed = parseData(assDal);
  const alParsed = parseData(assAl);
  const assenzaValida = dalParsed != null && alParsed != null && !isBefore(alParsed, dalParsed);

  return (
    <Sezione
      titolo="Assenze Programmate"
      icon={<Calendar size={15} />}
      badge={assenze.length}
      riepilogoChiuso={`${assenze.length} programmate`}
      storageKey="atleta_assenze"
      defaultAperto={false}
    >
      <div className="space-y-2">
        {assenze.map(a => (
          <div
            key={a.id}
            className="p-3 bg-surface-container-low rounded-lg border border-outline-variant flex items-center justify-between gap-3 text-xs"
          >
            <div className="min-w-0">
              <span className="font-headline-sm text-headline-sm text-on-surface">
                {formattaData(a.dal)} – {formattaData(a.al)}
              </span>
              <Badge variant="secondary" size="sm" className="ml-1">
                {AMBITO_ASSENZA_LABEL[a.ambito ?? 'TUTTO']}
                {a.ambito === 'GARA' && a.garaId != null
                  ? `: ${gare.find(g => g.id === a.garaId)?.nome ?? `gara ${a.garaId}`}`
                  : ''}
              </Badge>
              {a.motivo && <span className="text-on-surface-variant ml-2 break-words">({a.motivo})</span>}
            </div>
            <button
              onClick={() => onEliminaAssenza(a.id)}
              aria-label="Elimina assenza"
              className="w-12 h-12 -m-2 flex items-center justify-center text-on-surface-variant hover:text-error rounded-lg shrink-0"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}

        {/* Add Absence Form */}
        <div className="p-3 bg-surface-container-low rounded-xl border border-dashed border-outline-variant space-y-2 text-xs">
          <div className="grid grid-cols-1 xs:grid-cols-2 gap-2">
            <Input
              type="text"
              placeholder="Dal (gg/mm/aaaa)"
              aria-label="Data inizio assenza"
              value={assDal}
              onChange={e => setAssDal(e.target.value)}
            />
            <Input
              type="text"
              placeholder="Al (gg/mm/aaaa)"
              aria-label="Data fine assenza"
              value={assAl}
              onChange={e => setAssAl(e.target.value)}
            />
          </div>
          <Input
            type="text"
            placeholder="Motivo (es. Convalescenza, Esami universitari...)"
            aria-label="Motivo assenza"
            value={assMotivo}
            onChange={e => setAssMotivo(e.target.value)}
          />
          <div className="grid grid-cols-1 xs:grid-cols-2 gap-2">
            <Select
              label="Ambito"
              value={assAmbito}
              onChange={e => {
                const amb = e.target.value as AmbitoAssenza;
                setAssAmbito(amb);
                if (amb !== 'GARA') setAssGaraId(null);
              }}
              options={(
                ['TUTTO', 'ALLENAMENTO', 'GARA'] as AmbitoAssenza[]
              ).map(v => ({ value: v, label: AMBITO_ASSENZA_LABEL[v] }))}
            />
            {assAmbito === 'GARA' && (
              <Select
                label="Gara"
                value={assGaraId != null ? String(assGaraId) : ''}
                onChange={e => setAssGaraId(e.target.value ? parseInt(e.target.value, 10) : null)}
                options={[
                  { value: '', label: 'Tutte le gare' },
                  ...gare.map(g => ({ value: String(g.id), label: g.nome })),
                ]}
              />
            )}
          </div>
          <Button
            type="button"
            variant="secondary"
            disabled={!assenzaValida || (assAmbito === 'GARA' && gare.length > 0 && assGaraId == null && false)}
            onClick={() => {
              if (dalParsed && alParsed) {
                onAggiungiAssenza({
                  atletaId,
                  dal: dalParsed,
                  al: alParsed,
                  motivo: assMotivo.trim(),
                  ambito: assAmbito,
                  ...(assAmbito === 'GARA' && assGaraId != null ? { garaId: assGaraId } : {})
                });
                setAssDal('');
                setAssAl('');
                setAssMotivo('');
                setAssAmbito('TUTTO');
                setAssGaraId(null);
              }
            }}
            className="w-full"
          >
            Registra Assenza
          </Button>
        </div>
      </div>
    </Sezione>
  );
};
