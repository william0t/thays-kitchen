import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import BottomNav from '@/components/BottomNav';
import AuthGuard from '@/components/AuthGuard';

export const metadata: Metadata = {
  title: "Thay's Kitchen",
  description: 'Your smart kitchen inventory and AI recipe generator',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="antialiased">
      <body>
        <LanguageProvider>
        <ThemeProvider>
          <AuthProvider>
            <AuthGuard>
              <main className="relative z-10 min-h-screen">
                {children}
              </main>
              <BottomNav />
            </AuthGuard>
          </AuthProvider>
        </ThemeProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
