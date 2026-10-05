import React, { useState, useEffect } from 'react';
import { ClipboardList, Timer, CheckCircle2, Edit2, Save, X, Trash2, Calendar } from 'lucide-react';
import { SchedeVascaScreen } from './SchedeVascaScreen';
import { TempiRipartenzeScreen } from './TempiRipartenzeScreen';
import { RegistroScreen } from './RegistroScreen';
import { formattaData, todayISO } from '../domain/dateUtils';

type DatiTab = 'schede' | 'tempi' | 'registro';

interface CustomWorkout {
  id: string;
  data: string;
  testo: string;
  creatoIl: string;
}

const STORAGE_KEY = 'finpcoach_custom_workouts';

export const DatiScreen: React.FC = () => {
  const [tab, setTab] = useState<DatiTab>('schede');
  const [editMode, setEditMode] = useState(false);
  const [customWorkout, setCustomWorkout] = useState('');
  const [customWorkouts, setCustomWorkouts] = useState<CustomWorkout[]>([]);
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(null);
  const [workoutDate, setWorkoutDate] = useState<string>(formattaData(todayISO()));

  // Carica allenamenti salvati
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setCustomWorkouts(JSON.parse(saved));
      } catch (e) {
        console.error('Errore caricamento allenamenti:', e);
      }
    }
  }, []);

  const tabs = [
    { key: 'schede' as DatiTab, label: 'Schede', icon: <ClipboardList size={16} /> },
    { key: 'tempi' as DatiTab, label: 'Tempi', icon: <Timer size={16} /> },
    { key: 'registro' as DatiTab, label: 'Registro', icon: <CheckCircle2 size={16} /> }
  ];

  const handleSave = () => {
    if (!customWorkout.trim()) return;

    const newWorkout: CustomWorkout = {
      id: Date.now().toString(),
      data: workoutDate,
      testo: customWorkout,
      creatoIl: new Date().toISOString()
    };

    const updated = [newWorkout, ...customWorkouts];
    setCustomWorkouts(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setSelectedWorkoutId(newWorkout.id);
    setCustomWorkout('');
    setWorkoutDate(formattaData(todayISO()));
    setEditMode(false);
  };

  const handleDelete = (id: string) => {
    const updated = customWorkouts.filter(w => w.id !== id);
    setCustomWorkouts(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    if (selectedWorkoutId === id) setSelectedWorkoutId(null);
  };

  const selectedWorkout = customWorkouts.find(w => w.id === selectedWorkoutId);

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {tabs.map(t => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition whitespace-nowrap ${
              tab === t.key
                ? 'bg-[#006874] text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}

        {tab === 'schede' && (
          <button
            type="button"
            onClick={() => setEditMode(!editMode)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition whitespace-nowrap ml-auto ${
              editMode
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            {editMode ? <X size={16} /> : <Edit2 size={16} />}
            <span>{editMode ? 'Annulla' : 'Scrivi Allenamento'}</span>
          </button>
        )}
      </div>

      {/* Editor Allenamento Personalizzato */}
      {tab === 'schede' && editMode && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
            <Edit2 size={18} className="text-[#006874]" />
            Scrivi l'allenamento manuale
          </h3>
          <div className="mb-3">
            <label className="block text-xs font-semibold text-slate-700 mb-1">Data allenamento</label>
            <input
              type="text"
              value={workoutDate}
              onChange={(e) => setWorkoutDate(e.target.value)}
              placeholder="es. 05/10/2026"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#006874] focus:border-transparent"
            />
          </div>
          <textarea
            value={customWorkout}
            onChange={(e) => setCustomWorkout(e.target.value)}
            placeholder="Esempio: Riscaldamento 400m stile libero A1&#10;4x100m stile libero a 1'30&quot; (ripartenza)&#10;Serie gambe 200m A1&#10;Defaticamento 200m"
            className="w-full h-48 p-3 border border-slate-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#006874] focus:border-transparent"
          />
          <div className="flex gap-2 mt-3">
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#006874] text-white rounded-lg text-sm font-semibold hover:bg-[#005663] transition"
            >
              <Save size={16} />
              Salva
            </button>
            <button
              type="button"
              onClick={() => setEditMode(false)}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-200 transition"
            >
              <X size={16} />
              Annulla
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            L'allenamento viene salvato e mostrato al posto della scheda generata automaticamente.
          </p>
        </div>
      )}

      {/* Lista allenamenti salvati */}
      {tab === 'schede' && !editMode && customWorkouts.length > 0 && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2 text-sm">
            <Calendar size={16} className="text-[#006874]" />
            Allenamenti salvati
          </h3>
          <div className="space-y-2">
            {customWorkouts.map(w => (
              <div
                key={w.id}
                className={`p-3 rounded-lg border transition cursor-pointer ${
                  selectedWorkoutId === w.id
                    ? 'bg-[#006874] text-white border-[#006874]'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                }`}
                onClick={() => setSelectedWorkoutId(w.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-semibold text-sm">{w.data}</div>
                    <div className="text-xs opacity-75 line-clamp-1">{w.testo}</div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(w.id);
                    }}
                    className="p-1.5 rounded hover:bg-black/10 transition"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          {selectedWorkoutId && (
            <button
              type="button"
              onClick={() => setSelectedWorkoutId(null)}
              className="mt-3 text-xs text-[#006874] font-semibold hover:underline"
            >
              ← Torna alla scheda generata automaticamente
            </button>
          )}
        </div>
      )}

      {/* Content */}
      {!editMode && (
        <div>
          {tab === 'schede' && (
            selectedWorkout ? (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-slate-800 text-lg">
                    Allenamento del {selectedWorkout.data}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setSelectedWorkoutId(null)}
                    className="text-xs text-slate-500 hover:text-slate-700"
                  >
                    Chiudi
                  </button>
                </div>
                <div className="whitespace-pre-wrap text-sm text-slate-700 leading-relaxed">
                  {selectedWorkout.testo}
                </div>
              </div>
            ) : (
              <SchedeVascaScreen />
            )
          )}
          {tab === 'tempi' && <TempiRipartenzeScreen />}
          {tab === 'registro' && <RegistroScreen />}
        </div>
      )}
    </div>
  );
};
