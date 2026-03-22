'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Refrigerator, Utensils, BookOpen, Sparkles, TrendingUp, ChevronRight, LogOut, Wand2, LayoutList } from 'lucide-react';
import Logo from '@/components/Logo';
import ThemeToggle from '@/components/ThemeToggle';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import OnboardingWizard from '@/components/OnboardingWizard';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

interface Stats {
  inventoryCount: number;
  inStockCount: number;
  applianceCount: number;
  recipeCount: number;
}

export default function HomePage() {
  const { signOut } = useAuth();
  const { t } = useLanguage();
  const [stats, setStats] = useState<Stats>({
    inventoryCount: 0,
    inStockCount: 0,
    applianceCount: 0,
    recipeCount: 0,
  });
  const [recentRecipes, setRecentRecipes] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardIsFirstTime, setWizardIsFirstTime] = useState(false);

  async function fetchStats() {
    try {
      const [inventoryRes, applianceRes, recipeRes, recentRes] = await Promise.all([
        supabase.from('inventory_items').select('id, in_stock'),
        supabase.from('appliances').select('id', { count: 'exact', head: true }),
        supabase.from('recipes').select('id', { count: 'exact', head: true }),
        supabase.from('recipes').select('id, name, created_at').order('created_at', { ascending: false }).limit(3),
      ]);
      const items = inventoryRes.data || [];
      const nextStats = {
        inventoryCount: items.length,
        inStockCount: items.filter((i) => i.in_stock).length,
        applianceCount: applianceRes.count || 0,
        recipeCount: recipeRes.count || 0,
      };
      setStats(nextStats);
      setRecentRecipes(recentRes.data || []);
      return nextStats;
    } catch {
      // Supabase not configured yet
      return null;
    }
  }

  useEffect(() => {
    async function init() {
      try {
        const nextStats = await fetchStats();
        if (nextStats && nextStats.inventoryCount === 0 && nextStats.applianceCount === 0) {
          setWizardIsFirstTime(true);
          setWizardOpen(true);
        }
      } finally {
        setLoading(false);
      }
    }
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statCards = [
    { label: t('home_in_stock'), value: loading ? '—' : stats.inStockCount, sub: t('home_of_items', { count: stats.inventoryCount }), icon: Refrigerator, href: '/inventory', color: '#ec4899' },
    { label: t('nav_tools'), value: loading ? '—' : stats.applianceCount, sub: t('home_kitchen_tools'), icon: Utensils, href: '/appliances', color: '#8b5cf6' },
    { label: t('nav_recipes'), value: loading ? '—' : stats.recipeCount, sub: t('home_saved_meals'), icon: BookOpen, href: '/recipes', color: '#fb923c' },
  ];

  return (
    <div className="page-content max-w-lg mx-auto px-4 pt-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <Logo size={44} showText />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <LanguageSwitcher />
          <button
            onClick={signOut}
            className="flex items-center justify-center w-9 h-9 rounded-xl transition-all"
            style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-muted)' }}
            title={t('home_sign_out')}
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>

      {/* Hero CTA */}
      <Link href="/generate">
        <div
          className="relative rounded-3xl p-6 mb-6 overflow-hidden cursor-pointer group transition-transform duration-200 hover:scale-[1.01] active:scale-[0.99]"
          style={{ background: 'var(--gradient-brand)', boxShadow: '0 8px 32px rgba(236, 72, 153, 0.35)' }}
        >
          <div
            className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity duration-300"
            style={{ background: 'radial-gradient(circle at 80% 20%, white, transparent 60%)' }}
          />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={18} color="rgba(255,255,255,0.9)" strokeWidth={2} />
              <span className="text-xs font-semibold text-white/80 uppercase tracking-widest">{t('home_ai_label')}</span>
            </div>
            <h2 className="text-2xl font-bold text-white mb-1">{t('home_hero_heading')}</h2>
            <p className="text-white/75 text-sm mb-4">{t('home_hero_sub')}</p>
            <div
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold"
              style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}
            >
              {t('home_hero_btn')} <ChevronRight size={15} />
            </div>
          </div>
          <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full opacity-10" style={{ background: 'white' }} />
          <div className="absolute -right-4 bottom-4 w-20 h-20 rounded-full opacity-10" style={{ background: 'white' }} />
        </div>
      </Link>

      {/* Inspire Me card */}
      <Link href="/inspire">
        <div
          className="relative rounded-3xl p-5 mb-6 overflow-hidden cursor-pointer group transition-transform duration-200 hover:scale-[1.01] active:scale-[0.99]"
          style={{
            background: 'var(--glass-bg)',
            border: '1px solid var(--border-color)',
            boxShadow: '0 4px 16px rgba(139,92,246,0.12)',
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="flex items-center justify-center w-10 h-10 rounded-xl flex-shrink-0"
                style={{ background: 'rgba(139,92,246,0.12)' }}
              >
                <Wand2 size={20} style={{ color: 'var(--accent-secondary)' }} strokeWidth={1.8} />
              </div>
              <div>
                <div className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{t('home_inspire_title')}</div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {t('home_inspire_sub')}
                </div>
              </div>
            </div>
            <ChevronRight size={18} style={{ color: 'var(--text-muted)' }} />
          </div>
        </div>
      </Link>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {statCards.map(({ label, value, sub, icon: Icon, href, color }) => (
          <Link key={href} href={href}>
            <div className="glass-card rounded-2xl p-3 flex flex-col items-center text-center gap-1 cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95">
              <div className="flex items-center justify-center w-9 h-9 rounded-xl mb-0.5" style={{ background: `${color}1a` }}>
                <Icon size={18} style={{ color }} strokeWidth={1.8} />
              </div>
              <span className="text-xl font-bold" style={{ color }}>{value}</span>
              <span className="text-xs font-medium leading-tight" style={{ color: 'var(--text-primary)' }}>{label}</span>
              <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>{sub}</span>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <div className="mb-6">
        <h3 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
          {t('home_quick_actions')}
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <Link href="/inventory">
            <div className="glass-card rounded-2xl p-4 flex items-center gap-3 cursor-pointer transition-all duration-200 hover:scale-[1.02] active:scale-95">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl flex-shrink-0" style={{ background: 'rgba(236, 72, 153, 0.12)' }}>
                <Refrigerator size={20} style={{ color: 'var(--accent-primary)' }} strokeWidth={1.8} />
              </div>
              <div>
                <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t('home_update_pantry')}</div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('home_update_pantry_sub')}</div>
              </div>
            </div>
          </Link>
          <Link href="/recipes">
            <div className="glass-card rounded-2xl p-4 flex items-center gap-3 cursor-pointer transition-all duration-200 hover:scale-[1.02] active:scale-95">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl flex-shrink-0" style={{ background: 'rgba(139, 92, 246, 0.12)' }}>
                <BookOpen size={20} style={{ color: 'var(--accent-secondary)' }} strokeWidth={1.8} />
              </div>
              <div>
                <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t('home_my_recipes')}</div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('home_my_recipes_sub')}</div>
              </div>
            </div>
          </Link>
          <button
            onClick={() => { setWizardIsFirstTime(false); setWizardOpen(true); }}
            className="glass-card rounded-2xl p-4 flex items-center gap-3 cursor-pointer transition-all duration-200 hover:scale-[1.02] active:scale-95 col-span-2 text-left w-full"
          >
            <div className="flex items-center justify-center w-10 h-10 rounded-xl flex-shrink-0" style={{ background: 'rgba(251, 146, 60, 0.12)' }}>
              <LayoutList size={20} style={{ color: 'var(--accent-tertiary)' }} strokeWidth={1.8} />
            </div>
            <div>
              <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t('home_quick_setup')}</div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('home_quick_setup_sub')}</div>
            </div>
          </button>
        </div>
      </div>

      {/* Recent recipes */}
      {recentRecipes.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              {t('home_recent_recipes')}
            </h3>
            <Link href="/recipes">
              <span className="text-xs font-medium" style={{ color: 'var(--accent-primary)' }}>{t('home_view_all')}</span>
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            {recentRecipes.map((recipe) => (
              <Link key={recipe.id} href={`/recipes/${recipe.id}`} className="block">
                <div className="glass-card rounded-xl px-4 py-3 flex items-center justify-between cursor-pointer hover:scale-[1.01] active:scale-95 transition-all duration-200">
                  <div className="flex items-center gap-3">
                    <TrendingUp size={15} style={{ color: 'var(--accent-tertiary)' }} strokeWidth={1.8} />
                    <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{recipe.name}</span>
                  </div>
                  <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Wizard */}
      {wizardOpen && (
        <OnboardingWizard
          isFirstTime={wizardIsFirstTime}
          onClose={() => setWizardOpen(false)}
          onComplete={async () => {
            setWizardOpen(false);
            await fetchStats();
          }}
        />
      )}
    </div>
  );
}
