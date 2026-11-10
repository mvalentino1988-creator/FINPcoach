import React, { useState } from 'react';
import { useApp } from '../data/AppContext';
import { Waves, Moon, Sun, Monitor, Sparkles } from 'lucide-react';

interface Props {
  onComplete: () => void;
}

export const OnboardingModal: React.FC<Props> = ({ onComplete }) => {
  const { themeMode, setThemeMode } = useApp();
  const [selectedTheme,  setSelectedTheme]  = useState<'sistema' | 'chiaro' | 'scuro'>(themeMode);

  const handleSave = () => {
    setThemeMode(selectedTheme);
    localStorage.setItem('finp_onboarded', 'true');
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
      <div className="bg-surface-container-lowest rounded-2xl p-6 max-w-lg w-full shadow-float border border-outline-variant space-y-6 animate-slide-up text-on-surface">

        {/* Header */}
        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-blue mx-auto flex items-center justify-center shadow-primary-sm">
            <Waves size={26} className="text-white" />
          </div>
          <div>
            <h2 className="font-headline-sm text-headline-lg font-bold text-on-surface tracking-tight">
              Benvenuto in FINP<span className="text-primary">coach</span>
            </h2>
            <p className="text-sm text-on-surface-variant mt-1">
              Personalizza l’aspetto del tuo assistente per il nuoto paralimpico.
            </p>
          </div>
        </div>

        {/* Tema */}
        <div className="space-y-2.5">
          <label className="font-label-caps text-label-caps uppercase tracking-wider text-primary font-bold block">
            Tema Grafico
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'sistema', label: 'Sistema', icon: <Monitor size={20} /> },
              { id: 'chiaro',  label: 'Chiaro',  icon: <Sun size={20} /> },
              { id: 'scuro',   label: 'Scuro',   icon: <Moon size={20} /> },
            ].map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedTheme(item.id as any)}
                className={`flex flex-col items-center justify-center gap-2.5 p-4 rounded-xl border font-label-caps text-label-caps uppercase tracking-wider transition-all ${
                  selectedTheme === item.id
                    ? 'border-primary/40 bg-primary-fixed text-primary shadow-sm'
                    : 'border-outline-variant bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* CTA */}
        <button
          type="button"
          onClick={handleSave}
          className="w-full ds-btn-primary py-4 rounded-xl justify-center"
        >
          <Sparkles size={18} />
          Inizia ad Allenare
        </button>
      </div>
    </div>
  );
};
