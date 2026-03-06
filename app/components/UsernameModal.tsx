"use client";

import { useState } from "react";
import { log } from "@/lib/logger";
import type { Profile } from "@/lib/types";

interface UsernameModalProps {
  userId: string;
  onComplete: (profile: Profile) => void;
}

export function UsernameModal({ userId, onComplete }: UsernameModalProps) {
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const validateUsername = (name: string): string | null => {
    if (name.length < 3) return "Username must be at least 3 characters";
    if (name.length > 20) return "Username must be 20 characters or less";
    if (!/^[a-zA-Z0-9_]+$/.test(name))
      return "Only letters, numbers, and underscores allowed";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = username.trim();

    const validationError = validateUsername(trimmed);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);
    log.info("username.submit.start", { userId, usernameLength: trimmed.length });

    try {
      // Use the server-side API route — avoids the browser Supabase client's
      // Web Lock contention (which can cause this fetch to hang indefinitely
      // when the auth token refresh holds the lock).
      const res = await fetch("/api/create-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: trimmed }),
      });

      const data = await res.json();

      if (!res.ok) {
        log.warn("username.submit.api_error", { userId, status: res.status, error: data.error });
        setError(data.error ?? "Something went wrong. Try again.");
        return;
      }

      log.info("username.submit.success", { userId });
      onComplete(data.profile as Profile);
    } catch (err) {
      log.error("username.submit.fetch_failed", {
        userId,
        message: err instanceof Error ? err.message : "Unknown",
      });
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">🗑️</div>
          <h2 className="text-2xl font-black text-white mb-2 uppercase tracking-tight">
            Welcome to the Dumpster
          </h2>
          <p className="text-zinc-400 text-sm">
            Pick a username. Make it gross. Start dumping slop.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium text-zinc-300 mb-1"
            >
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setError(null);
              }}
              placeholder="SlopLord420"
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-600 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
              autoFocus
              maxLength={20}
            />
            <p className="mt-1 text-xs text-zinc-500">
              3-20 characters. Letters, numbers, underscores only.
            </p>
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-400/10 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !username.trim()}
            className="w-full py-3 bg-yellow-400 hover:bg-yellow-300 disabled:bg-zinc-700 disabled:text-zinc-500 text-zinc-950 font-bold rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            {loading ? "Creating..." : "Let's Go 🗑️"}
          </button>
        </form>
      </div>
    </div>
  );
}
