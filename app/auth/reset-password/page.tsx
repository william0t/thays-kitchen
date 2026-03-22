'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ChefHat, Eye, EyeOff } from 'lucide-react';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [ready, setReady] = useState(false);   // recovery session detected
  const [invalid, setInvalid] = useState(false); // bad/expired link
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Supabase parses the recovery token from the URL hash and fires
    // onAuthStateChange with event 'PASSWORD_RECOVERY'
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true);
      }
    });

    // Also check if there's already a recovery session active (page reload)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });

    // If after 5s no recovery event fires, the link is bad or expired
    const timeout = setTimeout(() => {
      setInvalid(prev => {
        if (!ready) return true;
        return prev;
      });
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setSuccess(true);
      setTimeout(() => router.push('/'), 2500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg-base)' }}>
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{ background: 'var(--gradient-brand)' }}
          >
            <ChefHat size={32} color="white" />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Thay&apos;s Kitchen</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Set a new password</p>
        </div>

        <div className="glass-card rounded-2xl p-6" style={{ border: '1px solid var(--border-color)' }}>
          {success ? (
            <div className="text-center py-4">
              <div className="text-4xl mb-3">✅</div>
              <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                Password updated!
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Redirecting you to the app…
              </p>
            </div>
          ) : invalid && !ready ? (
            <div className="text-center py-4">
              <div className="text-4xl mb-3">🔗</div>
              <p className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                This link has expired or is invalid.
              </p>
              <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
                Reset links are single-use and expire after 1 hour.
              </p>
              <button
                onClick={() => router.push('/login')}
                className="btn-gradient px-5 py-2 rounded-full text-sm font-semibold"
              >
                Request a new link
              </button>
            </div>
          ) : !ready ? (
            <div className="text-center py-6">
              <div className="w-8 h-8 border-2 mx-auto rounded-full animate-spin" style={{ borderColor: 'var(--border-color)', borderTopColor: 'var(--accent-primary)' }} />
              <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>Verifying your link…</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-muted)' }}>
                  New password
                </label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    className="input-field w-full px-3 py-2.5 rounded-xl text-sm pr-10"
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-muted)' }}>
                  Confirm new password
                </label>
                <input
                  type={showPw ? 'text' : 'password'}
                  className="input-field w-full px-3 py-2.5 rounded-xl text-sm"
                  placeholder="Same password again"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                />
              </div>

              {error && (
                <p className="text-sm px-3 py-2 rounded-xl" style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--danger)' }}>
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-gradient w-full py-3 rounded-xl font-semibold disabled:opacity-50"
              >
                {loading ? 'Updating…' : 'Set New Password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
