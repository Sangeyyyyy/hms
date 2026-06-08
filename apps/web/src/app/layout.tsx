import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';
import { Toaster } from 'sonner';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: {
    default: 'DNSC HMS — Hostel Management System',
    template: '%s | DNSC HMS',
  },
  description:
    'Production-ready Hostel Management System for DNSC Hostel. Manage rooms, reservations, guests, and staff efficiently.',
  keywords: ['hostel', 'management', 'DNSC', 'HMS', 'hotel'],
  authors: [{ name: 'DNSC Hostel' }],
  robots: 'noindex, nofollow', // Internal system — keep private
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`} suppressHydrationWarning>
        <Providers>
          {children}
          <Toaster richColors position="top-right" />
        </Providers>
      </body>
    </html>
  );
}
