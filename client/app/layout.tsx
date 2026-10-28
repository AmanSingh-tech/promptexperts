import type { Metadata } from 'next';
import { AuthProvider } from '@/components/AuthProvider';
import { Navbar } from '@/components/Navbar';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'AILOGRACER', template: '%s · AILOGRACER' },
  description: 'Solve problems with AI. Get scored on the solution and on how well you used AI to reach it.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <AuthProvider>
          <Navbar />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
