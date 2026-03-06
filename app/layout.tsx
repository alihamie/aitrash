import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import { AuthButton } from "./components/AuthButton";
import { AuthProvider } from "./components/AuthProvider";
import { SlopDumpButton } from "./components/SlopDumpButton";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI Slop — Where AI Slop Gets Celebrated 🗑️",
  description:
    "Paste your AI-generated slop. Get rated by the Slop-o-Meter. Compete for the sloppiest post.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://aitrash.vercel.app"
  ),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${inter.className} bg-zinc-950 text-zinc-100 min-h-screen`}
      >
        <AuthProvider>
          <header className="sticky top-0 z-20 bg-zinc-950/95 backdrop-blur border-b border-zinc-800">
            <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2 group">
                <span className="text-3xl">🗑️</span>
                <div className="flex flex-col leading-none">
                  <span className="font-black text-2xl tracking-tighter">
                    AI<span className="text-yellow-400">Slop</span>
                  </span>
                  <span className="text-[9px] font-bold tracking-widest text-zinc-500 uppercase hidden sm:block">
                    The Internet&apos;s Premier AI Slop Repository
                  </span>
                </div>
              </Link>
              <div className="flex items-center gap-3">
                <SlopDumpButton />
                <AuthButton />
              </div>
            </div>
          </header>
          <main className="max-w-3xl mx-auto px-4 py-8">{children}</main>
          <footer className="border-t border-zinc-800 mt-16 py-6 text-center text-zinc-600 text-sm">
            AI Slop — where AI slop goes to be judged and celebrated 🗑️👑
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
