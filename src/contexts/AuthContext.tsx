import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { clearUserSessionStorage, withRetry } from "@/lib/security";
import { clearAuthEmailSessionFlag, triggerAuthEmail } from "@/services/email.service";
import { toast } from "sonner";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  userId: string | undefined;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const previousUserIdRef = useRef<string | null>(null);

  const performLocalCleanup = useCallback(async () => {
    queryClient.clear();
    await clearUserSessionStorage();
  }, [queryClient]);

  const checkBanStatus = useCallback(async (uid: string) => {
    try {
      const { data } = await withRetry(
        async () =>
          supabase
            .from("profiles")
            .select("is_banned")
            .eq("id", uid)
            .maybeSingle(),
        { retries: 2, baseDelayMs: 400 }
      );

      if (!data) {
        // Self-heal missing profile row if auth user predates trigger
        await (supabase.rpc as any)("ensure_my_profile");
        return;
      }

      if ((data as { is_banned?: boolean } | null)?.is_banned) {
        toast.error("Your account has been suspended by moderation.");
        await supabase.auth.signOut();
        await performLocalCleanup();
      }
    } catch {
      // Offline or transient failure: do not lock out legitimate users
    }
  }, [performLocalCleanup]);

  useEffect(() => {
    let mounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, nextSession) => {
        if (!mounted) return;

        const nextUser = nextSession?.user ?? null;
        const prevUid = previousUserIdRef.current;
        const nextUid = nextUser?.id ?? null;

        // If user switched or signed out, purge cached user data immediately
        if (event === "SIGNED_OUT" || (prevUid && nextUid && prevUid !== nextUid)) {
          clearAuthEmailSessionFlag(prevUid);
          await performLocalCleanup();
        }

        previousUserIdRef.current = nextUid;
        setSession(nextSession);
        setUser(nextUser);
        setIsLoading(false);

        if (nextUser) {
          queryClient.setQueryData(["auth_user"], nextUser);
          if (event === "SIGNED_IN") {
            void triggerAuthEmail(nextUser.id, "auth_event");
          }
          if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
            queryClient.invalidateQueries({ queryKey: ["is_admin"] });
            checkBanStatus(nextUser.id);
          }
        } else {
          queryClient.setQueryData(["auth_user"], null);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (!mounted) return;
      const initialUser = initialSession?.user ?? null;
      previousUserIdRef.current = initialUser?.id ?? null;
      setSession(initialSession);
      setUser(initialUser);
      setIsLoading(false);
      if (initialUser) {
        queryClient.setQueryData(["auth_user"], initialUser);
        checkBanStatus(initialUser.id);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [checkBanStatus, performLocalCleanup, queryClient]);

  const signOut = useCallback(async () => {
    const uid = user?.id;
    try {
      if (uid) {
        await supabase.from("user_push_tokens" as never).delete().eq("user_id", uid);
      }
      await supabase.auth.signOut();
    } finally {
      clearAuthEmailSessionFlag(uid);
      previousUserIdRef.current = null;
      setSession(null);
      setUser(null);
      await performLocalCleanup();
    }
  }, [performLocalCleanup, user?.id]);

  const refreshSession = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    let activeSession = data.session;

    // Proactively refresh near-expiry tokens after backgrounding or offline recovery
    if (activeSession?.expires_at) {
      const secondsRemaining = activeSession.expires_at - Math.floor(Date.now() / 1000);
      if (secondsRemaining < 120) {
        const refreshed = await supabase.auth.refreshSession();
        if (refreshed.error && /refresh token/i.test(refreshed.error.message || "")) {
          await supabase.auth.signOut();
          setSession(null);
          setUser(null);
          await performLocalCleanup();
          return;
        }
        if (refreshed.data.session) {
          activeSession = refreshed.data.session;
        }
      }
    }

    if (activeSession) {
      setSession(activeSession);
      setUser(activeSession.user);
      queryClient.setQueryData(["auth_user"], activeSession.user);
    }
  }, [performLocalCleanup, queryClient]);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    session,
    isLoading,
    isAuthenticated: !!user,
    userId: user?.id,
    signOut,
    refreshSession,
  }), [user, session, isLoading, signOut, refreshSession]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuthContext must be used within AuthProvider");
  }
  return ctx;
}
