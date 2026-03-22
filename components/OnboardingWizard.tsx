'use client';

import { useState, useMemo } from 'react';
import { ChevronRight, ChevronLeft, Search, Check, X, Utensils, Refrigerator } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  CATEGORY_EMOJIS,
  APPLIANCE_EMOJIS,
  type InventoryCategory,
  type ApplianceCategory,
} from '@/lib/types';
import { PRESET_APPLIANCES, PRESET_FOODS } from '@/lib/onboarding-data';
import { useLanguage } from '@/contexts/LanguageContext';

interface Props {
  onClose: () => void;
  onComplete: () => void;
  isFirstTime?: boolean;
}

type Step = 'welcome' | 'appliances' | 'foods' | 'saving';

const APPLIANCE_CATEGORY_ORDER: ApplianceCategory[] = ['small_appliance', 'cooking', 'baking', 'prep'];
const FOOD_CATEGORY_ORDER: InventoryCategory[] = [
  'proteins', 'vegetables', 'fruits', 'carbs', 'dairy', 'pantry', 'spices', 'condiments',
];

export default function OnboardingWizard({ onClose, onComplete, isFirstTime = false }: Props) {
  const { t } = useLanguage();
  const [step, setStep] = useState<Step>(isFirstTime ? 'welcome' : 'appliances');
  const [selectedAppliances, setSelectedAppliances] = useState<Set<string>>(new Set());
  const [selectedFoods, setSelectedFoods] = useState<Set<string>>(new Set());
  const [applianceSearch, setApplianceSearch] = useState('');
  const [foodSearch, setFoodSearch] = useState('');
  const [error, setError] = useState('');

  const filteredAppliances = useMemo(() => {
    const q = applianceSearch.toLowerCase();
    return q ? PRESET_APPLIANCES.filter((a) => a.name.toLowerCase().includes(q)) : PRESET_APPLIANCES;
  }, [applianceSearch]);

  const filteredFoods = useMemo(() => {
    const q = foodSearch.toLowerCase();
    return q ? PRESET_FOODS.filter((f) => f.name.toLowerCase().includes(q)) : PRESET_FOODS;
  }, [foodSearch]);

  function toggleAppliance(name: string) {
    setSelectedAppliances((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  }

  function toggleFood(name: string) {
    setSelectedFoods((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  }

  function toggleAllInApplianceCategory(category: ApplianceCategory) {
    const inCat = PRESET_APPLIANCES.filter((a) => a.category === category).map((a) => a.name);
    const allSelected = inCat.every((n) => selectedAppliances.has(n));
    setSelectedAppliances((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        inCat.forEach((n) => next.delete(n));
      } else {
        inCat.forEach((n) => next.add(n));
      }
      return next;
    });
  }

  function toggleAllInFoodCategory(category: InventoryCategory) {
    const inCat = PRESET_FOODS.filter((f) => f.category === category).map((f) => f.name);
    const allSelected = inCat.every((n) => selectedFoods.has(n));
    setSelectedFoods((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        inCat.forEach((n) => next.delete(n));
      } else {
        inCat.forEach((n) => next.add(n));
      }
      return next;
    });
  }

  async function handleSave() {
    if (selectedAppliances.size === 0 && selectedFoods.size === 0) {
      onComplete();
      return;
    }
    setStep('saving');
    setError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;

      const results: { error: { message: string } | null }[] = [];

      if (selectedAppliances.size > 0) {
        const applianceRows = PRESET_APPLIANCES.filter((a) => selectedAppliances.has(a.name)).map((a) => ({
          name: a.name,
          category: a.category,
          user_id: userId,
        }));
        results.push(await supabase.from('appliances').insert(applianceRows));
      }

      if (selectedFoods.size > 0) {
        const foodRows = PRESET_FOODS.filter((f) => selectedFoods.has(f.name)).map((f) => ({
          name: f.name,
          category: f.category,
          in_stock: true,
          user_id: userId,
        }));
        results.push(await supabase.from('inventory_items').insert(foodRows));
      }

      const failed = results.find((r) => r.error);
      if (failed?.error) throw new Error(failed.error.message);

      onComplete();
    } catch {
      setError('Something went wrong saving your items. Please try again.');
      setStep('foods');
    }
  }

  const steps: Step[] = isFirstTime
    ? ['welcome', 'appliances', 'foods']
    : ['appliances', 'foods'];
  const currentIndex = steps.indexOf(step === 'saving' ? 'foods' : step);
  const progress = steps.length > 1 ? currentIndex / (steps.length - 1) : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="relative w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl flex flex-col mb-16 sm:mb-0"
        style={{
          background: 'var(--bg-surface-solid)',
          border: '1px solid var(--border-color)',
          maxHeight: '90dvh',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            {(step === 'appliances' || step === 'foods') && (
              <button
                onClick={() => {
                  if (step === 'foods') setStep('appliances');
                  else if (isFirstTime) setStep('welcome');
                  else onClose();
                }}
                className="flex items-center justify-center w-8 h-8 rounded-xl transition-all"
                style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
              >
                <ChevronLeft size={18} />
              </button>
            )}
            <div>
              <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                {step === 'welcome' && t('wiz_welcome_title')}
                {step === 'appliances' && t('wiz_appliances_title')}
                {step === 'foods' && t('wiz_foods_title')}
                {step === 'saving' && t('wiz_saving_title')}
              </h2>
              {(step === 'appliances' || step === 'foods') && (
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {step === 'appliances'
                    ? t('wiz_selected', { count: selectedAppliances.size })
                    : t('wiz_selected', { count: selectedFoods.size })}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-xl transition-all flex-shrink-0"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Progress bar */}
        {step !== 'saving' && steps.length > 1 && (
          <div className="px-5 pb-2 flex-shrink-0">
            <div className="h-1 rounded-full" style={{ background: 'var(--border-color)' }}>
              <div
                className="h-1 rounded-full transition-all duration-500"
                style={{ width: `${progress * 100}%`, background: 'var(--gradient-brand)' }}
              />
            </div>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 pb-4">
          {/* Welcome */}
          {step === 'welcome' && (
            <div className="py-6 text-center">
              <div className="text-5xl mb-4">🍽️</div>
              <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
                {t('wiz_welcome_body1')}
              </p>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {t('wiz_welcome_body2')}
              </p>
            </div>
          )}

          {/* Saving */}
          {step === 'saving' && (
            <div className="py-12 text-center">
              <div className="text-4xl mb-4 animate-pulse">⏳</div>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {t('wiz_saving_body', {
                  appliances: selectedAppliances.size,
                  appliancesPlural: selectedAppliances.size !== 1 ? 's' : '',
                  foods: selectedFoods.size,
                  foodsPlural: selectedFoods.size !== 1 ? 's' : '',
                })}
              </p>
            </div>
          )}

          {/* Appliances */}
          {step === 'appliances' && (
            <div>
              <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
                {t('wiz_appliances_sub')}
              </p>
              {/* Search */}
              <div
                className="flex items-center gap-2 rounded-xl px-3 py-2 mb-4"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-color)' }}
              >
                <Search size={14} style={{ color: 'var(--text-muted)' }} />
                <input
                  value={applianceSearch}
                  onChange={(e) => setApplianceSearch(e.target.value)}
                  placeholder={t('wiz_app_search')}
                  className="flex-1 bg-transparent text-sm outline-none"
                  style={{ color: 'var(--text-primary)' }}
                />
              </div>
              {/* Grouped list */}
              {APPLIANCE_CATEGORY_ORDER.map((cat) => {
                const items = filteredAppliances.filter((a) => a.category === cat);
                if (items.length === 0) return null;
                const allSelected = PRESET_APPLIANCES.filter((a) => a.category === cat).every((a) =>
                  selectedAppliances.has(a.name)
                );
                return (
                  <div key={cat} className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                        {APPLIANCE_EMOJIS[cat]} {t(`acat_${cat}`)}
                      </span>
                      {!applianceSearch && (
                        <button
                          onClick={() => toggleAllInApplianceCategory(cat)}
                          className="text-xs font-medium transition-colors"
                          style={{ color: allSelected ? 'var(--accent-primary)' : 'var(--text-muted)' }}
                        >
                          {allSelected ? t('wiz_deselect_all') : t('wiz_select_all')}
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {items.map((a) => {
                        const active = selectedAppliances.has(a.name);
                        return (
                          <button
                            key={a.name}
                            onClick={() => toggleAppliance(a.name)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-150 active:scale-95"
                            style={
                              active
                                ? {
                                    background: 'var(--gradient-brand)',
                                    color: 'white',
                                    border: '1px solid transparent',
                                  }
                                : {
                                    background: 'var(--bg-elevated)',
                                    color: 'var(--text-primary)',
                                    border: '1px solid var(--border-color)',
                                  }
                            }
                          >
                            {active && <Check size={12} strokeWidth={2.5} />}
                            {a.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Foods */}
          {step === 'foods' && (
            <div>
              <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
                {t('wiz_foods_sub')}
              </p>
              {/* Search */}
              <div
                className="flex items-center gap-2 rounded-xl px-3 py-2 mb-4"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-color)' }}
              >
                <Search size={14} style={{ color: 'var(--text-muted)' }} />
                <input
                  value={foodSearch}
                  onChange={(e) => setFoodSearch(e.target.value)}
                  placeholder={t('wiz_food_search')}
                  className="flex-1 bg-transparent text-sm outline-none"
                  style={{ color: 'var(--text-primary)' }}
                />
              </div>
              {FOOD_CATEGORY_ORDER.map((cat) => {
                const items = filteredFoods.filter((f) => f.category === cat);
                if (items.length === 0) return null;
                const allSelected = PRESET_FOODS.filter((f) => f.category === cat).every((f) =>
                  selectedFoods.has(f.name)
                );
                return (
                  <div key={cat} className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                        {CATEGORY_EMOJIS[cat]} {t(`cat_${cat}`)}
                      </span>
                      {!foodSearch && (
                        <button
                          onClick={() => toggleAllInFoodCategory(cat)}
                          className="text-xs font-medium transition-colors"
                          style={{ color: allSelected ? 'var(--accent-primary)' : 'var(--text-muted)' }}
                        >
                          {allSelected ? t('wiz_deselect_all') : t('wiz_select_all')}
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {items.map((f) => {
                        const active = selectedFoods.has(f.name);
                        return (
                          <button
                            key={f.name}
                            onClick={() => toggleFood(f.name)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-150 active:scale-95"
                            style={
                              active
                                ? {
                                    background: 'var(--gradient-brand)',
                                    color: 'white',
                                    border: '1px solid transparent',
                                  }
                                : {
                                    background: 'var(--bg-elevated)',
                                    color: 'var(--text-primary)',
                                    border: '1px solid var(--border-color)',
                                  }
                            }
                          >
                            {active && <Check size={12} strokeWidth={2.5} />}
                            {f.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {error && (
            <p className="text-sm text-red-500 mt-2 text-center">{t('wiz_error')}</p>
          )}
        </div>

        {/* Footer */}
        {step !== 'saving' && (
          <div className="px-5 pb-6 pt-3 flex-shrink-0" style={{ borderTop: '1px solid var(--border-color)' }}>
            {step === 'welcome' && (
              <button
                onClick={() => setStep('appliances')}
                className="btn-gradient w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold text-sm"
              >
                <Utensils size={16} />
                {t('wiz_get_started')}
                <ChevronRight size={16} />
              </button>
            )}
            {step === 'appliances' && (
              <div className="flex gap-3">
                <button
                  onClick={() => setStep('foods')}
                  className="text-sm font-medium py-3 px-4 rounded-2xl transition-all"
                  style={{ color: 'var(--text-secondary)', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)' }}
                >
                  {t('wiz_skip')}
                </button>
                <button
                  onClick={() => setStep('foods')}
                  className="btn-gradient flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold text-sm"
                >
                  {t('wiz_next_pantry')}
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
            {step === 'foods' && (
              <div className="flex gap-3">
                <button
                  onClick={handleSave}
                  className="text-sm font-medium py-3 px-4 rounded-2xl transition-all"
                  style={{ color: 'var(--text-secondary)', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)' }}
                >
                  {t('wiz_skip')}
                </button>
                <button
                  onClick={handleSave}
                  className="btn-gradient flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold text-sm"
                >
                  <Refrigerator size={16} />
                  {selectedAppliances.size + selectedFoods.size > 0
                    ? t('wiz_add_items', { count: selectedAppliances.size + selectedFoods.size })
                    : t('wiz_finish_setup')}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
