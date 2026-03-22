'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Refrigerator, Utensils, BookOpen, Sparkles, TrendingUp, ChevronRight, LogOut } from 'lucide-react';
import Logo from '@/components/Logo';
import ThemeToggle from '@/components/ThemeToggle';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface Stats {
  inventoryCount: number;
  inStockCount: number;
  applianceCount: number;
  recipeCount: number;
}

export default function HomePage() {
  const { signOut } = useAuth();
  const [stats, setStats] = useState<Stats>({
    inventoryCount: 0,
    inStockCount: 0,
    applianceCount: 0,
    recipeCount: 0,
  });
  const [recentRecipes, setRecentRecipes] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [inventoryRes, applianceRes, recipeRes, recentRes] = await Promise.all([
          supabase.from('inventory_items').select('id, in_stock'),
          supabase.from('appliances').select('id', { count: 'exact', head: true }),
          supabase.from('recipes').select('id', { count: 'exact', head: true }),
          supabase.from('recipes').select('id, name, created_at').order('created_at', { ascending: false }).limit(3),
        ]);
        const items = inventoryRes.data || [];
        setStats({
          inventoryCount: items.length,
          inStockCount: items.filter((i) => i.in_stock).length,
          applianceCount: applianceRes.count || 0,
          recipeCount: recipeRes.count || 0,
        });
        setRecentRecipes(recentRes.data || []);
      } catch {
        // Supabase not configured yet
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  const statCards = [
    { label: 'In Stock', value: loading ? '—' : stats.inStockCount, sub: `of ${stats.inventoryCount} items`, icon: Refrigerator, href: '/inventory', color: '#ec4899' },
    { label: 'Appliances', value: loading ? '—' : stats.applianceCount, sub: 'kitchen tools', icon: Utensils, href: '/appliances', color: '#8b5cf6' },
    { label: 'Recipes', value: loading ? '—' : stats.recipeCount, sub: 'saved meals', icon: BookOpen, href: '/recipes', color: '#fb923c' },
  ];

  return (
    <div className="page-content max-w-lg mx-auto px-4 pt-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <Logo size={44} showText />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={signOut}
            className="flex items-center justify-center w-9 h-9 rounded-xl transition-all"
            style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-muted)' }}
            title="Sign out"
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
              <span className="text-xs font-semibold text-white/80 uppercase tracking-widest">AI Recipe Magic</span>
            </div>
            <h2 className="text-2xl font-bold text-white mb-1">What&apos;s for dinner?</h2>
            <p className="text-white/75 text-sm mb-4">Generate a recipe from what&apos;s in your kitchen right now.</p>
            <div
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold"
              style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}
            >
              Generate Recipe <ChevronRight size={15} />
            </div>
          </div>
          <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full opacity-10" style={{ background: 'white' }} />
          <div className="absolute -right-4 bottom-4 w-20 h-20 rounded-full opacity-10" style={{ background: 'white' }} />
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
          Quick Actions
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <Link href="/inventory">
            <div className="glass-card rounded-2xl p-4 flex items-center gap-3 cursor-pointer transition-all duration-200 hover:scale-[1.02] active:scale-95">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl flex-shrink-0" style={{ background: 'rgba(236, 72, 153, 0.12)' }}>
                <Refrigerator size={20} style={{ color: 'var(--accent-primary)' }} strokeWidth={1.8} />
              </div>
              <div>
                <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Update Pantry</div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Add or edit items</div>
              </div>
            </div>
          </Link>
          <Link href="/recipes">
            <div className="glass-card rounded-2xl p-4 flex items-center gap-3 cursor-pointer transition-all duration-200 hover:scale-[1.02] active:scale-95">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl flex-shrink-0" style={{ background: 'rgba(139, 92, 246, 0.12)' }}>
                <BookOpen size={20} style={{ color: 'var(--accent-secondary)' }} strokeWidth={1.8} />
              </div>
              <div>
                <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>My Recipes</div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Browse saved meals</div>
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* Recent recipes */}
      {recentRecipes.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              Recent Recipes
            </h3>
            <Link href="/recipes">
              <span className="text-xs font-medium" style={{ color: 'var(--accent-primary)' }}>View all →</span>
            </Link>
          </div>
          <div className="space-y-2">
            {recentRecipes.map((recipe) => (
              <Link key={recipe.id} href={`/recipes/${recipe.id}`}>
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

      {/* Welcome banner if empty */}
      {!loading && stats.inventoryCount === 0 && stats.applianceCount === 0 && (
        <div className="glass-card rounded-2xl p-5 mt-4 text-center" style={{ border: '1px solid rgba(251, 146, 60, 0.25)' }}>
          <span className="text-3xl block mb-2">👩‍🍳</span>
          <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Welcome to Thay&apos;s Kitchen!</p>
          <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
            Start by adding items to your pantry, then let AI generate recipes from what you have.
          </p>
          <Link href="/inventory">
            <button className="btn-gradient text-sm font-semibold px-5 py-2 rounded-full">
              Add Your First Items
            </button>
          </Link>
        </div>
      )}
    </div>
  );
}
