'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, ChefHat, Settings2, X, Check } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { supabase } from '@/lib/supabase';
import { InventoryItem, Appliance, CATEGORY_EMOJIS, CATEGORY_LABELS, InventoryCategory } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';

export default function GeneratePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [ingredients, setIngredients] = useState<InventoryItem[]>([]);
  const [appliances, setAppliances] = useState<Appliance[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  // Selections
  const [selectedIngredients, setSelectedIngredients] = useState<Set<string>>(new Set());
  const [selectedAppliances, setSelectedAppliances] = useState<Set<string>>(new Set());
  const [servings, setServings] = useState(4);
  const [preferences, setPreferences] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [useAllInStock, setUseAllInStock] = useState(true);
  const [strictStock, setStrictStock] = useState(false);

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

      // Pre-select all in-stock items and all appliances
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

  const handleGenerate = async () => {
    setGenerating(true);
    setError('');
    try {
      const selectedIngs = useAllInStock
        ? ingredients.filter((i) => i.in_stock)
        : ingredients.filter((i) => selectedIngredients.has(i.id));

      const selectedApps = appliances.filter((a) => selectedAppliances.has(a.id));

      const response = await fetch('/api/generate-recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ingredients: selectedIngs,
          appliances: selectedApps,
          preferences,
          servings,
          useAll: useAllInStock,
          strictStock,
        }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || 'Generation failed');
      }

      // Save recipe to Supabase
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
          ai_generated: true,
          user_id: user?.id,
        })
        .select()
        .single();

      if (saveError) throw saveError;

      router.push(`/recipes/${saved.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const inStockCount = ingredients.filter((i) => i.in_stock).length;

  // Group in-stock ingredients by category
  const grouped: Partial<Record<InventoryCategory, InventoryItem[]>> = {};
  ingredients.filter((i) => i.in_stock).forEach((item) => {
    if (!grouped[item.category]) grouped[item.category] = [];
    grouped[item.category]!.push(item);
  });

  return (
    <div className="page-content max-w-lg mx-auto px-4 pt-10">
      <PageHeader title="Generate Recipe" subtitle="AI-powered from your kitchen" />

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="loading-shimmer h-20 rounded-2xl" />)}
        </div>
      ) : (
        <div className="space-y-5 animate-fade-in">
          {/* Ingredient selection mode */}
          <div className="glass-card rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Ingredients</div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {inStockCount} items in stock
                </div>
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
                Use all in-stock
              </button>
            </div>

            {/* Strict stock toggle */}
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
                <span className="font-semibold">Only use what I have</span>
                <span style={{ color: 'var(--text-muted)' }}> — no extra ingredients (salt always included)</span>
              </span>
            </button>

            {!useAllInStock && (
              <div className="space-y-3 mt-3">
                {(Object.keys(grouped) as InventoryCategory[]).map((cat) => (
                  <div key={cat}>
                    <div className="text-xs font-medium mb-1.5 flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                      {CATEGORY_EMOJIS[cat]} {CATEGORY_LABELS[cat]}
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
                  <p className="text-xs text-center py-4" style={{ color: 'var(--text-muted)' }}>
                    No items in stock. Add some to your pantry first!
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Appliances */}
          <div className="glass-card rounded-2xl p-4">
            <div className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Appliances to use</div>
            {appliances.length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No appliances added yet.</p>
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
            <div className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Servings</div>
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

          {/* Advanced preferences */}
          <div className="glass-card rounded-2xl overflow-hidden">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full px-4 py-3 flex items-center justify-between"
              style={{ color: 'var(--text-primary)' }}
            >
              <div className="flex items-center gap-2">
                <Settings2 size={16} style={{ color: 'var(--text-muted)' }} />
                <span className="text-sm font-medium">Preferences & Dietary Notes</span>
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
                  placeholder="e.g. Spicy, low-carb, no dairy, Italian style, quick dinner under 30 min…"
                  value={preferences}
                  onChange={(e) => setPreferences(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div
              className="rounded-xl px-4 py-3 text-sm animate-fade-in"
              style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.2)' }}
            >
              {error}
            </div>
          )}

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={generating || (ingredients.filter((i) => i.in_stock).length === 0 && selectedIngredients.size === 0)}
            className="btn-gradient w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? (
              <>
                <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Generating your recipe…
              </>
            ) : (
              <>
                <Sparkles size={20} strokeWidth={2} />
                Generate Recipe with AI
              </>
            )}
          </button>

          {generating && (
            <p className="text-center text-sm animate-pulse" style={{ color: 'var(--text-muted)' }}>
              <ChefHat size={14} className="inline mr-1" />
              ChatGPT is crafting something delicious for you…
            </p>
          )}
        </div>
      )}
    </div>
  );
}
