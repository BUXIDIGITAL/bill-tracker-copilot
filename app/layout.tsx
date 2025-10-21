import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import './styles/theme.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Bill Tracker',
  description: 'Dark themed subscription and bill organizer',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} dark`}>
      <body className="min-h-screen bg-background text-textPrimary">{children}</body>
    </html>
  );
}
