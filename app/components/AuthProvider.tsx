"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase";
import type { Profile } from "@/lib/types";
import { log } from "@/lib/logger";

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  authError: string | null;
  setProfile: (profile: Profile | null) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const profileLoadId = useRef(0);
  const lastLoadedUserId = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    let initialEventFired = false;

    const loadProfile = async (userId: string) => {
      const loadId = ++profileLoadId.current;
      if (!active || loadId !== profileLoadId.current) return;

      try {
        const res = await fetch("/api/profile");
        if (!active || loadId !== profileLoadId.current) return;

        if (!res.ok) {
          log.error("auth.profile.fetch_failed", { status: res.status, userId });
          setProfile(null);
          return;
        }

        const json = await res.json();
        if (!active || loadId !== profileLoadId.current) return;

        lastLoadedUserId.current = userId;
        setProfile((json.profile as Profile | null) ?? null);
        log.debug("auth.profile.fetch_done", { hasProfile: !!json.profile, userId });
      } catch (err) {
        log.error("auth.profile.fetch_failed", {
          message: err instanceof Error ? err.message : "Unknown",
          userId,
        });
        setProfile(null);
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session: Session | null) => {
      if (!active) return;

      log.info("auth.state_change", {
        event,
        hasUser: !!session?.user,
      });

      const nextUser = session?.user ?? null;
      setUser(nextUser);
      setAuthError(null);

      if (nextUser) {
        // Skip profile re-fetch if already loaded for this user.
        // SIGNED_IN fires repeatedly as proxy refreshes tokens — this prevents
        // the AbortError loop where each new event steals the lock mid-fetch.
        if (nextUser.id !== lastLoadedUserId.current) {
          await loadProfile(nextUser.id);
        }
      } else {
        lastLoadedUserId.current = null;
        setProfile(null);
      }

      // Resolve loading only after profile is fetched — prevents the modal from
      // flashing on page load when user exists but profile hasn't arrived yet.
      if (!initialEventFired) {
        initialEventFired = true;
        setLoading(false);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      loading,
      authError,
      setProfile,
    }),
    [authError, loading, profile, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
