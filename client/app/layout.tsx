import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/components/AuthProvider';
import { Navbar } from '@/components/Navbar';
import { ProgressUpdates } from '@/components/ProgressUpdates';
import './globals.css';

const body = Inter({ subsets: ['latin'], variable: '--font-body' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });

export const metadata: Metadata = {
  title: { default: 'AILOGRACER', template: '%s · AILOGRACER' },
  description: 'Solve problems with AI. Get scored on the solution and on how well you used AI to reach it.'
};

export const viewport: Viewport = {
  themeColor: '#0e141e',
  colorScheme: 'light'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${body.variable} ${mono.variable}`}>
      <body className="min-h-dvh">
        <AuthProvider>
          <Navbar />
          {children}
          <ProgressUpdates />
          <Toaster
            theme="light"
            position="bottom-left"
            toastOptions={{ classNames: { toast: '!font-sans' } }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
