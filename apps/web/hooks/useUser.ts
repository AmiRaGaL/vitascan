'use client';

import { useRouter } from 'next/navigation';
import { useSupabase } from '@/components/providers/SupabaseProvider';

export function useUser() {
  const { supabase, user, session, tier, isGuest, loading } = useSupabase();
  const router = useRouter();

  const loginWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  const logout = async () => {
    await supabase.auth.signOut();
    // router.push('/');
    window.location.href = '/'; 
    router.refresh();
  };

  return { user, session, tier, isGuest, loading, loginWithGoogle, logout };
}
