import React, { useState } from 'react';
import { useApp } from '../data/AppContext';
import { LayoutDashboard, Sparkles, Check, Moon, Sun, Monitor } from 'lucide-react';

interface Props {
  onComplete: () => void;
}

export const OnboardingModal: React.FC<Props> = ({ onComplete }) => {
  const { layoutScelto, setLayoutScelto, themeMode, setThemeMode } = useApp();
  const [selectedLayout, setSelectedLayout] = useState<'classica' | 'flottante' | 'azione-centrale'>(layoutScelto);
  const [selectedTheme, setSelectedTheme] = useState<'sistema' | 'chiaro' | 'scuro'>(themeMode);

  const handleSave = () => {
    setLayoutScelto(selectedLayout);
    setThemeMode(selectedTheme);
    localStorage.setItem('finp_onboarded', 'true');
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface-container-lowest rounded-3xl p-6 max-w-lg w-full shadow-float border border-outline-variant space-y-6 animate-fade-in text-on-surface">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary-container text-white mx-auto flex items-center justify-center shadow-primary-sm">
            <Sparkles size={24} />
          </div>
          <h2 className="text-xl font-bold font-headline">Benvenuto in FINPcoach</h2>
          <p className="text-sm text-on-surface-variant">
            Personalizza l'aspetto e la navigazione del tuo assistente di nuoto paralimpico.
          </p>
        </div>

        <div className="space-y-3">
          <label className="text-xs font-bold uppercase tracking-wider text-primary">Stile Navigazione Inferiore</label>
          <div className="grid grid-cols-1 gap-2.5">
            {[
              { id: 'classica', title: 'Classica', desc: 'Barra a tutta larghezza con icone ed etichette' },
              { id: 'flottante', title: 'Flottante', desc: 'Pillola staccata con effetto blur e design moderno' },
              { id: 'azione-centrale', title: 'Azione Centrale', desc: 'Pulsante rapido "In Vasca" in evidenza al centro' },
            ].map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedLayout(item.id as any)}
                className={`flex items-start justify-between p-3.5 rounded-2xl text-left border transition ${
                  selectedLayout === item.id
                    ? 'border-primary bg-primary/5 text-primary font-bold'
                    : 'border-outline-variant bg-surface-container-low text-on-surface hover:bg-surface-container'
                }`}
              >
                <div>
                  <div className="font-headline text-sm">{item.title}</div>
                  <div className="text-xs text-on-surface-variant mt-0.5">{item.desc}</div>
                </div>
                {selectedLayout === item.id && <Check size={18} className="text-primary mt-0.5 shrink-0" />}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-xs font-bold uppercase tracking-wider text-primary">Tema Grafico</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'sistema', label: 'Sistema', icon: <Monitor size={16} /> },
              { id: 'chiaro', label: 'Chiaro', icon: <Sun size={16} /> },
              { id: 'scuro', label: 'Scuro', icon: <Moon size={16} /> },
            ].map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedTheme(item.id as any)}
                className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border text-xs font-bold transition ${
                  selectedTheme === item.id
                    ? 'border-primary bg-primary text-white shadow-primary-sm'
                    : 'border-outline-variant bg-surface-container-low text-on-surface hover:bg-surface-container'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={handleSave}
          className="w-full ds-btn-primary py-3.5 rounded-2xl text-center justify-center"
        >
          Inizia ad Allenare
        </button>
      </div>
    </div>
  );
};
