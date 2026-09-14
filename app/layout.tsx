import type { Metadata } from 'next';
import { Fraunces, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['500', '600'],
});

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '500'],
});

export const metadata: Metadata = {
  title: 'Loyalty Points',
  description: 'Earn and redeem points at checkout — no card, no app store.',
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${fraunces.variable} ${plexMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
