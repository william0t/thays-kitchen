'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useCallback } from 'react';
import { Plus, X, Edit2, Trash2, Utensils } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { supabase } from '@/lib/supabase';
import {
  Appliance,
  ApplianceCategory,
  APPLIANCE_CATEGORY_LABELS,
  APPLIANCE_EMOJIS,
} from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

const CATEGORIES = Object.keys(APPLIANCE_CATEGORY_LABELS) as ApplianceCategory[];

interface FormData {
  name: string;
  category: ApplianceCategory;
  notes: string;
}

const defaultForm: FormData = { name: '', category: 'cooking', notes: '' };

export default function AppliancesPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [items, setItems] = useState<Appliance[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Appliance | null>(null);
  const [form, setForm] = useState<FormData>(defaultForm);
  const [saving, setSaving] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('appliances')
        .select('*')
        .order('category')
        .order('name');
      setItems(data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const openAdd = () => {
    setEditingItem(null);
    setForm(defaultForm);
    setShowModal(true);
  };

  const openEdit = (item: Appliance) => {
    setEditingItem(item);
    setForm({ name: item.name, category: item.category, notes: item.notes || '' });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const payload = { name: form.name.trim(), category: form.category, notes: form.notes.trim() || null, user_id: user?.id };
      if (editingItem) {
        await supabase.from('appliances').update(payload).eq('id', editingItem.id);
      } else {
        await supabase.from('appliances').insert(payload);
      }
      setShowModal(false);
      fetchItems();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from('appliances').delete().eq('id', id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  // Group by category
  const grouped: Partial<Record<ApplianceCategory, Appliance[]>> = {};
  items.forEach((item) => {
    if (!grouped[item.category]) grouped[item.category] = [];
    grouped[item.category]!.push(item);
  });

  const categoryColors: Record<ApplianceCategory, string> = {
    cooking: '#ec4899',
    baking: '#f97316',
    prep: '#8b5cf6',
    small_appliance: '#fbbf24',
    other: '#6b7280',
  };

  return (
    <div className="page-content max-w-lg mx-auto px-4 pt-10">
      <PageHeader
        title={t('app_title')}
        subtitle={t('app_subtitle', { count: items.length })}
        action={
          <button onClick={openAdd} className="btn-gradient flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold">
            <Plus size={16} /> {t('app_add')}
          </button>
        }
      />

      {loading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => <div key={i} className="loading-shimmer h-16 rounded-xl" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16">
          <Utensils size={40} className="mx-auto mb-3 opacity-30" style={{ color: 'var(--text-muted)' }} />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{t('app_empty')}</p>
        </div>
      ) : (
        <div className="space-y-5 animate-fade-in">
          {CATEGORIES.filter((cat) => grouped[cat]?.length).map((cat) => (
            <div key={cat}>
              <div className="flex items-center gap-2 mb-2">
                <span>{APPLIANCE_EMOJIS[cat]}</span>
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  {t(`acat_${cat}`)}
                </span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>({grouped[cat]!.length})</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {grouped[cat]!.map((item) => (
                  <div key={item.id} className="glass-card rounded-xl p-3 flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-1">
                      <div
                        className="flex items-center justify-center w-9 h-9 rounded-xl flex-shrink-0"
                        style={{ background: `${categoryColors[item.category]}1a` }}
                      >
                        <span className="text-lg">{APPLIANCE_EMOJIS[item.category]}</span>
                      </div>
                      <div className="flex gap-0.5 flex-shrink-0">
                        <button onClick={() => openEdit(item)} className="p-1 rounded-lg" style={{ color: 'var(--text-muted)' }}>
                          <Edit2 size={13} />
                        </button>
                        <button onClick={() => handleDelete(item.id)} className="p-1 rounded-lg" style={{ color: 'var(--danger)' }}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>{item.name}</div>
                      {item.notes && <div className="text-xs mt-0.5 leading-tight" style={{ color: 'var(--text-muted)' }}>{item.notes}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center modal-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div
            className="w-full max-w-lg rounded-t-3xl p-6 pb-28 animate-slide-up"
            style={{ background: 'var(--bg-surface-solid)', border: '1px solid var(--border-color)', maxHeight: '92vh', overflowY: 'auto' }}
          >
            <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: 'var(--border-strong)' }} />
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                {editingItem ? t('app_edit_tool') : t('app_add_tool')}
              </h2>
              <button onClick={() => setShowModal(false)} style={{ color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>
            <button
              onClick={handleSave}
              disabled={saving || !form.name.trim()}
              className="btn-gradient w-full py-3 rounded-xl font-semibold disabled:opacity-50 mb-4"
            >
              {saving ? t('app_saving') : editingItem ? t('app_save_changes') : t('app_add_tool')}
            </button>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-muted)' }}>{t('app_name_label')}</label>
                <input
                  className="input-field w-full px-3 py-2.5 rounded-xl text-sm"
                  placeholder={t('app_name_placeholder')}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-muted)' }}>{t('app_category_label')}</label>
                <div className="grid grid-cols-2 gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setForm({ ...form, category: cat })}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-left transition-all"
                      style={{
                        background: form.category === cat ? `${categoryColors[cat]}15` : 'var(--glass-bg)',
                        border: `1px solid ${form.category === cat ? `${categoryColors[cat]}50` : 'var(--border-color)'}`,
                        color: form.category === cat ? categoryColors[cat] : 'var(--text-primary)',
                        fontWeight: form.category === cat ? 600 : 400,
                      }}
                    >
                      <span>{APPLIANCE_EMOJIS[cat]}</span>
                      <span>{t(`acat_${cat}`)}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-muted)' }}>{t('app_notes_label')}</label>
                <input
                  className="input-field w-full px-3 py-2.5 rounded-xl text-sm"
                  placeholder={t('app_notes_placeholder')}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
