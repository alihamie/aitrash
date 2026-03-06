"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import type { Profile } from "@/lib/types";
import { log } from "@/lib/logger";
import { useAuth } from "./AuthProvider";
import { UsernameModal } from "@/app/components/UsernameModal";

export function AuthButton() {
  const { user, profile, loading, setProfile } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const showUsernameModal = !!user && !profile;

  const supabase = createClient();

  const handleSignIn = async () => {
    log.info("auth.ui.sign_in_click", {
      path: window.location.pathname,
    });
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  const handleSignOut = () => {
    window.location.href = "/api/auth/signout";
  };

  const handleUsernameCreated = (newProfile: Profile) => {
    setProfile(newProfile);
  };

  if (loading) {
    return (
      <div className="h-9 w-24 bg-zinc-800 animate-pulse rounded-lg" />
    );
  }

  if (!user) {
    return (
      <button
        onClick={handleSignIn}
        className="flex items-center gap-2 px-4 py-2 bg-white text-zinc-900 rounded-lg font-medium text-sm hover:bg-zinc-200 transition-colors cursor-pointer"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24">
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
        Sign In to Slop
      </button>
    );
  }

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-2 px-3 py-2 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors cursor-pointer"
        >
          <div className="w-6 h-6 rounded-full bg-yellow-400 text-zinc-950 flex items-center justify-center text-xs font-bold">
            {(profile?.username?.[0] ?? "?").toUpperCase()}
          </div>
          <span className="text-sm font-medium text-zinc-200 max-w-[120px] truncate">
            {profile?.username ?? "..."}
          </span>
          <svg
            className={`w-3 h-3 text-zinc-400 transition-transform ${menuOpen ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {menuOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setMenuOpen(false)}
            />
            <div className="absolute right-0 mt-2 w-48 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-50 py-1">
              <div className="px-4 py-2 border-b border-zinc-700">
                <p className="text-xs text-zinc-400">Signed in as</p>
                <p className="text-sm font-medium text-zinc-200 truncate">
                  {profile?.username}
                </p>
              </div>
              <button
                onClick={handleSignOut}
                className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-zinc-700 transition-colors cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          </>
        )}
      </div>

      {showUsernameModal && user && (
        <UsernameModal
          userId={user.id}
          onComplete={handleUsernameCreated}
        />
      )}
    </>
  );
}
