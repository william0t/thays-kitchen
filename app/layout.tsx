import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/contexts/ThemeContext';
import BottomNav from '@/components/BottomNav';

export const metadata: Metadata = {
  title: "Thay's Kitchen",
  description: 'Your smart kitchen inventory and AI recipe generator',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="antialiased">
      <body>
        <ThemeProvider>
          <main className="relative z-10 min-h-screen">
            {children}
          </main>
          <BottomNav />
        </ThemeProvider>
      </body>
    </html>
  );
}
