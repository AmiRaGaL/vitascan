"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useUser } from "@/hooks/useUser";
import { createClient } from "@/lib/supabase/client";

export default function DashboardPage() {
  const { user, isGuest, loading, logout } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading && isGuest) router.push("/");
  }, [loading, isGuest, router]);

  // Show spinner while auth is resolving
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  // Don't flash content while redirecting guests
  if (isGuest) return null;

  return (
    // Authenticated user dashboard
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome back 👋</h1>
      <p className="text-gray-500 mb-8">{user?.email}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
        <Link
          href="/symptom-check"
          className="block p-6 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition"
        >
          <h2 className="text-xl font-semibold mb-1">Start Symptom Check</h2>
          <p className="text-blue-100 text-sm">
            Get AI-powered triage guidance
          </p>
        </Link>
        <Link
          href="/profile"
          className="block p-6 bg-white border border-gray-200 rounded-2xl hover:border-blue-300 transition"
        >
          <h2 className="text-xl font-semibold text-gray-800 mb-1">
            My Profile
          </h2>
          <p className="text-gray-400 text-sm">
            Update health info & preferences
          </p>
        </Link>
      </div>
      <button
        onClick={async () => {
          const supabase = createClient();
          const {
            data: { session },
          } = await supabase.auth.getSession();
          const res = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/symptom-sessions`,
            {
              headers: { Authorization: `Bearer ${session?.access_token}` },
            },
          );
          console.log("HISTORY:", await res.json());
        }}
        className="mb-4 bg-blue-100 text-blue-600 px-4 py-2 rounded"
      >
        Test History API
      </button>
      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Recent Sessions
        </h2>
        <p className="text-gray-400 text-sm">
          No sessions yet. Start your first symptom check!
        </p>
      </div>

      <button
        onClick={logout}
        className="mt-8 text-sm text-gray-400 hover:text-red-500 transition"
      >
        Sign out
      </button>
    </div>
  );
}
