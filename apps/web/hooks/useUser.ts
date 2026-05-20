"use client";

import { useRouter } from "next/navigation";
import { useSupabase } from "@/components/providers/SupabaseProvider";

export function useUser() {
  const { supabase, user, session, tier, isGuest, loading } = useSupabase();
  const router = useRouter();

  const loginWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  const loginWithPassword = async (
    email: string,
    password: string,
  ): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) return { error: error.message };
    router.push("/dashboard");
    return { error: null };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
    router.refresh();
  };

  return {
    user,
    session,
    tier,
    isGuest,
    loading,
    loginWithGoogle,
    loginWithPassword,
    logout,
  };
}
