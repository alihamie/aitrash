'use client';
import { useState } from 'react';

export default function ShareButton({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const url = `${window.location.origin}/post/${id}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleShare}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-all"
    >
      {copied ? '✅ Copied!' : '🔗 Share'}
    </button>
  );
}
