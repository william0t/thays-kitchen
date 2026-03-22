'use client';

import { useState, useRef, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { type Language, LANGUAGE_LABELS } from '@/lib/i18n';

const LANGUAGES: Language[] = ['en', 'es', 'pt'];

export default function LanguageSwitcher() {
  const { lang, setLang } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-center w-9 h-9 rounded-xl text-xs font-bold transition-all"
        style={{
          background: 'var(--glass-bg)',
          border: '1px solid var(--glass-border)',
          color: 'var(--text-muted)',
          letterSpacing: '0.03em',
        }}
        title="Change language"
      >
        {LANGUAGE_LABELS[lang]}
      </button>

      {open && (
        <div
          className="absolute right-0 top-11 rounded-2xl overflow-hidden z-50 min-w-[80px]"
          style={{ background: 'var(--bg-surface-solid)', border: '1px solid var(--glass-border)', boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}
        >
          {LANGUAGES.map((l) => (
            <button
              key={l}
              onClick={() => { setLang(l); setOpen(false); }}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all"
              style={{
                background: l === lang ? 'var(--glass-bg)' : 'transparent',
                color: l === lang ? 'var(--accent-primary)' : 'var(--text-secondary)',
              }}
            >
              <span className="font-bold text-xs w-6">{LANGUAGE_LABELS[l]}</span>
              <span>{l === 'en' ? 'English' : l === 'es' ? 'Español' : 'Português'}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
