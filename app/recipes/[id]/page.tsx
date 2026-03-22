'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Clock, Users, Printer, Download, Share2, Copy,
  Check, ChefHat, Sparkles, Minus, Plus
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Recipe, RecipeIngredient } from '@/lib/types';
import ThemeToggle from '@/components/ThemeToggle';

const SCALE_OPTIONS = [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4];

function formatAmount(amount: number, scale: number): string {
  const scaled = amount * scale;
  // Round to 2 decimal places, remove trailing zeros
  const rounded = Math.round(scaled * 100) / 100;
  if (rounded === Math.floor(rounded)) return String(Math.floor(rounded));

  // Convert to nice fractions
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

export default function RecipeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const printRef = useRef<HTMLDivElement>(null);

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [scale, setScale] = useState(1);
  const [customScale, setCustomScale] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);
  const [checkedSteps, setCheckedSteps] = useState<Set<number>>(new Set());

  const fetchRecipe = useCallback(async () => {
    const { data } = await supabase
      .from('recipes')
      .select('*')
      .eq('id', params.id as string)
      .single();
    setRecipe(data);
    setLoading(false);
  }, [params.id]);

  useEffect(() => { fetchRecipe(); }, [fetchRecipe]);

  const toggleStep = (idx: number) => {
    setCheckedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  const getRecipeText = () => {
    if (!recipe) return '';
    const scaled = recipe.servings * scale;
    let text = `${recipe.name}\n`;
    if (recipe.description) text += `\n${recipe.description}\n`;
    text += `\nServings: ${scaled}`;
    if (recipe.prep_time) text += `  |  Prep: ${recipe.prep_time} min`;
    if (recipe.cook_time) text += `  |  Cook: ${recipe.cook_time} min`;
    text += `\n\nINGREDIENTS:\n`;
    recipe.ingredients.forEach((ing: RecipeIngredient) => {
      text += `• ${formatAmount(ing.amount, scale)} ${ing.unit} ${ing.name}\n`;
    });
    text += `\nINSTRUCTIONS:\n`;
    recipe.instructions.forEach((step, i) => {
      text += `${i + 1}. ${step}\n`;
    });
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

  const handleDownloadPdf = async () => {
    if (!recipe) return;
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      const W = 210;
      const margin = 20;
      const contentW = W - margin * 2;
      let y = margin;

      // Colors
      const pink: [number, number, number] = [236, 72, 153];
      const purple: [number, number, number] = [139, 92, 246];
      const dark: [number, number, number] = [26, 5, 39];
      const gray: [number, number, number] = [100, 80, 120];

      // Header bar
      doc.setFillColor(...pink);
      doc.rect(0, 0, W, 12, 'F');

      // Title
      y = 22;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.setTextColor(...dark);
      const titleLines = doc.splitTextToSize(recipe.name, contentW);
      doc.text(titleLines, margin, y);
      y += titleLines.length * 9 + 3;

      // Description
      if (recipe.description) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(10);
        doc.setTextColor(...gray);
        const descLines = doc.splitTextToSize(recipe.description, contentW);
        doc.text(descLines, margin, y);
        y += descLines.length * 5 + 4;
      }

      // Meta row
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...purple);
      const scaled = recipe.servings * scale;
      const meta = [
        `Servings: ${scaled}`,
        recipe.prep_time ? `Prep: ${recipe.prep_time} min` : null,
        recipe.cook_time ? `Cook: ${recipe.cook_time} min` : null,
        scale !== 1 ? `Scale: ${scale}x` : null,
      ].filter(Boolean).join('   ·   ');
      doc.text(meta, margin, y);
      y += 8;

      // Divider
      doc.setDrawColor(...pink);
      doc.setLineWidth(0.5);
      doc.line(margin, y, W - margin, y);
      y += 6;

      // Ingredients
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(...pink);
      doc.text('Ingredients', margin, y);
      y += 7;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...dark);
      recipe.ingredients.forEach((ing: RecipeIngredient) => {
        const line = `• ${formatAmount(ing.amount, scale)} ${ing.unit} ${ing.name}`;
        const lines = doc.splitTextToSize(line, contentW);
        if (y + lines.length * 5 > 270) {
          doc.addPage();
          y = margin;
        }
        doc.text(lines, margin + 2, y);
        y += lines.length * 5 + 1;
      });

      y += 4;

      // Instructions
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
        if (y + lines.length * 5 > 270) {
          doc.addPage();
          y = margin;
        }
        doc.text(lines, margin, y);
        y += lines.length * 5 + 3;
      });

      // Footer
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
        <p style={{ color: 'var(--text-muted)' }}>Recipe not found.</p>
        <button onClick={() => router.back()} className="mt-4 text-sm" style={{ color: 'var(--accent-primary)' }}>← Go back</button>
      </div>
    );
  }

  const effectiveScale = showCustom && customScale ? parseFloat(customScale) || 1 : scale;

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
          <ArrowLeft size={18} /> Back
        </button>
        <div className="flex items-center gap-2">
          <button onClick={handleCopy} className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all" style={{ background: 'var(--glass-bg)', border: '1px solid var(--border-color)', color: copied ? 'var(--success)' : 'var(--text-muted)' }}>
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <button onClick={handleShare} className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all" style={{ background: 'var(--glass-bg)', border: '1px solid var(--border-color)', color: shared ? 'var(--success)' : 'var(--text-muted)' }}>
            {shared ? <Check size={13} /> : <Share2 size={13} />}
            {shared ? 'Copied!' : 'Share'}
          </button>
          <button onClick={handlePrint} className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all" style={{ background: 'var(--glass-bg)', border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
            <Printer size={13} /> Print
          </button>
          <button onClick={handleDownloadPdf} className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all btn-gradient">
            <Download size={13} /> PDF
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
                <Sparkles size={11} /> AI Generated
              </span>
            )}
          </div>
          {recipe.description && (
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              {recipe.description}
            </p>
          )}
        </div>

        {/* Meta */}
        <div className="glass-card rounded-2xl p-4 mb-5 grid grid-cols-3 gap-4">
          <div className="flex flex-col items-center gap-1">
            <Clock size={18} style={{ color: 'var(--accent-primary)' }} strokeWidth={1.8} />
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Prep</span>
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {recipe.prep_time ? `${recipe.prep_time}m` : '—'}
            </span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <ChefHat size={18} style={{ color: 'var(--accent-secondary)' }} strokeWidth={1.8} />
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Cook</span>
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {recipe.cook_time ? `${recipe.cook_time}m` : '—'}
            </span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Users size={18} style={{ color: 'var(--accent-tertiary)' }} strokeWidth={1.8} />
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Serves</span>
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {Math.round(recipe.servings * effectiveScale)}
            </span>
          </div>
        </div>

        {/* Scale */}
        <div className="glass-card rounded-2xl p-4 mb-5 no-print">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Recipe Scale</span>
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
          {/* Custom scale */}
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
              placeholder="Custom…"
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
            Ingredients
            <span className="ml-2 text-xs font-normal" style={{ color: 'var(--text-muted)' }}>
              ({recipe.ingredients.length} items)
            </span>
          </h2>
          <div className="glass-card rounded-2xl overflow-hidden">
            {recipe.ingredients.map((ing: RecipeIngredient, i: number) => (
              <div
                key={i}
                className="flex items-center gap-3 px-4 py-3"
                style={{ borderBottom: i < recipe.ingredients.length - 1 ? '1px solid var(--border-color)' : 'none' }}
              >
                <div
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: 'var(--gradient-brand)' }}
                />
                <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                  <strong style={{ color: 'var(--accent-primary)' }}>
                    {formatAmount(ing.amount, effectiveScale)} {ing.unit}
                  </strong>
                  {' '}{ing.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Appliances used */}
        {recipe.appliances_used && recipe.appliances_used.length > 0 && (
          <div className="mb-5">
            <h2 className="text-base font-bold mb-3" style={{ color: 'var(--text-primary)' }}>You&apos;ll Need</h2>
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
          <h2 className="text-base font-bold mb-3" style={{ color: 'var(--text-primary)' }}>Instructions</h2>
          <div className="space-y-3">
            {recipe.instructions.map((step, i) => (
              <button
                key={i}
                className="glass-card rounded-2xl p-4 flex gap-3 w-full text-left transition-all duration-200 no-print"
                onClick={() => toggleStep(i)}
                style={{ opacity: checkedSteps.has(i) ? 0.6 : 1 }}
              >
                <div
                  className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-all duration-200"
                  style={{
                    background: checkedSteps.has(i) ? 'var(--success)' : 'var(--gradient-brand)',
                    color: 'white',
                    minWidth: '28px',
                  }}
                >
                  {checkedSteps.has(i) ? <Check size={13} strokeWidth={2.5} /> : i + 1}
                </div>
                <p
                  className="text-sm leading-relaxed flex-1"
                  style={{
                    color: 'var(--text-primary)',
                    textDecoration: checkedSteps.has(i) ? 'line-through' : 'none',
                  }}
                >
                  {step}
                </p>
              </button>
            ))}
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

        {/* Bottom action buttons */}
        <div className="flex gap-3 mb-4 no-print">
          <button
            onClick={handleDownloadPdf}
            className="btn-gradient flex-1 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
          >
            <Download size={16} /> Save as PDF
          </button>
          <button
            onClick={handleShare}
            className="flex-1 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all"
            style={{
              background: 'var(--glass-bg)',
              border: '1px solid var(--border-strong)',
              color: 'var(--text-primary)',
            }}
          >
            <Share2 size={16} /> Share
          </button>
        </div>
      </div>
    </div>
  );
}
