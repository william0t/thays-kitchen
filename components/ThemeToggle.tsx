'use client';

import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle theme"
      className="relative flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200 hover:scale-110"
      style={{
        background: 'var(--glass-bg)',
        border: '1px solid var(--glass-border)',
        color: 'var(--text-secondary)',
        backdropFilter: 'blur(8px)',
      }}
    >
      {theme === 'dark' ? (
        <Sun size={18} strokeWidth={1.8} />
      ) : (
        <Moon size={18} strokeWidth={1.8} />
      )}
    </button>
  );
}
