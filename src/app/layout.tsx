import './globals.css';
import { Inter } from 'next/font/google';
import Providers from './providers';
import { Suspense } from 'react';
import type { Metadata } from 'next'
import { checkEnv } from '@/lib/utils/checkEnv';

const inter = Inter({ 
  variable: '--font-inter',
  display: 'swap'
});

export const metadata: Metadata = {
  title: 'TheSet - Live Music Setlist Voting',
  description: 'Vote on songs you want to hear at upcoming concerts',
  keywords: ['music', 'concerts', 'setlist', 'voting', 'live music'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Validate critical environment variables at runtime
  checkEnv();
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} bg-background text-foreground`}>
        <Suspense fallback={null}>
          <Providers>
            {children}
          </Providers>
        </Suspense>
      </body>
    </html>
  );
} 