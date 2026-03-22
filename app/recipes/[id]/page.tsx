'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Clock, Users, Printer, Download, Share2, Copy,
  Check, ChefHat, Sparkles, Minus, Plus, Timer, Play, Pause,
  RotateCcw, ShoppingCart, Lightbulb, Wand2, SendHorizontal, UtensilsCrossed,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Recipe, RecipeIngredient } from '@/lib/types';
import ThemeToggle from '@/components/ThemeToggle';
import { useLanguage } from '@/contexts/LanguageContext';

const SCALE_OPTIONS = [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4];

function formatAmount(amount: number, scale: number): string {
  const scaled = amount * scale;
  const rounded = Math.round(scaled * 100) / 100;
  if (rounded === Math.floor(rounded)) return String(Math.floor(rounded));

  const fractions: [number, string][] = [
    [0.125, '⅛'], [0.25, '¼'], [0.333, '⅓'], [0.375, '⅜'],
    [0.5, '½'], [0.625, '⅝'], [0.667, '⅔'], [0.75, '¾'], [0.875, '⅞'],
  ];
  const whole = Math.floor(rounded);
  const decimal = rounded - whole;
  const fraction = fractions.find(([val]) => Math.abs(val - decimal) < 0.05);
  if (fraction) {
    return whole > 0 ? `${whole} ${fraction[1]}` : fraction[1];
  }
  return rounded.toFixed(2).replace(/\.?0+$/, '');
}

/** Returns duration in seconds if the step text contains a time mention, else null */
function parseStepDuration(step: string): number | null {
  let total = 0;
  const hourMatch = step.match(/\b(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)\b/i);
  // For minutes, handle ranges like "10-15 minutes" — use the lower bound
  const minMatch = step.match(/\b(\d+)(?:\s*[-–]\s*\d+)?\s*(?:minutes?|mins?)\b/i);
  if (hourMatch) total += Math.round(parseFloat(hourMatch[1]) * 3600);
  if (minMatch) total += parseInt(minMatch[1]) * 60;
  return total > 0 ? total : null;
}

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

interface StepTimer {
  totalSeconds: number;
  remaining: number;
  running: boolean;
  done: boolean;
}

interface SideDish {
  name: string;
  description: string;
  emoji: string;
  difficulty: 'novice' | 'home_cook' | 'pro';
  estimatedMinutes: number;
  isStoreBought: boolean;
}

export default function RecipeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const printRef = useRef<HTMLDivElement>(null);
  const { t } = useLanguage();

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [pantryNames, setPantryNames] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [scale, setScale] = useState(1);
  const [customScale, setCustomScale] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);
  const [checkedSteps, setCheckedSteps] = useState<Set<number>>(new Set());
  const [stepTimers, setStepTimers] = useState<Record<number, StepTimer>>({});
  const [shoppingCopied, setShoppingCopied] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [completedMsg, setCompletedMsg] = useState('');

  // Iteration widget
  type IterIntensity = 'tweak' | 'rework' | 'reinvent';
  const [iterRequest, setIterRequest] = useState('');
  const [iterIntensity, setIterIntensity] = useState<IterIntensity>('rework');
  const [iterLoading, setIterLoading] = useState(false);
  const [iterResult, setIterResult] = useState<Recipe | null>(null);
  const [iterSaving, setIterSaving] = useState(false);
  const [iterSaved, setIterSaved] = useState(false);
  const [iterReplacing, setIterReplacing] = useState(false);
  const [iterError, setIterError] = useState('');

  // Side dishes
  const [sideDishes, setSideDishes] = useState<SideDish[]>([]);
  const [sidesLoading, setSidesLoading] = useState(false);
  const [generatingSide, setGeneratingSide] = useState<string | null>(null);

  // Single interval that ticks all running timers
  useEffect(() => {
    const interval = setInterval(() => {
      setStepTimers(prev => {
        const hasRunning = Object.values(prev).some(t => t.running && t.remaining > 0);
        if (!hasRunning) return prev;
        const next = { ...prev };
        for (const key in next) {
          const t = next[key];
          if (t.running) {
            if (t.remaining > 0) {
              next[key] = { ...t, remaining: t.remaining - 1 };
            } else {
              next[key] = { ...t, running: false, done: true };
            }
          }
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const startTimer = (idx: number, totalSeconds: number) => {
    setStepTimers(prev => ({
      ...prev,
      [idx]: prev[idx]
        ? { ...prev[idx], running: true, done: false }
        : { totalSeconds, remaining: totalSeconds, running: true, done: false },
    }));
  };

  const pauseTimer = (idx: number) => {
    setStepTimers(prev => ({ ...prev, [idx]: { ...prev[idx], running: false } }));
  };

  const resetTimer = (idx: number, totalSeconds: number) => {
    setStepTimers(prev => ({
      ...prev,
      [idx]: { totalSeconds, remaining: totalSeconds, running: false, done: false },
    }));
  };

  const fetchRecipe = useCallback(async () => {
    const [{ data: recipeData }, { data: pantryData }] = await Promise.all([
      supabase.from('recipes').select('*').eq('id', params.id as string).single(),
      supabase.from('inventory_items').select('name').eq('in_stock', true),
    ]);
    setRecipe(recipeData);
    setPantryNames(new Set((pantryData || []).map((i: { name: string }) => i.name.toLowerCase())));
    setLoading(false);
  }, [params.id]);

  useEffect(() => { fetchRecipe(); }, [fetchRecipe]);

  const fetchSideDishes = useCallback(async (r: Recipe) => {
    setSidesLoading(true);
    try {
      const res = await fetch('/api/side-dishes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipe: { name: r.name, description: r.description, tags: r.tags, prep_time: r.prep_time, cook_time: r.cook_time } }),
      });
      const data = await res.json();
      if (data.sides) setSideDishes(data.sides);
    } catch {
      // Side dishes are non-critical; fail silently
    } finally {
      setSidesLoading(false);
    }
  }, []);

  useEffect(() => { if (recipe) fetchSideDishes(recipe); }, [recipe, fetchSideDishes]);

  const isInPantry = (ingredientName: string) => {
    const lower = ingredientName.toLowerCase();
    for (const p of pantryNames) {
      if (lower.includes(p) || p.includes(lower)) return true;
    }
    return false;
  };

  const toggleStep = (idx: number) => {
    setCheckedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  const effectiveScale = showCustom && customScale ? parseFloat(customScale) || 1 : scale;

  const missingIngredients = recipe && pantryNames.size > 0
    ? recipe.ingredients.filter(ing => !isInPantry(ing.name))
    : [];

  const getRecipeText = () => {
    if (!recipe) return '';
    const scaled = recipe.servings * effectiveScale;
    let text = `${recipe.name}\n`;
    if (recipe.description) text += `\n${recipe.description}\n`;
    text += `\nServings: ${scaled}`;
    if (recipe.prep_time) text += `  |  Prep: ${recipe.prep_time} min`;
    if (recipe.cook_time) text += `  |  Cook: ${recipe.cook_time} min`;
    text += `\n\nINGREDIENTS:\n`;
    recipe.ingredients.forEach((ing: RecipeIngredient) => {
      text += `• ${formatAmount(ing.amount, effectiveScale)} ${ing.unit} ${ing.name}\n`;
    });
    text += `\nINSTRUCTIONS:\n`;
    recipe.instructions.forEach((step, i) => {
      text += `${i + 1}. ${step}\n`;
    });
    if (recipe.notes?.length) {
      text += `\nCHEF'S NOTES:\n`;
      recipe.notes.forEach(n => { text += `• ${n}\n`; });
    }
    if (recipe.tags?.length) text += `\nTags: ${recipe.tags.join(', ')}`;
    return text;
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(getRecipeText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    const text = getRecipeText();
    if (navigator.share) {
      await navigator.share({ title: recipe?.name, text });
    } else {
      await navigator.clipboard.writeText(window.location.href);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    }
  };

  const handlePrint = () => window.print();

  const handleCopyShoppingList = async () => {
    const lines = missingIngredients.map(ing =>
      `• ${formatAmount(ing.amount, effectiveScale)} ${ing.unit} ${ing.name}`
    ).join('\n');
    await navigator.clipboard.writeText(`Shopping List for ${recipe?.name}:\n${lines}`);
    setShoppingCopied(true);
    setTimeout(() => setShoppingCopied(false), 2000);
  };

  const handleMarkCompleted = async () => {
    if (!recipe || completing) return;
    setCompleting(true);
    setCompletedMsg('');
    try {
      const { data: pantryItems } = await supabase
        .from('inventory_items')
        .select('id, name, quantity, unit, in_stock');

      if (!pantryItems || pantryItems.length === 0) {
        setCompletedMsg(t('rd_no_pantry_match'));
        return;
      }

      const updates: PromiseLike<unknown>[] = [];
      let matched = 0;

      for (const ing of recipe.ingredients) {
        const ingLower = ing.name.toLowerCase();
        const pantryItem = pantryItems.find((p: { name: string }) => {
          const pLower = p.name.toLowerCase();
          return ingLower.includes(pLower) || pLower.includes(ingLower);
        });

        if (!pantryItem) continue;
        matched++;

        const usedAmount = ing.amount * effectiveScale;
        const currentQty = pantryItem.quantity ?? null;

        if (currentQty !== null) {
          const newQty = Math.max(0, currentQty - usedAmount);
          updates.push(
            supabase
              .from('inventory_items')
              .update({ quantity: newQty, in_stock: newQty > 0 })
              .eq('id', pantryItem.id)
              .then((r) => r)
          );
        } else {
          // No quantity tracked — just flip to out of stock
          updates.push(
            supabase
              .from('inventory_items')
              .update({ in_stock: false })
              .eq('id', pantryItem.id)
              .then((r) => r)
          );
        }
      }

      await Promise.all(updates);

      if (matched === 0) {
        setCompletedMsg(t('rd_no_pantry_match'));
      } else {
        setCompletedMsg(t('rd_completed_success'));
        // Refresh pantry names so badges update
        const { data: fresh } = await supabase
          .from('inventory_items')
          .select('name')
          .eq('in_stock', true);
        setPantryNames(new Set((fresh || []).map((i: { name: string }) => i.name.toLowerCase())));
      }
    } finally {
      setCompleting(false);
    }
  };

  const handleIterateRecipe = async () => {
    if (!recipe || !iterRequest.trim() || iterLoading) return;
    setIterLoading(true);
    setIterError('');
    setIterResult(null);
    try {
      const res = await fetch('/api/iterate-recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipe, userRequest: iterRequest.trim(), intensity: iterIntensity }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Failed');
      setIterResult(data.recipe);
    } catch (e) {
      setIterError(e instanceof Error ? e.message : t('iter_error'));
    } finally {
      setIterLoading(false);
    }
  };

  const handleSaveIterAsNew = async () => {
    if (!iterResult || iterSaving) return;
    setIterSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('recipes').insert({
        ...iterResult,
        user_id: user?.id,
        ai_generated: true,
      });
      if (error) throw error;
      setIterSaved(true);
      setTimeout(() => setIterSaved(false), 3000);
    } catch {
      setIterError(t('iter_error'));
    } finally {
      setIterSaving(false);
    }
  };

  const handleReplaceRecipe = async () => {
    if (!recipe || !iterResult || iterReplacing) return;
    setIterReplacing(true);
    try {
      const { error } = await supabase
        .from('recipes')
        .update({ ...iterResult })
        .eq('id', recipe.id);
      if (error) throw error;
      setRecipe({ ...recipe, ...iterResult });
      setIterResult(null);
      setIterRequest('');
    } catch {
      setIterError(t('iter_error'));
    } finally {
      setIterReplacing(false);
    }
  };

  const handleSideDishClick = async (side: SideDish) => {
    if (generatingSide) return;
    setGeneratingSide(side.name);
    try {
      const res = await fetch('/api/side-dish-recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sideDish: side,
          mainRecipeName: recipe?.name ?? '',
          mainRecipeTags: recipe?.tags ?? [],
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Failed');

      const { data: { user } } = await supabase.auth.getUser();
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

      if (saveError) throw saveError;
      router.push(`/recipes/${saved.id}`);
    } catch {
      // Just clear loading — user can try again
    } finally {
      setGeneratingSide(null);
    }
  };

  const handleDownloadPdf = async () => {
    if (!recipe) return;
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      const W = 210;
      const margin = 20;
      const contentW = W - margin * 2;
      let y = margin;

      const pink: [number, number, number] = [236, 72, 153];
      const purple: [number, number, number] = [139, 92, 246];
      const dark: [number, number, number] = [26, 5, 39];
      const gray: [number, number, number] = [100, 80, 120];

      doc.setFillColor(...pink);
      doc.rect(0, 0, W, 12, 'F');

      y = 22;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.setTextColor(...dark);
      const titleLines = doc.splitTextToSize(recipe.name, contentW);
      doc.text(titleLines, margin, y);
      y += titleLines.length * 9 + 3;

      if (recipe.description) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(10);
        doc.setTextColor(...gray);
        const descLines = doc.splitTextToSize(recipe.description, contentW);
        doc.text(descLines, margin, y);
        y += descLines.length * 5 + 4;
      }

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...purple);
      const scaledServings = recipe.servings * effectiveScale;
      const meta = [
        `Servings: ${scaledServings}`,
        recipe.prep_time ? `Prep: ${recipe.prep_time} min` : null,
        recipe.cook_time ? `Cook: ${recipe.cook_time} min` : null,
        effectiveScale !== 1 ? `Scale: ${effectiveScale}x` : null,
      ].filter(Boolean).join('   ·   ');
      doc.text(meta, margin, y);
      y += 8;

      doc.setDrawColor(...pink);
      doc.setLineWidth(0.5);
      doc.line(margin, y, W - margin, y);
      y += 6;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(...pink);
      doc.text('Ingredients', margin, y);
      y += 7;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...dark);
      recipe.ingredients.forEach((ing: RecipeIngredient) => {
        const line = `• ${formatAmount(ing.amount, effectiveScale)} ${ing.unit} ${ing.name}`;
        const lines = doc.splitTextToSize(line, contentW);
        if (y + lines.length * 5 > 270) { doc.addPage(); y = margin; }
        doc.text(lines, margin + 2, y);
        y += lines.length * 5 + 1;
      });

      y += 4;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(...purple);
      doc.text('Instructions', margin, y);
      y += 7;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...dark);
      recipe.instructions.forEach((step, i) => {
        const line = `${i + 1}. ${step}`;
        const lines = doc.splitTextToSize(line, contentW);
        if (y + lines.length * 5 > 270) { doc.addPage(); y = margin; }
        doc.text(lines, margin, y);
        y += lines.length * 5 + 3;
      });

      if (recipe.notes?.length) {
        y += 4;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.setTextColor(...pink);
        doc.text("Chef's Notes", margin, y);
        y += 7;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(...dark);
        recipe.notes.forEach(note => {
          const line = `💡 ${note}`;
          const lines = doc.splitTextToSize(line, contentW);
          if (y + lines.length * 5 > 270) { doc.addPage(); y = margin; }
          doc.text(lines, margin + 2, y);
          y += lines.length * 5 + 2;
        });
      }

      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(...gray);
        doc.text("Thay's Kitchen", margin, 290);
        doc.text(`Page ${i} of ${pageCount}`, W - margin - 20, 290);
      }

      doc.save(`${recipe.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.pdf`);
    } catch (err) {
      console.error('PDF error:', err);
    }
  };

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 pt-10 space-y-4">
        <div className="loading-shimmer h-8 w-3/4 rounded-xl" />
        <div className="loading-shimmer h-4 w-1/2 rounded-xl" />
        <div className="loading-shimmer h-48 rounded-2xl" />
        <div className="loading-shimmer h-64 rounded-2xl" />
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="max-w-lg mx-auto px-4 pt-20 text-center">
        <p style={{ color: 'var(--text-muted)' }}>{t('rd_not_found')}</p>
        <button onClick={() => router.back()} className="mt-4 text-sm" style={{ color: 'var(--accent-primary)' }}>{t('rd_go_back')}</button>
      </div>
    );
  }

  return (
    <div className="page-content max-w-lg mx-auto" ref={printRef}>
      {/* Top bar */}
      <div
        className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 no-print"
        style={{ background: 'var(--nav-bg)', backdropFilter: 'blur(16px)', borderBottom: '1px solid var(--border-color)' }}
      >
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm font-medium"
          style={{ color: 'var(--text-secondary)' }}
        >
          <ArrowLeft size={18} /> {t('rd_back')}
        </button>
        <div className="flex items-center gap-2">
          <button onClick={handleCopy} className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all" style={{ background: 'var(--glass-bg)', border: '1px solid var(--border-color)', color: copied ? 'var(--success)' : 'var(--text-muted)' }}>
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? t('rd_copied') : t('rd_copy')}
          </button>
          <button onClick={handleShare} className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all" style={{ background: 'var(--glass-bg)', border: '1px solid var(--border-color)', color: shared ? 'var(--success)' : 'var(--text-muted)' }}>
            {shared ? <Check size={13} /> : <Share2 size={13} />}
            {shared ? t('rd_copied') : t('rd_share')}
          </button>
          <button onClick={handlePrint} className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all" style={{ background: 'var(--glass-bg)', border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
            <Printer size={13} /> {t('rd_print')}
          </button>
          <button onClick={handleDownloadPdf} className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all btn-gradient">
            <Download size={13} /> {t('rd_pdf')}
          </button>
          <ThemeToggle />
        </div>
      </div>

      <div className="px-4 pt-5">
        {/* Title */}
        <div className="mb-4">
          <div className="flex items-start gap-2 flex-wrap mb-2">
            <h1 className="text-2xl font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>
              {recipe.name}
            </h1>
            {recipe.ai_generated && (
              <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 mt-0.5" style={{ background: 'rgba(139, 92, 246, 0.12)', color: 'var(--accent-secondary)' }}>
                <Sparkles size={11} /> {t('rd_ai_generated')}
              </span>
            )}
          </div>
          {recipe.description && (
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              {recipe.description}
            </p>
          )}
        </div>

        {/* Iteration widget */}
        <div className="glass-card rounded-2xl p-4 mb-5 no-print">
          <div className="flex items-center gap-2 mb-3">
            <Wand2 size={15} style={{ color: 'var(--accent-primary)' }} />
            <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{t('iter_heading')}</span>
          </div>

          {/* Intensity selector */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            {(['tweak', 'rework', 'reinvent'] as const).map((level) => (
              <button
                key={level}
                onClick={() => setIterIntensity(level)}
                className="flex flex-col items-center gap-0.5 py-2 px-1 rounded-xl text-xs font-medium transition-all"
                style={
                  iterIntensity === level
                    ? { background: 'var(--gradient-brand)', color: 'white', border: '1px solid transparent' }
                    : { background: 'var(--glass-bg)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }
                }
              >
                <span className="font-semibold text-xs">{t(`iter_${level}`)}</span>
                <span className="text-[10px] opacity-75">{t(`iter_${level}_sub`)}</span>
              </button>
            ))}
          </div>

          {/* Text input + send */}
          <div className="flex gap-2">
            <textarea
              value={iterRequest}
              onChange={(e) => setIterRequest(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleIterateRecipe(); }
              }}
              placeholder={t('iter_placeholder')}
              rows={2}
              className="input-field flex-1 px-3 py-2 rounded-xl text-sm resize-none"
              style={{ color: 'var(--text-primary)' }}
            />
            <button
              onClick={handleIterateRecipe}
              disabled={iterLoading || !iterRequest.trim()}
              className="flex items-center justify-center w-10 h-10 self-end rounded-xl btn-gradient transition-all disabled:opacity-50"
            >
              {iterLoading
                ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                : <SendHorizontal size={16} />}
            </button>
          </div>

          {iterLoading && (
            <p className="text-xs mt-2 text-center" style={{ color: 'var(--text-muted)' }}>{t('iter_submitting')}</p>
          )}
          {iterError && (
            <p className="text-xs mt-2 text-red-500">{iterError}</p>
          )}

          {/* Result preview */}
          {iterResult && (
            <div className="mt-3 rounded-xl p-3" style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)' }}>
              <p className="text-sm font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{iterResult.name}</p>
              {iterResult.description && (
                <p className="text-xs mb-3 leading-relaxed" style={{ color: 'var(--text-muted)' }}>{iterResult.description}</p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={handleSaveIterAsNew}
                  disabled={iterSaving || iterSaved}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all btn-gradient disabled:opacity-70"
                >
                  {iterSaved ? t('iter_saved') : iterSaving ? t('iter_saving') : t('iter_save_version')}
                </button>
                <button
                  onClick={handleReplaceRecipe}
                  disabled={iterReplacing}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
                  style={{ background: 'var(--glass-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                >
                  {iterReplacing ? t('iter_replacing') : t('iter_replace')}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Meta */}
        <div className="glass-card rounded-2xl p-4 mb-5 grid grid-cols-3 gap-4">
          <div className="flex flex-col items-center gap-1">
            <Clock size={18} style={{ color: 'var(--accent-primary)' }} strokeWidth={1.8} />
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('rd_prep')}</span>
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {recipe.prep_time ? `${recipe.prep_time}m` : '—'}
            </span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <ChefHat size={18} style={{ color: 'var(--accent-secondary)' }} strokeWidth={1.8} />
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('rd_cook')}</span>
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {recipe.cook_time ? `${recipe.cook_time}m` : '—'}
            </span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Users size={18} style={{ color: 'var(--accent-tertiary)' }} strokeWidth={1.8} />
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('rd_serves')}</span>
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {Math.round(recipe.servings * effectiveScale)}
            </span>
          </div>
        </div>

        {/* Scale */}
        <div className="glass-card rounded-2xl p-4 mb-5 no-print">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t('rd_recipe_scale')}</span>
            <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background: 'rgba(236, 72, 153, 0.1)', color: 'var(--accent-primary)' }}>
              {effectiveScale}×
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap mb-3">
            {SCALE_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() => { setScale(s); setShowCustom(false); setCustomScale(''); }}
                className="px-3 py-1.5 rounded-xl text-sm font-medium transition-all"
                style={{
                  background: scale === s && !showCustom ? 'var(--gradient-brand)' : 'var(--glass-bg)',
                  color: scale === s && !showCustom ? 'white' : 'var(--text-muted)',
                  border: `1px solid ${scale === s && !showCustom ? 'transparent' : 'var(--border-color)'}`,
                  boxShadow: scale === s && !showCustom ? '0 2px 8px rgba(236,72,153,0.3)' : 'none',
                  fontWeight: scale === s && !showCustom ? 700 : 500,
                }}
              >
                {s === 0.25 ? '¼×' : s === 0.5 ? '½×' : s === 0.75 ? '¾×' : `${s}×`}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { const v = Math.max(0.1, effectiveScale - 0.5); setScale(v); setShowCustom(false); }}
              className="flex items-center justify-center w-8 h-8 rounded-lg transition-all"
              style={{ background: 'var(--glass-bg)', border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}
            >
              <Minus size={14} />
            </button>
            <input
              type="number"
              step="0.25"
              min="0.1"
              placeholder={t('rd_custom')}
              value={showCustom ? customScale : ''}
              onFocus={() => setShowCustom(true)}
              onChange={(e) => setCustomScale(e.target.value)}
              className="input-field flex-1 px-3 py-1.5 rounded-lg text-sm text-center"
              style={{ maxWidth: '120px' }}
            />
            <button
              onClick={() => { const v = effectiveScale + 0.5; setScale(v); setShowCustom(false); }}
              className="flex items-center justify-center w-8 h-8 rounded-lg transition-all"
              style={{ background: 'var(--glass-bg)', border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}
            >
              <Plus size={14} />
            </button>
          </div>
        </div>

        {/* Ingredients */}
        <div className="mb-5">
          <h2 className="text-base font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
            {t('rd_ingredients')}
            <span className="ml-2 text-xs font-normal" style={{ color: 'var(--text-muted)' }}>
              ({recipe.ingredients.length})
            </span>
          </h2>
          <div className="glass-card rounded-2xl overflow-hidden">
            {recipe.ingredients.map((ing: RecipeIngredient, i: number) => {
              const inPantry = pantryNames.size > 0 ? isInPantry(ing.name) : null;
              return (
                <div
                  key={i}
                  className="flex items-center gap-3 px-4 py-3"
                  style={{ borderBottom: i < recipe.ingredients.length - 1 ? '1px solid var(--border-color)' : 'none' }}
                >
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'var(--gradient-brand)' }} />
                  <span className="text-sm flex-1" style={{ color: 'var(--text-primary)' }}>
                    <strong style={{ color: 'var(--accent-primary)' }}>
                      {formatAmount(ing.amount, effectiveScale)} {ing.unit}
                    </strong>
                    {' '}{ing.name}
                  </span>
                  {inPantry !== null && (
                    <span
                      className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                      style={inPantry
                        ? { background: 'rgba(34,197,94,0.12)', color: '#22c55e' }
                        : { background: 'rgba(249,115,22,0.12)', color: '#f97316' }}
                    >
                      {inPantry ? t('rd_in_pantry') : t('rd_need_to_buy')}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Shopping list */}
        {missingIngredients.length > 0 && (
          <div className="mb-5 no-print">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <ShoppingCart size={16} style={{ color: '#f97316' }} />
                {t('rd_shopping_list')}
                <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>
                  ({missingIngredients.length})
                </span>
              </h2>
              <button
                onClick={handleCopyShoppingList}
                className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-medium transition-all"
                style={{
                  background: shoppingCopied ? 'rgba(34,197,94,0.12)' : 'var(--glass-bg)',
                  border: '1px solid var(--border-color)',
                  color: shoppingCopied ? '#22c55e' : 'var(--text-muted)',
                }}
              >
                {shoppingCopied ? <Check size={11} /> : <Copy size={11} />}
                {shoppingCopied ? t('rd_copied') : t('rd_copy_list')}
              </button>
            </div>
            <div className="glass-card rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(249,115,22,0.2)' }}>
              {missingIngredients.map((ing, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 px-4 py-2.5"
                  style={{ borderBottom: i < missingIngredients.length - 1 ? '1px solid var(--border-color)' : 'none' }}
                >
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#f97316' }} />
                  <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                    <strong style={{ color: '#f97316' }}>
                      {formatAmount(ing.amount, effectiveScale)} {ing.unit}
                    </strong>
                    {' '}{ing.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Appliances used */}
        {recipe.appliances_used && recipe.appliances_used.length > 0 && (
          <div className="mb-5">
            <h2 className="text-base font-bold mb-3" style={{ color: 'var(--text-primary)' }}>{t('rd_youll_need')}</h2>
            <div className="flex flex-wrap gap-2">
              {recipe.appliances_used.map((a) => (
                <span key={a} className="px-3 py-1.5 rounded-full text-sm" style={{ background: 'rgba(139, 92, 246, 0.1)', color: 'var(--accent-secondary)', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
                  {a}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mb-5">
          <h2 className="text-base font-bold mb-3" style={{ color: 'var(--text-primary)' }}>{t('rd_instructions')}</h2>
          <div className="space-y-3">
            {recipe.instructions.map((step, i) => {
              const duration = parseStepDuration(step);
              const timer = stepTimers[i];
              const isDone = checkedSteps.has(i);

              return (
                <div
                  key={i}
                  className="glass-card rounded-2xl p-4 no-print transition-all duration-200"
                  style={{ opacity: isDone ? 0.55 : 1 }}
                >
                  <div className="flex gap-3">
                    {/* Step number / check — clickable */}
                    <button
                      onClick={() => toggleStep(i)}
                      className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-all duration-200"
                      style={{
                        background: isDone ? 'var(--success)' : 'var(--gradient-brand)',
                        color: 'white',
                        minWidth: '28px',
                      }}
                    >
                      {isDone ? <Check size={13} strokeWidth={2.5} /> : i + 1}
                    </button>

                    {/* Step content */}
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-sm leading-relaxed cursor-pointer"
                        style={{
                          color: 'var(--text-primary)',
                          textDecoration: isDone ? 'line-through' : 'none',
                        }}
                        onClick={() => toggleStep(i)}
                      >
                        {step}
                      </p>

                      {/* Timer row */}
                      {duration && (
                        <div
                          className="flex items-center gap-2 mt-2.5"
                          onClick={e => e.stopPropagation()}
                        >
                          {!timer || (!timer.running && !timer.done) ? (
                            /* Idle state */
                            <button
                              onClick={() => startTimer(i, duration)}
                              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all"
                              style={{
                                background: 'rgba(139,92,246,0.1)',
                                border: '1px solid rgba(139,92,246,0.25)',
                                color: 'var(--accent-secondary)',
                              }}
                            >
                              <Timer size={11} strokeWidth={2} />
                              {formatCountdown(timer?.remaining ?? duration)}
                              <Play size={10} strokeWidth={2.5} />
                            </button>
                          ) : timer.done ? (
                            /* Done state */
                            <>
                              <span
                                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
                                style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e' }}
                              >
                                <Check size={11} strokeWidth={2.5} /> {t('rd_times_up')}
                              </span>
                              <button
                                onClick={() => resetTimer(i, duration)}
                                className="flex items-center justify-center w-6 h-6 rounded-full transition-all"
                                style={{ background: 'var(--glass-bg)', border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}
                              >
                                <RotateCcw size={10} strokeWidth={2} />
                              </button>
                            </>
                          ) : (
                            /* Running or paused */
                            <>
                              <span
                                className="text-xs font-mono font-bold px-2 py-1 rounded-lg"
                                style={{
                                  background: timer.running ? 'rgba(139,92,246,0.15)' : 'var(--glass-bg)',
                                  color: timer.running ? 'var(--accent-secondary)' : 'var(--text-muted)',
                                  border: '1px solid var(--border-color)',
                                  minWidth: '48px',
                                  textAlign: 'center',
                                }}
                              >
                                {formatCountdown(timer.remaining)}
                              </span>
                              <button
                                onClick={() => timer.running ? pauseTimer(i) : startTimer(i, duration)}
                                className="flex items-center justify-center w-6 h-6 rounded-full transition-all"
                                style={{
                                  background: timer.running ? 'rgba(139,92,246,0.15)' : 'rgba(34,197,94,0.15)',
                                  border: '1px solid var(--border-color)',
                                  color: timer.running ? 'var(--accent-secondary)' : '#22c55e',
                                }}
                              >
                                {timer.running ? <Pause size={10} strokeWidth={2.5} /> : <Play size={10} strokeWidth={2.5} />}
                              </button>
                              <button
                                onClick={() => resetTimer(i, duration)}
                                className="flex items-center justify-center w-6 h-6 rounded-full transition-all"
                                style={{ background: 'var(--glass-bg)', border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}
                              >
                                <RotateCcw size={10} strokeWidth={2} />
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {/* Print-only instructions */}
          <div className="hidden print:block space-y-2">
            {recipe.instructions.map((step, i) => (
              <p key={i} className="text-sm">
                <strong>{i + 1}.</strong> {step}
              </p>
            ))}
          </div>
        </div>

        {/* Chef's Notes */}
        {recipe.notes && recipe.notes.length > 0 && (
          <div className="mb-5">
            <h2 className="text-base font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <Lightbulb size={16} style={{ color: '#f59e0b' }} />
              {t('rd_chefs_notes')}
            </h2>
            <div className="glass-card rounded-2xl p-4 space-y-3" style={{ border: '1px solid rgba(245,158,11,0.2)' }}>
              {recipe.notes.map((note, i) => (
                <div key={i} className="flex gap-2.5">
                  <span className="text-base flex-shrink-0 mt-0.5">💡</span>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>{note}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommended Side Dishes */}
        {(sidesLoading || sideDishes.length > 0) && (
          <div className="mb-5 no-print">
            <div className="flex items-center gap-2 mb-1">
              <UtensilsCrossed size={15} style={{ color: 'var(--accent-primary)' }} />
              <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>{t('rd_side_dishes')}</h2>
            </div>
            <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>{t('rd_side_dishes_sub')}</p>

            {sidesLoading ? (
              <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="loading-shimmer flex-shrink-0 w-40 h-36 rounded-2xl" />
                ))}
              </div>
            ) : (
              <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
                {sideDishes.map((side) => {
                  const isGenerating = generatingSide === side.name;
                  return (
                    <button
                      key={side.name}
                      onClick={() => handleSideDishClick(side)}
                      disabled={!!generatingSide}
                      className="flex-shrink-0 w-44 rounded-2xl p-3 text-left transition-all active:scale-95 disabled:opacity-60 flex flex-col justify-between"
                      style={{
                        background: 'var(--glass-bg)',
                        border: '1px solid var(--border-color)',
                        minHeight: '148px',
                      }}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xl">{side.emoji}</span>
                          <div className="flex items-center gap-1">
                            {side.isStoreBought && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e' }}>
                                store
                              </span>
                            )}
                            <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{side.estimatedMinutes}m</span>
                          </div>
                        </div>
                        <p className="text-xs font-semibold leading-snug mb-1" style={{ color: 'var(--text-primary)' }}>{side.name}</p>
                        <p className="text-[10px] leading-relaxed line-clamp-3" style={{ color: 'var(--text-muted)' }}>{side.description}</p>
                      </div>
                      <div
                        className="mt-2 w-full py-1.5 rounded-lg text-[10px] font-semibold flex items-center justify-center gap-1"
                        style={{ background: 'var(--gradient-brand)', color: 'white' }}
                      >
                        {isGenerating ? (
                          <>
                            <div className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin" />
                            {t('rd_side_generating')}
                          </>
                        ) : (
                          <>
                            <Sparkles size={10} />
                            {t('rd_make_this')}
                          </>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tags */}
        {recipe.tags && recipe.tags.length > 0 && (
          <div className="mb-5">
            <div className="flex flex-wrap gap-2">
              {recipe.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 rounded-full text-xs font-medium"
                  style={{ background: 'rgba(236, 72, 153, 0.1)', color: 'var(--accent-primary)', border: '1px solid rgba(236, 72, 153, 0.2)' }}
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Recipe Completed */}
        <div className="mb-4 no-print">
          <button
            onClick={handleMarkCompleted}
            disabled={completing}
            className="w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)', color: 'white', boxShadow: '0 4px 16px rgba(34,197,94,0.35)' }}
          >
            {completing ? (
              <>
                <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                {t('rd_completing')}
              </>
            ) : (
              <>
                <Check size={20} strokeWidth={2.5} />
                {t('rd_mark_completed')}
              </>
            )}
          </button>
          {completedMsg && (
            <p
              className="text-center text-sm mt-2 font-medium"
              style={{ color: completedMsg === t('rd_completed_success') ? '#22c55e' : 'var(--text-muted)' }}
            >
              {completedMsg}
              {completedMsg === t('rd_completed_success') && (
                <span className="block text-xs font-normal mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {t('rd_completed_body')}
                </span>
              )}
            </p>
          )}
        </div>

        {/* Bottom action buttons */}
        <div className="flex gap-3 mb-4 no-print">
          <button
            onClick={handleDownloadPdf}
            className="btn-gradient flex-1 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
          >
            <Download size={16} /> {t('rd_save_pdf')}
          </button>
          <button
            onClick={handleShare}
            className="flex-1 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all"
            style={{
              background: 'var(--glass-bg)',
              border: '1px solid var(--glass-border)',
              color: 'var(--text-primary)',
            }}
          >
            <Share2 size={16} /> {t('rd_share')}
          </button>
        </div>
      </div>
    </div>
  );
}
