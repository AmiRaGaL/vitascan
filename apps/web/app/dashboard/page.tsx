"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useUser } from "@/hooks/useUser";
import { createClient } from "@/lib/supabase/client";

interface SessionSummary {
  id: string;
  initial_input: string | null;
  triage_level: string | null;
  red_flags_detected: boolean | null;
  created_at: string;
}

interface TodayUsage {
  symptom_checks_used: number;
  chats_used: number;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export default function DashboardPage() {
  const { user, isGuest, loading, logout } = useUser();
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [usage, setUsage] = useState<TodayUsage | null>(null);
  const [usageError, setUsageError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && isGuest) router.push("/");
  }, [loading, isGuest, router]);

  const loadSessions = useCallback(async () => {
    if (loading || isGuest) return;

    setSessionsLoading(true);
    setSessionsError(null);

    try {
      const token = await getAccessToken();
      const res = await fetch(`${API_URL}/symptom-sessions`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) throw new Error("Failed to load recent sessions");

      const data = (await res.json()) as SessionSummary[];
      setSessions(data);
    } catch (error) {
      setSessionsError(
        error instanceof Error ? error.message : "Failed to load sessions",
      );
    } finally {
      setSessionsLoading(false);
    }
  }, [loading, isGuest]);

  const loadUsage = useCallback(async () => {
    if (loading || isGuest) return;

    setUsageError(null);

    try {
      const token = await getAccessToken();
      const res = await fetch(`${API_URL}/usage/today`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) throw new Error("Failed to load usage");

      const data = (await res.json()) as TodayUsage;
      setUsage(data);
    } catch (error) {
      setUsageError(error instanceof Error ? error.message : "Usage unavailable");
    }
  }, [loading, isGuest]);

  useEffect(() => {
    loadSessions();
    loadUsage();
  }, [loadSessions, loadUsage]);

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

      <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-2">
          Today&apos;s Usage
        </h2>
        {usageError ? (
          <p className="text-sm text-gray-400">{usageError}</p>
        ) : (
          <p className="text-gray-600">
            Symptom checks used:{" "}
            <span className="font-semibold text-gray-900">
              {usage?.symptom_checks_used ?? 0}
            </span>
          </p>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Recent Sessions
        </h2>
        {sessionsLoading ? (
          <p className="text-gray-400 text-sm">Loading recent sessions...</p>
        ) : sessionsError ? (
          <div className="space-y-3">
            <p className="text-red-500 text-sm">{sessionsError}</p>
            <button
              onClick={loadSessions}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition"
            >
              Retry
            </button>
          </div>
        ) : sessions.length === 0 ? (
          <p className="text-gray-400 text-sm">
            No sessions yet. Start your first symptom check!
          </p>
        ) : (
          <div className="divide-y divide-gray-100">
            {sessions.map((session) => (
              <Link
                key={session.id}
                href={`/sessions/${session.id}`}
                className="block py-4 first:pt-0 last:pb-0 hover:bg-gray-50 transition"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-gray-900">
                      {session.initial_input || "Symptom check"}
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      {new Date(session.created_at).toLocaleString()}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                    {session.triage_level?.replace(/_/g, " ") || "Pending"}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
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

async function getAccessToken() {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session?.access_token ?? null;
}
