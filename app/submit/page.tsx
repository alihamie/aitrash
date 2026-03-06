"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { createRequestId, log } from "@/lib/logger";
import { Turnstile } from "@marsidev/react-turnstile";
import { SlopMeter } from "../components/SlopMeter";
import { getSlopColor } from "@/lib/types";
import { useAuth } from "../components/AuthProvider";

const IS_LOCALHOST =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1");

const TURNSTILE_SITE_KEY =
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

const LOADING_MSGS = [
  "Analyzing slop levels... oh no.",
  "Calibrating the Slop-o-Meter...",
  "Counting buzzwords... there are so many.",
  "Measuring filler phrases... we're running out of units.",
  "Detecting AI fingerprints... found seventeen.",
  "The judge is weeping.",
  "Almost done roasting... this is bad.",
  "Contacting hazmat team...",
  "Preparing roast. This may sting.",
];

const MAX_CHARS = 5000;
const MAX_POSTS_PER_DAY = 3;

type SourceMode = "text" | "tweet" | "reddit";

const SOURCE_MODES: { id: SourceMode; label: string; icon: string }[] = [
  { id: "text", label: "Text", icon: "📝" },
  { id: "tweet", label: "Tweet", icon: "🐦" },
  { id: "reddit", label: "Reddit", icon: "🤖" },
];

const PLACEHOLDERS: Record<SourceMode, string> = {
  text: "Paste your AI-generated masterpiece here. The sloppier the better. We don't judge. (We absolutely judge.) 🗑️",
  tweet: "Fetch a tweet above, or paste tweet text directly here.",
  reddit: "Fetch a Reddit post above, or paste text directly here.",
};

const URL_PLACEHOLDERS: Record<string, string> = {
  tweet: "https://x.com/user/status/123...",
  reddit: "https://www.reddit.com/r/sub/comments/abc/title/",
};

interface SubmitResult {
  slop_score: number;
  verdict: string;
  roast: string;
  id: string;
  remaining: number;
}

export default function SubmitPage() {
  const router = useRouter();
  const [mode, setMode] = useState<SourceMode>("text");
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [importUrl, setImportUrl] = useState("");
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState(LOADING_MSGS[0]);
  const [error, setError] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(
    IS_LOCALHOST ? "localhost-bypass" : null
  );
  const [result, setResult] = useState<SubmitResult | null>(null);
  const { user, loading: authLoading, authError } = useAuth();

  const supabase = createClient();
  const isAuthenticated = !!user;

  const handleSignIn = () => {
    log.info("submit.auth_required_sign_in", {
      path: window.location.pathname,
    });
    supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/submit`,
      },
    });
  };

  const handleModeChange = (newMode: SourceMode) => {
    setMode(newMode);
    setImportUrl("");
    setImportError("");
    setContent("");
  };

  const handleFetch = async () => {
    if (!importUrl.trim()) return;
    setImportLoading(true);
    setImportError("");
    const apiMap: Record<string, string> = {
      tweet: "/api/extract-tweet",
      reddit: "/api/extract-reddit",
    };
    const endpoint = apiMap[mode];
    if (!endpoint) return;

    try {
      const res = await fetch(`${endpoint}?url=${encodeURIComponent(importUrl.trim())}`);
      const data = await res.json();
      if (!res.ok) {
        setImportError(data.error ?? "Failed to fetch content.");
      } else {
        setContent(data.text ?? "");
        if (!title.trim()) {
          if (data.author) setTitle(mode === "tweet" ? `Tweet by ${data.author}` : `Post by ${data.author}`);
          else if (data.title) setTitle(data.title);
        }
      }
    } catch {
      setImportError("Failed to fetch content.");
    } finally {
      setImportLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    if (!turnstileToken) {
      setError("Please complete the verification.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    const requestId = createRequestId("submit");
    log.info("submit.client.start", {
      requestId,
      contentLength: content.trim().length,
      hasTurnstileToken: !!turnstileToken,
      isLocalhost: IS_LOCALHOST,
    });

    let msgIdx = 0;
    const interval = setInterval(() => {
      msgIdx = (msgIdx + 1) % LOADING_MSGS.length;
      setLoadingMsg(LOADING_MSGS[msgIdx]);
    }, 1200);

    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-request-id": requestId,
        },
        body: JSON.stringify({
          content: content.trim(),
          title: title.trim() || undefined,
          turnstileToken,
        }),
      });
      const data = await res.json();
      log.info("submit.client.response", {
        requestId,
        status: res.status,
        ok: res.ok,
        code: data?.code,
      });
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");

      setResult(data as SubmitResult);

      setTimeout(() => {
        router.push(`/post/${data.id}`);
      }, 3000);
    } catch (err: unknown) {
      log.error("submit.client.failed", {
        requestId,
        message: err instanceof Error ? err.message : "Unknown submit error",
      });
      setError(err instanceof Error ? err.message : "Failed to submit.");
      setLoading(false);
    } finally {
      clearInterval(interval);
    }
  };

  if (authLoading) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <div className="animate-pulse text-4xl">🗑️</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <div className="text-6xl mb-4">🔒</div>
        <h1 className="text-2xl font-black mb-3">Sign In to Dump Slop</h1>
        <p className="text-zinc-400 text-sm mb-6">
          You need an account to submit AI-generated garbage.
        </p>
        {authError && (
          <p className="text-xs text-red-400 mb-4">
            Auth status issue: {authError}
          </p>
        )}
        <button
          onClick={handleSignIn}
          className="inline-flex items-center gap-2 bg-white text-zinc-900 font-bold px-6 py-3 rounded-xl hover:bg-zinc-200 transition-colors cursor-pointer"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Sign in with Google
        </button>
      </div>
    );
  }

  if (result) {
    const slopColor = getSlopColor(result.slop_score);
    return (
      <div className="max-w-2xl mx-auto text-center py-10">
        <div className="text-5xl mb-4">
          {result.slop_score >= 80 ? "🏆" : result.slop_score >= 60 ? "🗑️" : "😬"}
        </div>
        <h1 className="text-2xl font-black mb-6">The Verdict Is In!</h1>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-6">
          <SlopMeter score={result.slop_score} size="lg" />

          <div className="mt-6 bg-zinc-800/60 border border-yellow-400/20 rounded-xl p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-yellow-400 mb-1">
              🤖 AI Slop Judge
            </p>
            <p className={`${slopColor} font-semibold italic text-lg`}>
              &ldquo;{result.roast}&rdquo;
            </p>
          </div>
        </div>

        <p className="text-zinc-500 text-sm animate-pulse">
          Redirecting to your post...
        </p>
        <p className="text-zinc-600 text-xs mt-2">
          {result.remaining} dump{result.remaining !== 1 ? "s" : ""} left today
        </p>
      </div>
    );
  }

  const showUrlInput = mode === "tweet" || mode === "reddit";

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-black tracking-tighter mb-2 uppercase">
          <span className="text-yellow-400">Slop</span> Dump 🗑️
        </h1>
        <p className="text-zinc-400 text-sm">
          Paste your slop here. Don&apos;t be shy. We&apos;ve seen worse.
        </p>
        <p className="text-zinc-600 text-xs mt-1">
          {MAX_POSTS_PER_DAY} dumps per day. Choose disgrace wisely.
        </p>
      </div>

      {/* Source selector */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {SOURCE_MODES.map(({ id, label, icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => handleModeChange(id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-colors border cursor-pointer ${
              mode === id
                ? "bg-yellow-400 text-zinc-950 border-yellow-400"
                : "bg-zinc-900 text-zinc-400 border-zinc-700 hover:border-zinc-500"
            }`}
          >
            <span>{icon}</span>
            <span>{label}</span>
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Title */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">
            Title <span className="text-zinc-600 normal-case font-normal tracking-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Give your slop a name..."
            maxLength={100}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-200 placeholder-zinc-600 text-sm focus:outline-none focus:border-yellow-400/50 transition-colors"
          />
          <div className="flex justify-end mt-1">
            <p className={`text-xs ${title.length > 90 ? "text-orange-400" : "text-zinc-600"}`}>
              {title.length} / 100
            </p>
          </div>
        </div>

        {/* URL import — tweet / reddit / url modes only */}
        {showUrlInput && (
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">
              {mode === "tweet" ? "Tweet URL" : mode === "reddit" ? "Reddit Post URL" : "Page URL"}
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                placeholder={URL_PLACEHOLDERS[mode]}
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-200 placeholder-zinc-600 text-sm focus:outline-none focus:border-yellow-400/50 transition-colors"
              />
              <button
                type="button"
                onClick={handleFetch}
                disabled={importLoading || !importUrl.trim()}
                className="px-4 py-3 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-300 font-medium text-sm rounded-xl transition-colors border border-zinc-700 cursor-pointer whitespace-nowrap"
              >
                {importLoading ? "Fetching..." : "Fetch"}
              </button>
            </div>
            {importError && (
              <p className="text-xs text-red-400 mt-1">{importError}</p>
            )}
          </div>
        )}

        {/* Textarea */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">
            The Slop
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={PLACEHOLDERS[mode]}
            rows={10}
            required
            maxLength={MAX_CHARS}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-200 placeholder-zinc-600 text-sm focus:outline-none focus:border-yellow-400/50 resize-none transition-colors"
          />
          <div className="flex justify-between mt-1">
            <p className="text-xs text-zinc-600">
              Pro tip: leverage synergies for maximum slop points
            </p>
            <p
              className={`text-xs ${content.length > MAX_CHARS * 0.9 ? "text-orange-400" : "text-zinc-600"}`}
            >
              {content.length} / {MAX_CHARS}
            </p>
          </div>
        </div>

        {/* Turnstile */}
        {IS_LOCALHOST ? (
          <p className="text-xs text-zinc-500 text-center">
            🛠️ Turnstile bypassed on localhost
          </p>
        ) : (
          <div className="flex justify-center">
            <Turnstile
              siteKey={TURNSTILE_SITE_KEY}
              onSuccess={(token) => setTurnstileToken(token)}
              onError={() => setTurnstileToken(null)}
              onExpire={() => setTurnstileToken(null)}
            />
          </div>
        )}

        {error && (
          <div className="bg-red-950/50 border border-red-800 text-red-400 rounded-xl px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !content.trim() || !turnstileToken}
          className="w-full bg-yellow-400 hover:bg-yellow-300 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-950 font-black text-lg py-4 rounded-xl transition-colors cursor-pointer"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin inline-block">🗑️</span>{" "}
              {loadingMsg}
            </span>
          ) : (
            "Dump Slop 🗑️"
          )}
        </button>
      </form>
    </div>
  );
}
