'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Sparkles, ChefHat, Settings2, X, Check, ArrowLeft, Clock } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { supabase } from '@/lib/supabase';
import { InventoryItem, Appliance, CATEGORY_EMOJIS, InventoryCategory } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

interface RecipeIdea {
  name: string;
  description: string;
  emoji: string;
  estimatedMinutes: number;
  keyIngredients: string[];
  concept: string;
}

type Stage = 'criteria' | 'loading_ideas' | 'ideas' | 'generating';

export default function GeneratePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [ingredients, setIngredients] = useState<InventoryItem[]>([]);
  const [appliances, setAppliances] = useState<Appliance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // UI stage
  const [stage, setStage] = useState<Stage>('criteria');
  const [ideas, setIdeas] = useState<RecipeIdea[]>([]);
  const [selectedIdea, setSelectedIdea] = useState<RecipeIdea | null>(null);

  // Criteria
  const [selectedIngredients, setSelectedIngredients] = useState<Set<string>>(new Set());
  const [selectedAppliances, setSelectedAppliances] = useState<Set<string>>(new Set());
  const [servings, setServings] = useState(4);
  const [preferences, setPreferences] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [useAllInStock, setUseAllInStock] = useState(true);
  const [strictStock, setStrictStock] = useState(false);
  const [skillLevel, setSkillLevel] = useState<'novice' | 'home_cook' | 'pro'>('home_cook');
  const [lazy, setLazy] = useState(false);
  const [adventurous, setAdventurous] = useState(false);
  const [mealType, setMealType] = useState<'any' | 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'dessert'>('any');
  const [healthy, setHealthy] = useState<boolean | null>(null);

  // Pre-fill from inspire mode
  useEffect(() => {
    const concept = searchParams.get('concept');
    if (concept) {
      setPreferences(concept);
      setShowAdvanced(true);
    }
  }, [searchParams]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [invRes, appRes] = await Promise.all([
        supabase.from('inventory_items').select('*').order('category').order('name'),
        supabase.from('appliances').select('*').order('name'),
      ]);
      const inv = invRes.data || [];
      const app = appRes.data || [];
      setIngredients(inv);
      setAppliances(app);
      setSelectedIngredients(new Set(inv.filter((i) => i.in_stock).map((i) => i.id)));
      setSelectedAppliances(new Set(app.map((a) => a.id)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleIngredient = (id: string) => {
    setSelectedIngredients((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    setUseAllInStock(false);
  };

  const toggleAppliance = (id: string) => {
    setSelectedAppliances((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const inStockIds = ingredients.filter((i) => i.in_stock).map((i) => i.id);
  const selectAllAppliances = () => setSelectedAppliances(new Set(appliances.map((a) => a.id)));
  const deselectAllAppliances = () => setSelectedAppliances(new Set());
  const selectAllIngredients = () => { setSelectedIngredients(new Set(inStockIds)); setUseAllInStock(false); };
  const deselectAllIngredients = () => { setSelectedIngredients(new Set()); setUseAllInStock(false); };

  const getCriteriaPayload = () => {
    const selectedIngs = useAllInStock
      ? ingredients.filter((i) => i.in_stock)
      : ingredients.filter((i) => selectedIngredients.has(i.id));
    const selectedApps = appliances.filter((a) => selectedAppliances.has(a.id));
    return { selectedIngs, selectedApps };
  };

  const handleGenerateIdeas = async () => {
    setError('');
    setStage('loading_ideas');
    const { selectedIngs, selectedApps } = getCriteriaPayload();
    try {
      const res = await fetch('/api/generate-ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ingredients: selectedIngs,
          appliances: selectedApps,
          preferences,
          servings,
          useAll: useAllInStock,
          skillLevel,
          lazy,
          adventurous,
          mealType,
          healthy,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to generate ideas');
      setIdeas(data.ideas || []);
      setStage('ideas');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setStage('criteria');
    }
  };

  const handleSelectIdea = async (idea: RecipeIdea) => {
    setSelectedIdea(idea);
    setStage('generating');
    setError('');
    const { selectedIngs, selectedApps } = getCriteriaPayload();
    try {
      const combined = idea.concept + (preferences ? `\n\nAdditional notes: ${preferences}` : '');
      const res = await fetch('/api/generate-recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ingredients: selectedIngs,
          appliances: selectedApps,
          preferences: combined,
          servings,
          useAll: useAllInStock,
          strictStock,
          skillLevel,
          lazy,
          adventurous,
          mealType,
          healthy,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Generation failed');

      const { data: saved, error: saveError } = await supabase
        .from('recipes')
        .insert({
          name: data.recipe.name,
          description: data.recipe.description,
          ingredients: data.recipe.ingredients,
          instructions: data.recipe.instructions,
          servings: data.recipe.servings,
          prep_time: data.recipe.prep_time,
          cook_time: data.recipe.cook_time,
          tags: data.recipe.tags,
          appliances_used: data.recipe.appliances_used,
          notes: data.recipe.notes ?? null,
          ai_generated: true,
          user_id: user?.id,
        })
        .select()
        .single();

      if (saveError) throw new Error(saveError.message || 'Failed to save recipe');
      router.push(`/recipes/${saved.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStage('ideas');
      setSelectedIdea(null);
    }
  };

  const inStockCount = ingredients.filter((i) => i.in_stock).length;
  const grouped: Partial<Record<InventoryCategory, InventoryItem[]>> = {};
  ingredients.filter((i) => i.in_stock).forEach((item) => {
    if (!grouped[item.category]) grouped[item.category] = [];
    grouped[item.category]!.push(item);
  });

  const MEAL_TYPES = [
    { key: 'any', label: t('gen_meal_any'), emoji: '🍽️' },
    { key: 'breakfast', label: t('gen_meal_breakfast'), emoji: '🌅' },
    { key: 'lunch', label: t('gen_meal_lunch'), emoji: '🥗' },
    { key: 'dinner', label: t('gen_meal_dinner'), emoji: '🌙' },
    { key: 'snack', label: t('gen_meal_snack'), emoji: '🍿' },
    { key: 'dessert', label: t('gen_meal_dessert'), emoji: '🍰' },
  ] as const;

  // ── Loading / generating states ──────────────────────────────────────────
  if (stage === 'loading_ideas' || stage === 'generating') {
    return (
      <div className="page-content max-w-lg mx-auto px-4 flex flex-col items-center justify-center" style={{ minHeight: '70vh' }}>
        <div className="flex flex-col items-center gap-6 animate-fade-in">
          <div className="relative">
            <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: 'var(--gradient-brand)', boxShadow: '0 8px 32px rgba(236,72,153,0.4)' }}>
              {stage === 'generating' && selectedIdea
                ? <span className="text-3xl">{selectedIdea.emoji}</span>
                : <Sparkles size={36} color="white" strokeWidth={1.8} />}
            </div>
            <div className="absolute -inset-3 rounded-full border-2 border-pink-400/30 animate-ping" style={{ animationDuration: '1.5s' }} />
          </div>
          <div className="text-center">
            <p className="text-base font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
              {stage === 'generating' && selectedIdea
                ? `${t('gen_ideas_generating')}`
                : t('gen_loading_ideas')}
            </p>
            {stage === 'generating' && selectedIdea && (
              <p className="text-sm font-semibold" style={{ color: 'var(--accent-primary)' }}>{selectedIdea.name}</p>
            )}
            <p className="text-xs mt-1 animate-pulse" style={{ color: 'var(--text-muted)' }}>
              <ChefHat size={12} className="inline mr-1" />
              {t('gen_crafting')}
            </p>
          </div>
          {error && (
            <div className="rounded-xl px-4 py-3 text-sm" style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.2)' }}>
              {error}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Ideas grid ────────────────────────────────────────────────────────────
  if (stage === 'ideas') {
    return (
      <div className="page-content max-w-lg mx-auto px-4 pt-6">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => { setStage('criteria'); setIdeas([]); setError(''); }}
            className="flex items-center gap-1.5 text-sm font-medium"
            style={{ color: 'var(--text-muted)' }}
          >
            <ArrowLeft size={16} /> {t('gen_ideas_back')}
          </button>
        </div>
        <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{t('gen_ideas_heading')}</h2>
        <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>{t('gen_ideas_sub')}</p>

        {error && (
          <div className="rounded-xl px-4 py-3 text-sm mb-4 animate-fade-in" style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.2)' }}>
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 pb-8 animate-fade-in">
          {ideas.map((idea, idx) => (
            <button
              key={idx}
              onClick={() => handleSelectIdea(idea)}
              className="glass-card rounded-2xl p-4 text-left flex flex-col gap-2 transition-all active:scale-95 hover:scale-[1.02]"
              style={{ border: '1px solid var(--border-color)' }}
            >
              <div className="flex items-start justify-between gap-1">
                <span className="text-2xl">{idea.emoji}</span>
                <span className="text-[10px] flex items-center gap-0.5 flex-shrink-0 mt-1" style={{ color: 'var(--text-muted)' }}>
                  <Clock size={9} /> {idea.estimatedMinutes}m
                </span>
              </div>
              <div>
                <p className="text-xs font-bold leading-snug mb-1" style={{ color: 'var(--text-primary)' }}>{idea.name}</p>
                <p className="text-[10px] leading-relaxed line-clamp-2" style={{ color: 'var(--text-muted)' }}>{idea.description}</p>
              </div>
              {idea.keyIngredients?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-auto">
                  {idea.keyIngredients.slice(0, 3).map((ing) => (
                    <span key={ing} className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(236,72,153,0.1)', color: 'var(--accent-primary)' }}>
                      {ing}
                    </span>
                  ))}
                </div>
              )}
              <div
                className="w-full py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 mt-1"
                style={{ background: 'var(--gradient-brand)', color: 'white' }}
              >
                <Sparkles size={10} /> {t('gen_ideas_make')}
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── Criteria form ─────────────────────────────────────────────────────────
  return (
    <div className="page-content max-w-lg mx-auto px-4 pt-10">
      <PageHeader title={t('gen_title')} subtitle={t('gen_subtitle')} />

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="loading-shimmer h-20 rounded-2xl" />)}
        </div>
      ) : (
        <div className="space-y-5 animate-fade-in">

          {/* Meal Type */}
          <div className="glass-card rounded-2xl p-4">
            <div className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>{t('gen_meal_type')}</div>
            <div className="flex flex-wrap gap-2">
              {MEAL_TYPES.map(({ key, label, emoji }) => (
                <button
                  key={key}
                  onClick={() => setMealType(key)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                  style={
                    mealType === key
                      ? { background: 'var(--gradient-brand)', color: 'white', border: '1px solid transparent' }
                      : { background: 'var(--glass-bg)', color: 'var(--text-muted)', border: '1px solid var(--border-color)' }
                  }
                >
                  <span>{emoji}</span> {label}
                </button>
              ))}
            </div>
          </div>

          {/* Health Vibe */}
          <div className="glass-card rounded-2xl p-4">
            <div className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>{t('gen_health_vibe')}</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setHealthy(healthy === true ? null : true)}
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all"
                style={
                  healthy === true
                    ? { background: 'rgba(34,197,94,0.15)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.35)' }
                    : { background: 'var(--glass-bg)', color: 'var(--text-muted)', border: '1px solid var(--border-color)' }
                }
              >
                🥗 {t('gen_health_healthy')}
              </button>
              <button
                onClick={() => setHealthy(healthy === false ? null : false)}
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all"
                style={
                  healthy === false
                    ? { background: 'rgba(249,115,22,0.15)', color: '#f97316', border: '1px solid rgba(249,115,22,0.35)' }
                    : { background: 'var(--glass-bg)', color: 'var(--text-muted)', border: '1px solid var(--border-color)' }
                }
              >
                🍕 {t('gen_health_treat')}
              </button>
            </div>
          </div>

          {/* Ingredient selection mode */}
          <div className="glass-card rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t('gen_ingredients')}</div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('gen_items_in_stock', { count: inStockCount })}</div>
              </div>
              <button
                onClick={() => setUseAllInStock(!useAllInStock)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                style={{
                  background: useAllInStock ? 'rgba(16, 185, 129, 0.12)' : 'var(--glass-bg)',
                  border: `1px solid ${useAllInStock ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-color)'}`,
                  color: useAllInStock ? 'var(--success)' : 'var(--text-muted)',
                }}
              >
                {useAllInStock && <Check size={12} strokeWidth={2.5} />}
                {t('gen_use_all')}
              </button>
            </div>
            <button
              onClick={() => setStrictStock(!strictStock)}
              className="flex items-center gap-2 w-full mt-2 py-2 text-xs transition-all"
              style={{ color: strictStock ? 'rgb(249 115 22)' : 'var(--text-muted)' }}
            >
              <div
                className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-all"
                style={{
                  background: strictStock ? 'rgb(249 115 22)' : 'transparent',
                  border: `1.5px solid ${strictStock ? 'rgb(249 115 22)' : 'var(--border-color)'}`,
                }}
              >
                {strictStock && <Check size={10} strokeWidth={3} color="white" />}
              </div>
              <span>
                <span className="font-semibold">{t('gen_only_use')}</span>
                <span style={{ color: 'var(--text-muted)' }}>{t('gen_no_extra')}</span>
              </span>
            </button>

            {!useAllInStock && (
              <div className="space-y-3 mt-3">
                <div className="flex items-center gap-2">
                  <button onClick={selectAllIngredients} className="px-2.5 py-1 rounded-full text-xs font-medium transition-all" style={{ background: 'var(--glass-bg)', border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>{t('gen_select_all')}</button>
                  <button onClick={deselectAllIngredients} className="px-2.5 py-1 rounded-full text-xs font-medium transition-all" style={{ background: 'var(--glass-bg)', border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>{t('gen_deselect_all')}</button>
                </div>
                {(Object.keys(grouped) as InventoryCategory[]).map((cat) => (
                  <div key={cat}>
                    <div className="text-xs font-medium mb-1.5 flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                      {CATEGORY_EMOJIS[cat]} {cat}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {grouped[cat]!.map((item) => {
                        const selected = selectedIngredients.has(item.id);
                        return (
                          <button
                            key={item.id}
                            onClick={() => toggleIngredient(item.id)}
                            className="px-2.5 py-1 rounded-full text-xs font-medium transition-all"
                            style={{
                              background: selected ? 'var(--accent-primary)' : 'var(--glass-bg)',
                              color: selected ? 'white' : 'var(--text-muted)',
                              border: `1px solid ${selected ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                            }}
                          >
                            {item.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {inStockCount === 0 && (
                  <p className="text-xs text-center py-4" style={{ color: 'var(--text-muted)' }}>{t('gen_no_items')}</p>
                )}
              </div>
            )}
          </div>

          {/* Appliances */}
          <div className="glass-card rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t('gen_appliances')}</div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('gen_appliances_sub')}</div>
              </div>
              {appliances.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <button onClick={selectAllAppliances} className="px-2 py-1 rounded-full text-xs font-medium transition-all" style={{ background: 'var(--glass-bg)', border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>{t('gen_select_all')}</button>
                  <button onClick={deselectAllAppliances} className="px-2 py-1 rounded-full text-xs font-medium transition-all" style={{ background: 'var(--glass-bg)', border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>{t('gen_deselect_all')}</button>
                </div>
              )}
            </div>
            {appliances.length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('gen_no_appliances')}</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {appliances.map((appliance) => {
                  const selected = selectedAppliances.has(appliance.id);
                  return (
                    <button
                      key={appliance.id}
                      onClick={() => toggleAppliance(appliance.id)}
                      className="px-2.5 py-1 rounded-full text-xs font-medium transition-all"
                      style={{
                        background: selected ? 'rgba(139, 92, 246, 0.15)' : 'var(--glass-bg)',
                        color: selected ? 'var(--accent-secondary)' : 'var(--text-muted)',
                        border: `1px solid ${selected ? 'rgba(139, 92, 246, 0.35)' : 'var(--border-color)'}`,
                      }}
                    >
                      {appliance.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Servings */}
          <div className="glass-card rounded-2xl p-4">
            <div className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>{t('gen_servings')}</div>
            <div className="flex items-center gap-3">
              {[1, 2, 4, 6, 8, 10, 12].map((n) => (
                <button
                  key={n}
                  onClick={() => setServings(n)}
                  className="w-10 h-10 rounded-xl text-sm font-semibold transition-all"
                  style={{
                    background: servings === n ? 'var(--gradient-brand)' : 'var(--glass-bg)',
                    color: servings === n ? 'white' : 'var(--text-muted)',
                    border: `1px solid ${servings === n ? 'transparent' : 'var(--border-color)'}`,
                    boxShadow: servings === n ? '0 4px 12px rgba(236, 72, 153, 0.3)' : 'none',
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Cooking Skill Level */}
          <div className="glass-card rounded-2xl p-4">
            <div className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>{t('gen_skill_level')}</div>
            <div className="grid grid-cols-3 gap-2">
              {([
                { key: 'novice', label: t('gen_skill_novice'), sub: t('gen_skill_novice_sub'), emoji: '🍳' },
                { key: 'home_cook', label: t('gen_skill_home_cook'), sub: t('gen_skill_home_cook_sub'), emoji: '📖' },
                { key: 'pro', label: t('gen_skill_pro'), sub: t('gen_skill_pro_sub'), emoji: '👨‍🍳' },
              ] as const).map(({ key, label, sub, emoji }) => (
                <button
                  key={key}
                  onClick={() => setSkillLevel(key)}
                  className="flex flex-col items-center gap-1 py-3 px-2 rounded-xl text-xs font-medium transition-all"
                  style={
                    skillLevel === key
                      ? { background: 'var(--gradient-brand)', color: 'white', border: '1px solid transparent' }
                      : { background: 'var(--glass-bg)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }
                  }
                >
                  <span className="text-base">{emoji}</span>
                  <span className="font-bold text-xs">{label}</span>
                  <span className="text-[10px] opacity-75 text-center leading-tight">{sub}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Mood toggles */}
          <div className="glass-card rounded-2xl p-4">
            <div className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>{t('gen_mood')}</div>
            <div className="space-y-2">
              <button
                onClick={() => { setLazy(!lazy); if (!lazy) setAdventurous(false); }}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl transition-all text-left"
                style={{
                  background: lazy ? 'rgba(99, 102, 241, 0.12)' : 'var(--glass-bg)',
                  border: `1px solid ${lazy ? 'rgba(99, 102, 241, 0.35)' : 'var(--border-color)'}`,
                }}
              >
                <span className="text-xl flex-shrink-0">🛋️</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold" style={{ color: lazy ? 'rgb(99 102 241)' : 'var(--text-primary)' }}>{t('gen_mood_lazy')}</div>
                  <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{t('gen_mood_lazy_sub')}</div>
                </div>
                <div className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-all" style={{ background: lazy ? 'rgb(99 102 241)' : 'transparent', border: `1.5px solid ${lazy ? 'rgb(99 102 241)' : 'var(--border-color)'}` }}>
                  {lazy && <Check size={10} strokeWidth={3} color="white" />}
                </div>
              </button>
              <button
                onClick={() => { setAdventurous(!adventurous); if (!adventurous) setLazy(false); }}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl transition-all text-left"
                style={{
                  background: adventurous ? 'rgba(236, 72, 153, 0.12)' : 'var(--glass-bg)',
                  border: `1px solid ${adventurous ? 'rgba(236, 72, 153, 0.35)' : 'var(--border-color)'}`,
                }}
              >
                <span className="text-xl flex-shrink-0">🔥</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold" style={{ color: adventurous ? 'var(--accent-primary)' : 'var(--text-primary)' }}>{t('gen_mood_adventurous')}</div>
                  <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{t('gen_mood_adventurous_sub')}</div>
                </div>
                <div className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-all" style={{ background: adventurous ? 'var(--accent-primary)' : 'transparent', border: `1.5px solid ${adventurous ? 'var(--accent-primary)' : 'var(--border-color)'}` }}>
                  {adventurous && <Check size={10} strokeWidth={3} color="white" />}
                </div>
              </button>
            </div>
          </div>

          {/* Advanced preferences */}
          <div className="glass-card rounded-2xl overflow-hidden">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full px-4 py-3 flex items-center justify-between"
              style={{ color: 'var(--text-primary)' }}
            >
              <div className="flex items-center gap-2">
                <Settings2 size={16} style={{ color: 'var(--text-muted)' }} />
                <span className="text-sm font-medium">{t('gen_preferences')}</span>
              </div>
              <X
                size={16}
                style={{
                  color: 'var(--text-muted)',
                  transform: showAdvanced ? 'rotate(0deg)' : 'rotate(45deg)',
                  transition: 'transform 0.2s ease',
                }}
              />
            </button>
            {showAdvanced && (
              <div className="px-4 pb-4 animate-fade-in">
                <textarea
                  className="input-field w-full px-3 py-2.5 rounded-xl text-sm resize-none"
                  rows={3}
                  placeholder={t('gen_preferences_placeholder')}
                  value={preferences}
                  onChange={(e) => setPreferences(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-xl px-4 py-3 text-sm animate-fade-in" style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.2)' }}>
              {error}
            </div>
          )}

          {/* Generate Ideas button */}
          <button
            onClick={handleGenerateIdeas}
            disabled={ingredients.filter((i) => i.in_stock).length === 0 && selectedIngredients.size === 0}
            className="btn-gradient w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Sparkles size={20} strokeWidth={2} />
            {t('gen_generate_ideas_btn')}
          </button>
        </div>
      )}
    </div>
  );
}
