'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, MicOff, X, Check, Trash2, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/contexts/LanguageContext';
import { InventoryCategory } from '@/lib/types';

interface ParsedItem {
  name: string;
  category: InventoryCategory;
  kept: boolean;
}

type Stage = 'idle' | 'listening' | 'processing' | 'review' | 'saving' | 'done';

interface VoiceAddModalProps {
  onClose: () => void;
  onAdded: () => void;
  userId: string | undefined;
}

export default function VoiceAddModal({ onClose, onAdded, userId }: VoiceAddModalProps) {
  const { t } = useLanguage();
  const [stage, setStage] = useState<Stage>('idle');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [items, setItems] = useState<ParsedItem[]>([]);
  const [addedCount, setAddedCount] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const isSupported = typeof window !== 'undefined' &&
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  const stopRecognition = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
  }, []);

  useEffect(() => () => stopRecognition(), [stopRecognition]);

  const processTranscript = useCallback(async (text: string) => {
    if (!text.trim()) {
      setErrorMsg(t('voice_no_items'));
      setStage('idle');
      return;
    }
    setStage('processing');
    try {
      const res = await fetch('/api/voice-parse-foods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: text }),
      });
      const data = await res.json();
      const parsed: ParsedItem[] = (data.items || []).map((item: { name: string; category: InventoryCategory }) => ({
        ...item,
        kept: true,
      }));
      if (parsed.length === 0) {
        setErrorMsg(t('voice_no_items'));
        setStage('idle');
      } else {
        setItems(parsed);
        setStage('review');
      }
    } catch {
      setErrorMsg(t('voice_error'));
      setStage('idle');
    }
  }, [t]);

  const startListening = () => {
    setErrorMsg('');
    setInterimTranscript('');
    setFinalTranscript('');

    if (!isSupported) {
      setErrorMsg(t('voice_not_supported'));
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any;
    const SR = win.SpeechRecognition || win.webkitSpeechRecognition;
    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = navigator.language || 'en-US';
    recognitionRef.current = recognition;

    let collected = '';

    recognition.onstart = () => setStage('listening');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }
      collected += final;
      setFinalTranscript(collected);
      setInterimTranscript(interim);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (event: any) => {
      if (event.error !== 'aborted') {
        setErrorMsg(t('voice_error'));
      }
      setStage('idle');
      recognitionRef.current = null;
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      const text = collected || finalTranscript;
      if (text.trim()) {
        processTranscript(text);
      } else {
        setErrorMsg(t('voice_error'));
        setStage('idle');
      }
    };

    recognition.start();
  };

  const handleStop = () => {
    stopRecognition();
  };

  const toggleItem = (idx: number) => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, kept: !item.kept } : item));
  };

  const handleAddToPantry = async () => {
    const toAdd = items.filter(i => i.kept);
    if (toAdd.length === 0) return;
    setStage('saving');
    try {
      const rows = toAdd.map(item => ({
        name: item.name,
        category: item.category,
        in_stock: true,
        user_id: userId,
        quantity: null,
        unit: null,
        notes: null,
      }));
      await supabase.from('inventory_items').insert(rows);
      setAddedCount(toAdd.length);
      setStage('done');
      onAdded();
      setTimeout(() => onClose(), 2000);
    } catch {
      setErrorMsg(t('voice_error'));
      setStage('review');
    }
  };

  const keptCount = items.filter(i => i.kept).length;

  const CATEGORY_EMOJIS: Record<InventoryCategory, string> = {
    spices: '🌶️', condiments: '🫙', proteins: '🥩', fruits: '🍓',
    vegetables: '🥦', carbs: '🍞', dairy: '🥚', pantry: '🫘',
    beverages: '🧃', frozen: '🧊', other: '📦',
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center modal-overlay pb-16"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-lg rounded-t-3xl animate-slide-up"
        style={{ background: 'var(--bg-surface-solid)', border: '1px solid var(--border-color)', maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: 'var(--border-strong)' }} />
        </div>

        <div className="px-5 pt-2" style={{ paddingBottom: 'max(2.5rem, calc(1rem + env(safe-area-inset-bottom)))' }}>
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{t('voice_add_title')}</h2>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('voice_add_sub')}</p>
            </div>
            <button onClick={onClose} style={{ color: 'var(--text-muted)' }}>
              <X size={20} />
            </button>
          </div>

          {/* DONE state */}
          {stage === 'done' && (
            <div className="flex flex-col items-center py-10 animate-fade-in">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: 'rgba(34,197,94,0.15)' }}>
                <Check size={32} style={{ color: '#22c55e' }} strokeWidth={2.5} />
              </div>
              <p className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                {t('voice_done', { count: addedCount })}
              </p>
            </div>
          )}

          {/* REVIEW state */}
          {stage === 'review' && (
            <div className="animate-fade-in">
              <div className="mb-3">
                <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                  {t('voice_review_heading', { count: items.length })}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('voice_review_sub')}</p>
              </div>

              <div className="space-y-2 mb-5">
                {items.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => toggleItem(idx)}
                    className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl transition-all text-left"
                    style={{
                      background: item.kept ? 'rgba(34,197,94,0.08)' : 'var(--glass-bg)',
                      border: `1px solid ${item.kept ? 'rgba(34,197,94,0.3)' : 'var(--border-color)'}`,
                      opacity: item.kept ? 1 : 0.45,
                    }}
                  >
                    <span className="text-lg flex-shrink-0">{CATEGORY_EMOJIS[item.category]}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)', textDecoration: item.kept ? 'none' : 'line-through' }}>
                        {item.name}
                      </p>
                      <p className="text-[10px] capitalize" style={{ color: 'var(--text-muted)' }}>{item.category}</p>
                    </div>
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{
                        background: item.kept ? '#22c55e' : 'transparent',
                        border: `1.5px solid ${item.kept ? '#22c55e' : 'var(--border-color)'}`,
                      }}
                    >
                      {item.kept
                        ? <Check size={11} strokeWidth={3} color="white" />
                        : <Trash2 size={10} style={{ color: 'var(--text-muted)' }} />}
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => { setStage('idle'); setItems([]); setErrorMsg(''); }}
                  className="px-4 py-3 rounded-xl text-sm font-semibold transition-all"
                  style={{ background: 'var(--glass-bg)', border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}
                >
                  {t('voice_retry')}
                </button>
                <button
                  onClick={handleAddToPantry}
                  disabled={keptCount === 0}
                  className="flex-1 btn-gradient py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Plus size={16} />
                  {t('voice_add_all')} ({keptCount})
                </button>
              </div>
            </div>
          )}

          {/* IDLE / LISTENING / PROCESSING / SAVING states */}
          {(stage === 'idle' || stage === 'listening' || stage === 'processing' || stage === 'saving') && (
            <div className="flex flex-col items-center py-6">
              {/* Animated mic button */}
              <div className="relative mb-6">
                {stage === 'listening' && (
                  <>
                    <div className="absolute inset-0 rounded-full animate-ping" style={{ background: 'rgba(236,72,153,0.2)', animationDuration: '1.2s' }} />
                    <div className="absolute inset-[-8px] rounded-full" style={{ background: 'rgba(236,72,153,0.1)', animation: 'ping 1.5s ease-in-out infinite' }} />
                  </>
                )}
                <button
                  onClick={stage === 'listening' ? handleStop : startListening}
                  disabled={stage === 'processing' || stage === 'saving'}
                  className="relative w-24 h-24 rounded-full flex items-center justify-center transition-all active:scale-95 disabled:opacity-50"
                  style={{
                    background: stage === 'listening' ? 'var(--gradient-brand)' : 'var(--glass-bg)',
                    border: `2px solid ${stage === 'listening' ? 'transparent' : 'var(--border-color)'}`,
                    boxShadow: stage === 'listening' ? '0 8px 32px rgba(236,72,153,0.4)' : 'none',
                  }}
                >
                  {stage === 'listening'
                    ? <MicOff size={36} color="white" strokeWidth={1.8} />
                    : <Mic size={36} style={{ color: 'var(--accent-primary)' }} strokeWidth={1.8} />}
                </button>
              </div>

              <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                {stage === 'listening' ? t('voice_listening')
                  : stage === 'processing' ? t('voice_processing')
                  : stage === 'saving' ? t('voice_adding')
                  : t('voice_tap_start')}
              </p>

              {/* Live transcript */}
              {stage === 'listening' && (finalTranscript || interimTranscript) && (
                <p className="text-xs text-center mt-2 px-4 animate-fade-in" style={{ color: 'var(--text-muted)' }}>
                  {finalTranscript}{interimTranscript && <em style={{ opacity: 0.6 }}>{interimTranscript}</em>}
                </p>
              )}

              {stage === 'listening' && (
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{t('voice_tap_stop')}</p>
              )}

              {(stage === 'processing' || stage === 'saving') && (
                <div className="w-6 h-6 border-2 border-t-pink-500 rounded-full animate-spin mt-2" style={{ borderColor: 'var(--border-color)', borderTopColor: 'var(--accent-primary)' }} />
              )}

              {errorMsg && (
                <div className="mt-4 px-4 py-2.5 rounded-xl text-xs text-center animate-fade-in" style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  {errorMsg}
                </div>
              )}

              {!isSupported && (
                <div className="mt-4 px-4 py-2.5 rounded-xl text-xs text-center" style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  {t('voice_not_supported')}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
