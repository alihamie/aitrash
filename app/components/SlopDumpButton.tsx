"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { useAuth } from "./AuthProvider";

export function SlopDumpButton() {
  const { user } = useAuth();
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);

  const handleClick = () => {
    if (user) {
      router.push("/submit");
    } else {
      setShowModal(true);
    }
  };

  const handleSignIn = () => {
    const supabase = createClient();
    supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/submit`,
      },
    });
  };

  return (
    <>
      <button
        onClick={handleClick}
        className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black px-4 py-2 rounded-lg text-sm transition-colors uppercase tracking-wide cursor-pointer"
      >
        Slop Dump 🗑️
      </button>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-sm p-6 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-4xl mb-3">🗑️</div>
            <h2 className="font-black text-xl mb-2">Join the Dumpster</h2>
            <p className="text-zinc-400 text-sm mb-6">
              Sign in to dump your AI slop and get rated by the Slop-o-Meter.
            </p>
            <button
              onClick={handleSignIn}
              className="w-full inline-flex items-center justify-center gap-2 bg-white text-zinc-900 font-bold px-6 py-3 rounded-xl hover:bg-zinc-200 transition-colors cursor-pointer mb-3"
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
            <button
              onClick={() => setShowModal(false)}
              className="w-full text-zinc-500 hover:text-zinc-300 text-sm transition-colors cursor-pointer py-2"
            >
              Maybe later
            </button>
          </div>
        </div>
      )}
    </>
  );
}
