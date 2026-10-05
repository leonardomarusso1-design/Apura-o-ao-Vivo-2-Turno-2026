"use client";

import { useEffect, useState } from "react";

const LS = "apuracao:ads-consent";

export default function ConsentBanner() {
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    try {
      const consent = localStorage.getItem(LS);
      if (consent === null) {
        setVisivel(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const aceitar = (personalizado: boolean) => {
    try {
      localStorage.setItem(LS, personalizado ? "1" : "0");
    } catch {
      /* ignore */
    }
    setVisivel(false);
  };

  if (!visivel) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50 glass-panel-elevated p-4 rounded-2xl border border-white/10 shadow-2xl animate-in slide-in-from-bottom-5 duration-300">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 shrink-0">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
            Privacidade e Anúncios
          </h3>
          <p className="mt-1 text-xs text-mute leading-relaxed">
            Utilizamos cookies para medição de audiência e exibição de anúncios relevantes durante a apuração.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={() => aceitar(true)}
              className="flex-1 py-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white transition"
            >
              Concordar
            </button>
            <button
              onClick={() => aceitar(false)}
              className="py-1.5 px-3 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-xs font-medium text-mute hover:text-paper transition"
            >
              Apenas necessários
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
