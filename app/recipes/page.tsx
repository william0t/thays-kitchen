'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { BookOpen, Clock, Users, Sparkles, Search, ChevronRight, Trash2 } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { supabase } from '@/lib/supabase';
import { Recipe } from '@/lib/types';

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchRecipes = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('recipes')
        .select('*')
        .order('created_at', { ascending: false });
      setRecipes(data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRecipes(); }, [fetchRecipes]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    await supabase.from('recipes').delete().eq('id', id);
    setRecipes((prev) => prev.filter((r) => r.id !== id));
  };

  const filtered = recipes.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.description?.toLowerCase().includes(search.toLowerCase()) ||
    r.tags?.some((t) => t.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="page-content max-w-lg mx-auto px-4 pt-10">
      <PageHeader
        title="Recipes"
        subtitle={`${recipes.length} saved recipe${recipes.length !== 1 ? 's' : ''}`}
      />

      {/* Search */}
      <div className="relative mb-5">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
        <input
          className="input-field w-full pl-9 pr-3 py-2.5 rounded-xl text-sm"
          placeholder="Search recipes…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="loading-shimmer h-28 rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <BookOpen size={40} className="mx-auto mb-3 opacity-30" style={{ color: 'var(--text-muted)' }} />
          <p className="text-sm mb-1" style={{ color: 'var(--text-muted)' }}>
            {search ? 'No recipes match your search.' : 'No recipes yet!'}
          </p>
          {!search && (
            <p className="text-xs mb-5" style={{ color: 'var(--text-muted)' }}>
              Generate one with AI using your pantry ingredients.
            </p>
          )}
          {!search && (
            <Link href="/generate">
              <button className="btn-gradient px-5 py-2.5 rounded-full text-sm font-semibold flex items-center gap-2 mx-auto">
                <Sparkles size={15} /> Generate Recipe
              </button>
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3 animate-fade-in">
          {filtered.map((recipe) => (
            <Link key={recipe.id} href={`/recipes/${recipe.id}`}>
              <div className="glass-card rounded-2xl p-4 flex flex-col gap-3 cursor-pointer hover:scale-[1.01] active:scale-[0.99] transition-all duration-200">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="text-base font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>
                        {recipe.name}
                      </h3>
                      {recipe.ai_generated && (
                        <span
                          className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-medium flex-shrink-0"
                          style={{ background: 'rgba(139, 92, 246, 0.12)', color: 'var(--accent-secondary)' }}
                        >
                          <Sparkles size={10} /> AI
                        </span>
                      )}
                    </div>
                    {recipe.description && (
                      <p
                        className="text-xs leading-relaxed line-clamp-2"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        {recipe.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={(e) => handleDelete(e, recipe.id)}
                      className="p-2 rounded-xl transition-all hover:scale-110"
                      style={{ color: 'var(--danger)' }}
                    >
                      <Trash2 size={15} />
                    </button>
                    <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
                  </div>
                </div>

                {/* Meta */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <Clock size={13} style={{ color: 'var(--text-muted)' }} />
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {(recipe.prep_time || 0) + (recipe.cook_time || 0)} min
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users size={13} style={{ color: 'var(--text-muted)' }} />
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {recipe.servings} servings
                    </span>
                  </div>
                  {recipe.tags && recipe.tags.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap">
                      {recipe.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 rounded-full text-xs"
                          style={{ background: 'rgba(236, 72, 153, 0.1)', color: 'var(--accent-primary)' }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
