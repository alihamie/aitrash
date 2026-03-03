"use client";

import { useState } from "react";

export function ShareButton({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/post/${id}`;

    // Try Web Share API first (mobile)
    if (navigator.share) {
      try {
        await navigator.share({ title: "AI Trash — Check this slop!", url });
        return;
      } catch {
        // User cancelled or not supported — fall through to clipboard
      }
    }

    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleShare}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-all border border-zinc-700 cursor-pointer"
    >
      {copied ? "✅ Copied!" : "🔗 Share"}
    </button>
  );
}
