'use client';

export const dynamic = 'force-dynamic';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Sparkles, ChevronRight, Wand2 } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/contexts/LanguageContext';

interface RecipeIdea {
  name: string;
  description: string;
  keyIngredients: string[];
  tags: string[];
  concept: string;
}

const TAG_COLORS = [
  { bg: 'rgba(236,72,153,0.1)', color: 'var(--accent-primary)', border: 'rgba(236,72,153,0.2)' },
  { bg: 'rgba(139,92,246,0.1)', color: 'var(--accent-secondary)', border: 'rgba(139,92,246,0.2)' },
  { bg: 'rgba(249,115,22,0.1)', color: 'var(--accent-tertiary)', border: 'rgba(249,115,22,0.2)' },
];

export default function InspirePage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [seedInput, setSeedInput] = useState('');
  const [pantryItems, setPantryItems] = useState<string[]>([]);
  const [ideas, setIdeas] = useState<RecipeIdea[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  const fetchPantry = useCallback(async () => {
    const { data } = await supabase
      .from('inventory_items')
      .select('name')
      .eq('in_stock', true);
    setPantryItems((data || []).map((i: { name: string }) => i.name));
  }, []);

  useEffect(() => { fetchPantry(); }, [fetchPantry]);

  const handleInspire = async () => {
    const seed = seedInput.trim();
    if (!seed) return;
    setLoading(true);
    setError('');
    setHasSearched(true);
    try {
      const res = await fetch('/api/inspire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seedIngredients: seed, pantryItems }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to get ideas');
      setIdeas(data.ideas || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleMakeThis = (idea: RecipeIdea) => {
    const params = new URLSearchParams({ concept: idea.concept });
    router.push(`/generate?${params.toString()}`);
  };

  return (
    <div className="page-content max-w-lg mx-auto px-4 pt-10">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="flex items-center justify-center w-9 h-9 rounded-xl transition-all"
          style={{ background: 'var(--glass-bg)', border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}
        >
          <ArrowLeft size={17} />
        </button>
        <PageHeader
          title={t('ins_title')}
          subtitle={t('ins_subtitle')}
        />
      </div>

      {/* Input */}
      <div className="glass-card rounded-2xl p-4 mb-5">
        <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>
          {t('ins_star_ingredient')}
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            className="input-field flex-1 px-3 py-2.5 rounded-xl text-sm"
            placeholder={t('ins_placeholder')}
            value={seedInput}
            onChange={e => setSeedInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleInspire(); }}
          />
          <button
            onClick={handleInspire}
            disabled={loading || !seedInput.trim()}
            className="btn-gradient px-4 py-2 rounded-xl font-semibold text-sm flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <Wand2 size={15} strokeWidth={2} />
            )}
            {loading ? t('ins_thinking') : t('ins_go')}
          </button>
        </div>

        {/* Pantry quick picks */}
        {pantryItems.length > 0 && (
          <div className="mt-3">
            <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>{t('ins_or_pick')}</p>
            <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
              {pantryItems.slice(0, 20).map(item => (
                <button
                  key={item}
                  onClick={() => setSeedInput(item)}
                  className="px-2.5 py-1 rounded-full text-xs font-medium transition-all"
                  style={{
                    background: seedInput === item ? 'var(--accent-primary)' : 'var(--glass-bg)',
                    color: seedInput === item ? 'white' : 'var(--text-muted)',
                    border: `1px solid ${seedInput === item ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                  }}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl px-4 py-3 text-sm mb-4 animate-fade-in"
          style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.2)' }}>
          {error}
        </div>
      )}

      {/* Loading shimmer */}
      {loading && (
        <div className="space-y-3 animate-fade-in">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="loading-shimmer h-28 rounded-2xl" />
          ))}
        </div>
      )}

      {/* Ideas */}
      {!loading && ideas.length > 0 && (
        <div className="space-y-3 animate-fade-in">
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>
            {t('ins_ideas_for', { seed: seedInput })}
          </p>
          {ideas.map((idea, i) => (
            <div
              key={i}
              className="glass-card rounded-2xl p-4 transition-all duration-200"
              style={{ borderLeft: '3px solid var(--accent-primary)' }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold flex-shrink-0"
                      style={{ background: 'var(--gradient-brand)', color: 'white' }}
                    >
                      {i + 1}
                    </span>
                    <h3 className="text-sm font-bold leading-snug" style={{ color: 'var(--text-primary)' }}>
                      {idea.name}
                    </h3>
                  </div>
                  <p className="text-xs leading-relaxed mb-2.5 ml-7" style={{ color: 'var(--text-muted)' }}>
                    {idea.description}
                  </p>
                  {/* Key ingredients */}
                  <div className="flex flex-wrap gap-1.5 ml-7 mb-3">
                    {idea.keyIngredients.slice(0, 5).map((ing, j) => {
                      const c = TAG_COLORS[j % TAG_COLORS.length];
                      return (
                        <span
                          key={j}
                          className="px-2 py-0.5 rounded-full text-xs"
                          style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}` }}
                        >
                          {ing}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleMakeThis(idea)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{
                  background: 'var(--gradient-brand)',
                  color: 'white',
                  boxShadow: '0 4px 12px rgba(236,72,153,0.25)',
                }}
              >
                <Sparkles size={14} strokeWidth={2} />
                {t('ins_generate_full')}
                <ChevronRight size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Empty state after search with no results */}
      {!loading && hasSearched && ideas.length === 0 && !error && (
        <div className="text-center py-12">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{t('ins_no_ideas')}</p>
        </div>
      )}

      {/* Initial empty state */}
      {!hasSearched && !loading && (
        <div className="text-center py-12 animate-fade-in">
          <div className="text-4xl mb-3">✨</div>
          <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>{t('ins_mood_heading')}</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {t('ins_mood_sub')}
          </p>
        </div>
      )}
    </div>
  );
}
