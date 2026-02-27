import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Link from 'next/link';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'AITrash — Submit Your Garbage, Get Judged',
  description: 'AI-generated garbage rated by an even snarkier AI judge.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://aitrash.vercel.app'),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-zinc-950 text-zinc-100 min-h-screen`}>
        <header className="sticky top-0 z-20 bg-zinc-950/90 backdrop-blur border-b border-zinc-800">
          <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-2xl">🗑️</span>
              <span className="font-black text-xl tracking-tight">
                AI<span className="text-red-500">Trash</span>
              </span>
            </Link>
            <Link
              href="/submit"
              className="bg-red-500 hover:bg-red-400 text-white font-bold px-4 py-2 rounded-full text-sm transition-colors"
            >
              Submit Trash →
            </Link>
          </div>
        </header>
        <main className="max-w-3xl mx-auto px-4 py-8">{children}</main>
        <footer className="border-t border-zinc-800 mt-16 py-6 text-center text-zinc-600 text-sm">
          AITrash — where AI goes to be judged 🤖🗑️
        </footer>
      </body>
    </html>
  );
}
