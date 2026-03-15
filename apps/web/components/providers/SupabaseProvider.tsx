"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";
import type { Session, SupabaseClient, User } from "@supabase/supabase-js";

type UserTier = "guest" | "free" | "premium";

interface SupabaseContextType {
  supabase: SupabaseClient;
  session: Session | null;
  user: User | null;
  tier: UserTier;
  isGuest: boolean;
  loading: boolean;
}

const SupabaseContext = createContext<SupabaseContextType | undefined>(
  undefined,
);

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [tier, setTier] = useState<UserTier>("guest");
  const [loading, setLoading] = useState(true);

  const fetchTier = useCallback(
    async (userId: string) => {
      try {
        console.log("🔍 fetchTier start for:", userId);

        const { data, error } = await supabase
          .from("users")
          .select("tier")
          .eq("id", userId)
          .maybeSingle();

        console.log("📦 fetchTier result:", { data, error });

        if (data?.tier) {
          setTier(data.tier as UserTier);
        } else {
          console.log("➕ No user row, inserting...");
          const { error: insertError } = await supabase
            .from("users")
            .insert({ id: userId, tier: "free" });
          console.log("➕ Insert result:", insertError ?? "success");
          if (insertError) console.error("Insert user failed:", insertError);
          setTier("free");
        }
        console.log("✅ fetchTier complete");
      } catch (err) {
        console.error("fetchTier failed:", err);
        setTier("free");
      }
    },
    [supabase],
  );

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("🔐 Auth event:", event, "| session:", !!session);

      if (event === "SIGNED_OUT") {
        setSession(null);
        setUser(null);
        setTier("guest");
        setLoading(false);
        return;
      }

      if (session?.user) {
        setSession(session);
        setUser(session.user);

        // ✅ Only fetch tier when session is fully stable
        // SIGNED_IN fires too early (cookies not propagated yet)
        if (event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED") {
          fetchTier(session.user.id); // fire and forget — won't block UI
        } else {
          // SIGNED_IN: default to 'free', tier updates on next stable load
          setTier("free");
        }
      } else {
        setSession(null);
        setUser(null);
        setTier("guest");
      }

      setLoading(false); // ✅ Always unblock UI regardless of event
    });

    return () => subscription.unsubscribe();
  }, [supabase, fetchTier]);

  return (
    <SupabaseContext.Provider
      value={{ supabase, session, user, tier, isGuest: !user, loading }}
    >
      {children}
    </SupabaseContext.Provider>
  );
}

export function useSupabase() {
  const ctx = useContext(SupabaseContext);
  if (!ctx) throw new Error("useSupabase must be used within SupabaseProvider");
  return ctx;
}
