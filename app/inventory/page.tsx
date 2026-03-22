'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useCallback } from 'react';
import { Plus, Search, Check, X, Edit2, Trash2, Package, Filter } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { supabase } from '@/lib/supabase';
import {
  InventoryItem,
  InventoryCategory,
  CATEGORY_LABELS,
  CATEGORY_EMOJIS,
  COMMON_UNITS,
} from '@/lib/types';

const CATEGORIES = Object.keys(CATEGORY_LABELS) as InventoryCategory[];

interface FormData {
  name: string;
  category: InventoryCategory;
  quantity: string;
  unit: string;
  notes: string;
  in_stock: boolean;
}

const defaultForm: FormData = {
  name: '',
  category: 'pantry',
  quantity: '',
  unit: 'count',
  notes: '',
  in_stock: true,
};

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<InventoryCategory | 'all'>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [form, setForm] = useState<FormData>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('inventory_items')
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

  const openEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setForm({
      name: item.name,
      category: item.category,
      quantity: item.quantity?.toString() || '',
      unit: item.unit || 'count',
      notes: item.notes || '',
      in_stock: item.in_stock,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        category: form.category,
        quantity: form.quantity ? parseFloat(form.quantity) : null,
        unit: form.unit || null,
        notes: form.notes.trim() || null,
        in_stock: form.in_stock,
      };

      if (editingItem) {
        await supabase.from('inventory_items').update(payload).eq('id', editingItem.id);
      } else {
        await supabase.from('inventory_items').insert(payload);
      }
      setShowModal(false);
      fetchItems();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from('inventory_items').delete().eq('id', id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const toggleStock = async (item: InventoryItem) => {
    await supabase.from('inventory_items').update({ in_stock: !item.in_stock }).eq('id', item.id);
    setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, in_stock: !i.in_stock } : i));
  };

  const filtered = items.filter((item) => {
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchCategory = filterCategory === 'all' || item.category === filterCategory;
    return matchSearch && matchCategory;
  });

  // Group by category
  const grouped: Partial<Record<InventoryCategory, InventoryItem[]>> = {};
  filtered.forEach((item) => {
    if (!grouped[item.category]) grouped[item.category] = [];
    grouped[item.category]!.push(item);
  });

  const inStockCount = items.filter((i) => i.in_stock).length;

  return (
    <div className="page-content max-w-lg mx-auto px-4 pt-10">
      <PageHeader
        title="Pantry"
        subtitle={`${inStockCount} of ${items.length} items in stock`}
        action={
          <button onClick={openAdd} className="btn-gradient flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold">
            <Plus size={16} /> Add
          </button>
        }
      />

      {/* Search & Filter */}
      <div className="flex gap-2 mb-4">
        <div className="flex-1 relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input
            className="input-field w-full pl-9 pr-3 py-2.5 rounded-xl text-sm"
            placeholder="Search ingredients…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center justify-center w-10 h-10 rounded-xl transition-all"
          style={{
            background: showFilters ? 'rgba(139, 92, 246, 0.15)' : 'var(--glass-bg)',
            border: '1px solid var(--glass-border)',
            color: showFilters ? 'var(--accent-secondary)' : 'var(--text-muted)',
          }}
        >
          <Filter size={16} />
        </button>
      </div>

      {/* Category filter pills */}
      {showFilters && (
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1 animate-fade-in" style={{ scrollbarWidth: 'none' }}>
          <button
            onClick={() => setFilterCategory('all')}
            className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
            style={{
              background: filterCategory === 'all' ? 'var(--accent-primary)' : 'var(--glass-bg)',
              color: filterCategory === 'all' ? 'white' : 'var(--text-muted)',
              border: '1px solid var(--glass-border)',
            }}
          >
            All
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
              style={{
                background: filterCategory === cat ? 'var(--accent-primary)' : 'var(--glass-bg)',
                color: filterCategory === cat ? 'white' : 'var(--text-muted)',
                border: '1px solid var(--glass-border)',
              }}
            >
              {CATEGORY_EMOJIS[cat]} {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>
      )}

      {/* Items list */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="loading-shimmer h-16 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Package size={40} className="mx-auto mb-3 opacity-30" style={{ color: 'var(--text-muted)' }} />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {search ? 'No items match your search.' : 'No items yet. Add your first ingredient!'}
          </p>
        </div>
      ) : (
        <div className="space-y-5 animate-fade-in">
          {(CATEGORIES).filter((cat) => grouped[cat]?.length).map((cat) => (
            <div key={cat}>
              <div className="flex items-center gap-2 mb-2">
                <span>{CATEGORY_EMOJIS[cat]}</span>
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  {CATEGORY_LABELS[cat]}
                </span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  ({grouped[cat]!.length})
                </span>
              </div>
              <div className="space-y-2">
                {grouped[cat]!.map((item) => (
                  <div
                    key={item.id}
                    className="glass-card rounded-xl px-4 py-3 flex items-center gap-3"
                    style={{ opacity: item.in_stock ? 1 : 0.55 }}
                  >
                    {/* Stock toggle */}
                    <button
                      onClick={() => toggleStock(item)}
                      className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full border-2 transition-all duration-200"
                      style={{
                        borderColor: item.in_stock ? 'var(--success)' : 'var(--border-strong)',
                        background: item.in_stock ? 'var(--success)' : 'transparent',
                      }}
                    >
                      {item.in_stock && <Check size={12} color="white" strokeWidth={3} />}
                    </button>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="text-sm font-medium truncate"
                          style={{
                            color: 'var(--text-primary)',
                            textDecoration: item.in_stock ? 'none' : 'line-through',
                          }}
                        >
                          {item.name}
                        </span>
                        {!item.in_stock && (
                          <span className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0"
                            style={{ background: 'rgba(239,68,68,0.12)', color: 'var(--danger)', fontSize: '10px' }}>
                            Out
                          </span>
                        )}
                      </div>
                      {(item.quantity || item.unit) && (
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {item.quantity} {item.unit}
                          {item.notes && ` · ${item.notes}`}
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => openEdit(item)}
                        className="p-1.5 rounded-lg transition-all hover:scale-110"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 rounded-lg transition-all hover:scale-110"
                        style={{ color: 'var(--danger)' }}
                      >
                        <Trash2 size={14} />
                      </button>
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
          className="fixed inset-0 z-[60] flex items-end justify-center modal-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div
            className="w-full max-w-lg rounded-t-3xl p-6 animate-slide-up"
            style={{ background: 'var(--bg-surface-solid)', border: '1px solid var(--border-color)', maxHeight: '92vh', overflowY: 'auto' }}
          >
            {/* Handle */}
            <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: 'var(--border-strong)' }} />

            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                {editingItem ? 'Edit Item' : 'Add Item'}
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
              {saving ? 'Saving…' : editingItem ? 'Save Changes' : 'Add Item'}
            </button>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Name *</label>
                <input
                  className="input-field w-full px-3 py-2.5 rounded-xl text-sm"
                  placeholder="e.g. Chicken breast"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Category</label>
                <div className="grid grid-cols-2 gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setForm({ ...form, category: cat })}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-left transition-all"
                      style={{
                        background: form.category === cat ? 'rgba(236, 72, 153, 0.12)' : 'var(--glass-bg)',
                        border: `1px solid ${form.category === cat ? 'rgba(236, 72, 153, 0.4)' : 'var(--border-color)'}`,
                        color: form.category === cat ? 'var(--accent-primary)' : 'var(--text-primary)',
                        fontWeight: form.category === cat ? 600 : 400,
                      }}
                    >
                      <span>{CATEGORY_EMOJIS[cat]}</span>
                      <span className="truncate">{CATEGORY_LABELS[cat]}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Quantity</label>
                  <input
                    className="input-field w-full px-3 py-2.5 rounded-xl text-sm"
                    type="number"
                    placeholder="e.g. 2"
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Unit</label>
                  <select
                    className="input-field w-full px-3 py-2.5 rounded-xl text-sm"
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  >
                    {COMMON_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Notes</label>
                <input
                  className="input-field w-full px-3 py-2.5 rounded-xl text-sm"
                  placeholder="e.g. Organic, from Costco…"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>

              <div className="flex items-center justify-between px-1">
                <div>
                  <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>In Stock</div>
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Do you currently have this?</div>
                </div>
                <button
                  onClick={() => setForm({ ...form, in_stock: !form.in_stock })}
                  className="relative w-12 h-6 rounded-full transition-all duration-200"
                  style={{ background: form.in_stock ? 'var(--success)' : 'var(--border-strong)' }}
                >
                  <div
                    className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200"
                    style={{ left: form.in_stock ? '26px' : '2px' }}
                  />
                </button>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
