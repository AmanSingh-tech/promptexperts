import type { Metadata, Viewport } from 'next';
import { Chakra_Petch, Inter, JetBrains_Mono } from 'next/font/google';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/components/AuthProvider';
import { Navbar } from '@/components/Navbar';
import './globals.css';

const display = Chakra_Petch({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-display' });
const body = Inter({ subsets: ['latin'], variable: '--font-body' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });

export const metadata: Metadata = {
  title: { default: 'AILOGRACER', template: '%s · AILOGRACER' },
  description: 'Solve problems with AI. Get scored on the solution and on how well you used AI to reach it.'
};

export const viewport: Viewport = {
  themeColor: '#090a11',
  colorScheme: 'dark'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${display.variable} ${body.variable} ${mono.variable}`}>
      <body className="min-h-dvh">
        <AuthProvider>
          <Navbar />
          {children}
          <Toaster
            theme="dark"
            position="top-right"
            offset={72}
            toastOptions={{
              classNames: {
                toast: '!bg-slate-900 !border-slate-700 !text-slate-100 !font-sans',
                description: '!text-slate-400'
              }
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
