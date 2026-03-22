'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Refrigerator, Sparkles, BookOpen, Utensils } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const navItems = [
  { href: '/', icon: Home, label: 'Home' },
  { href: '/inventory', icon: Refrigerator, label: 'Pantry' },
  { href: '/generate', icon: Sparkles, label: 'Generate' },
  { href: '/recipes', icon: BookOpen, label: 'Recipes' },
  { href: '/appliances', icon: Utensils, label: 'Tools' },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  if (!user || pathname === '/login') return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 no-print"
      style={{
        background: 'var(--nav-bg)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderTop: '1px solid var(--border-color)',
      }}
    >
      <div className="flex items-center justify-around max-w-lg mx-auto px-2 py-2 pb-safe">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200"
              style={{
                color: isActive ? 'var(--accent-primary)' : 'var(--text-muted)',
              }}
            >
              <div
                className="relative flex items-center justify-center w-10 h-8 rounded-xl transition-all duration-200"
                style={{
                  background: isActive ? 'rgba(236, 72, 153, 0.12)' : 'transparent',
                }}
              >
                {href === '/generate' ? (
                  <div
                    className="flex items-center justify-center w-10 h-10 rounded-2xl -mt-4 shadow-lg"
                    style={{
                      background: 'var(--gradient-brand)',
                      boxShadow: '0 4px 15px rgba(236, 72, 153, 0.4)',
                    }}
                  >
                    <Icon
                      size={20}
                      strokeWidth={2}
                      color="white"
                    />
                  </div>
                ) : (
                  <Icon
                    size={20}
                    strokeWidth={isActive ? 2.2 : 1.8}
                  />
                )}
              </div>
              <span
                className="text-xs font-medium transition-all duration-200"
                style={{
                  fontSize: '10px',
                  fontWeight: isActive ? 600 : 500,
                  marginTop: href === '/generate' ? '6px' : '0',
                }}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
