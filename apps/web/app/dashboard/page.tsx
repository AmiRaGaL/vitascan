"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TriageBadge } from "@/components/TriageBadge";
import { useUser } from "@/hooks/useUser";
import { createClient } from "@/lib/supabase/client";

interface SessionSummary {
  id: string;
  initial_input: string | null;
  triage_level: string | null;
  specialty_suggestion: string | null;
  red_flags_detected: boolean | null;
  created_at: string;
}

interface TodayUsage {
  symptom_checks_used: number;
  chats_used: number;
  symptom_checks_limit: number;
  chats_limit: number | null;
}

interface ProfileStatus {
  exists: boolean;
  complete: boolean;
  missingFields: string[];
}

type TriageFilter = "all" | "home" | "pcp" | "urgent_care" | "er";
type SessionSort = "newest" | "oldest" | "urgency";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

const TRIAGE_FILTERS: Array<{ value: TriageFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "home", label: "Home" },
  { value: "pcp", label: "PCP" },
  { value: "urgent_care", label: "Urgent Care" },
  { value: "er", label: "ER" },
];

const URGENCY_RANK: Record<string, number> = {
  er: 4,
  emergency: 4,
  urgent_care: 3,
  pcp: 2,
  home: 1,
};

export default function DashboardPage() {
  const { user, isGuest, loading, logout } = useUser();
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [usage, setUsage] = useState<TodayUsage | null>(null);
  const [usageError, setUsageError] = useState<string | null>(null);
  const [profileStatus, setProfileStatus] = useState<ProfileStatus | null>(null);
  const [sessionSearch, setSessionSearch] = useState("");
  const [triageFilter, setTriageFilter] = useState<TriageFilter>("all");
  const [sessionSort, setSessionSort] = useState<SessionSort>("newest");
  const symptomLimit = usage?.symptom_checks_limit ?? 5;
  const symptomUsed = usage?.symptom_checks_used ?? 0;
  const isAtSymptomLimit = symptomUsed >= symptomLimit;
  const isNearSymptomLimit = !isAtSymptomLimit && symptomLimit - symptomUsed <= 1;
  const chatLimit = usage?.chats_limit ?? 10;
  const chatUsed = usage?.chats_used ?? 0;
  const isNearChatLimit =
    !!usage &&
    usage.chats_limit !== null &&
    chatLimit - chatUsed <= 2 &&
    chatUsed < chatLimit;
  const hasSessionFilters =
    sessionSearch.trim().length > 0 || triageFilter !== "all";
  const visibleSessions = useMemo(() => {
    const query = sessionSearch.trim().toLowerCase();

    return sessions
      .filter((session) => {
        const normalizedLevel = normalizeTriageForFilter(session.triage_level);
        const matchesFilter =
          triageFilter === "all" || normalizedLevel === triageFilter;
        const matchesSearch =
          !query ||
          [
            session.initial_input,
            session.triage_level,
            normalizedLevel,
            session.specialty_suggestion,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(query);

        return matchesFilter && matchesSearch;
      })
      .sort((a, b) => sortSessions(a, b, sessionSort));
  }, [sessionSearch, sessionSort, sessions, triageFilter]);

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

  const loadProfileStatus = useCallback(async () => {
    if (loading || isGuest) return;

    try {
      const token = await getAccessToken();
      const res = await fetch(`${API_URL}/profile/status`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) return;

      const data = (await res.json()) as ProfileStatus;
      setProfileStatus(data);
    } catch {
      setProfileStatus(null);
    }
  }, [loading, isGuest]);

  useEffect(() => {
    loadSessions();
    loadUsage();
    loadProfileStatus();
  }, [loadSessions, loadUsage, loadProfileStatus]);

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

      {profileStatus && !profileStatus.complete && (
        <div className="mb-6 rounded-2xl border border-blue-100 bg-blue-50 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-blue-950">
                Complete your health profile for better symptom guidance.
              </h2>
              <p className="mt-1 text-sm text-blue-700">
                It only needs a few basics, and you can update it anytime.
              </p>
            </div>
            <Link
              href="/profile"
              className="inline-flex shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
            >
              Complete profile
            </Link>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
        {isAtSymptomLimit ? (
          <div className="block rounded-2xl bg-gray-200 p-6 text-gray-500">
            <h2 className="mb-1 text-xl font-semibold">Start Symptom Check</h2>
            <p className="text-sm">
              Daily limit reached. You can start again tomorrow.
            </p>
          </div>
        ) : (
          <Link
            href="/symptom-check"
            className="block rounded-2xl bg-blue-600 p-6 text-white transition hover:bg-blue-700"
          >
            <h2 className="mb-1 text-xl font-semibold">Start Symptom Check</h2>
            <p className="text-sm text-blue-100">
              Get AI-powered triage guidance
            </p>
          </Link>
        )}
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
          <div className="space-y-2 text-gray-600">
            <UsageLine
              label="Symptom checks"
              used={symptomUsed}
              limit={symptomLimit}
            />
            <UsageLine
              label="Follow-up chats"
              used={chatUsed}
              limit={usage?.chats_limit ?? null}
            />
            {isNearSymptomLimit && (
              <p className="text-sm text-amber-700">
                You have one symptom check left today.
              </p>
            )}
            {isAtSymptomLimit && (
              <p className="text-sm text-red-600">
                You have reached today&apos;s symptom check limit.
              </p>
            )}
            {isNearChatLimit && (
              <p className="text-sm text-amber-700">
                You are close to today&apos;s chat limit.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">
              Recent Sessions
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {hasSessionFilters
                ? `${visibleSessions.length} of ${sessions.length} sessions shown`
                : `${sessions.length} total sessions`}
            </p>
          </div>
        </div>

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
          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center">
            <p className="text-sm text-gray-500">
              No sessions yet. Your completed symptom checks will show up here.
            </p>
            {!isAtSymptomLimit && (
              <Link
                href="/symptom-check"
                className="mt-4 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
              >
                Start your first symptom check
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="mb-4 space-y-3">
              <input
                type="search"
                value={sessionSearch}
                onChange={(event) => setSessionSearch(event.target.value)}
                placeholder="Search sessions, triage, or specialty..."
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-2">
                  {TRIAGE_FILTERS.map((filter) => (
                    <button
                      key={filter.value}
                      type="button"
                      onClick={() => setTriageFilter(filter.value)}
                      className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                        triageFilter === filter.value
                          ? "border-blue-600 bg-blue-50 text-blue-700"
                          : "border-gray-200 bg-white text-gray-600 hover:border-blue-300 hover:text-blue-700"
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>

                <select
                  value={sessionSort}
                  onChange={(event) =>
                    setSessionSort(event.target.value as SessionSort)
                  }
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="urgency">Highest urgency first</option>
                </select>
              </div>
            </div>

            {visibleSessions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center">
                <p className="text-sm text-gray-500">
                  No sessions match your search or filters.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSessionSearch("");
                    setTriageFilter("all");
                  }}
                  className="mt-4 rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-700 ring-1 ring-gray-200 transition hover:text-blue-700 hover:ring-blue-200"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <SessionList sessions={visibleSessions} />
            )}
          </>
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

function SessionList({ sessions }: { sessions: SessionSummary[] }) {
  return (
    <div className="divide-y divide-gray-100">
      {sessions.map((session) => (
        <article key={session.id} className="py-4 first:pt-0 last:pb-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-medium text-gray-900">
                {session.initial_input || "Symptom check"}
              </p>
              <p className="mt-1 text-sm text-gray-500">
                {new Date(session.created_at).toLocaleString()}
              </p>
              {session.specialty_suggestion && (
                <p className="mt-1 text-sm text-gray-500">
                  Specialty: {session.specialty_suggestion}
                </p>
              )}
            </div>
            <TriageBadge level={session.triage_level} />
          </div>
          <div className="mt-3 flex gap-2">
            <Link
              href={`/sessions/${session.id}`}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:border-blue-300 hover:text-blue-700"
            >
              View
            </Link>
            <Link
              href={`/sessions/${session.id}?print=1`}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:border-blue-300 hover:text-blue-700"
            >
              Print
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}

function UsageLine({
  label,
  used,
  limit,
}: {
  label: string;
  used: number;
  limit: number | null;
}) {
  return (
    <p>
      {label}:{" "}
      <span className="font-semibold text-gray-900">
        {used}
        {limit === null ? "" : `/${limit}`}
      </span>
      {limit === null && <span className="text-gray-400"> / no daily cap</span>}
    </p>
  );
}

function normalizeTriageForFilter(level: string | null | undefined): TriageFilter {
  if (level === "emergency" || level === "er") return "er";
  if (level === "urgent_care") return "urgent_care";
  if (level === "pcp") return "pcp";
  if (level === "home") return "home";
  return "all";
}

function sortSessions(
  a: SessionSummary,
  b: SessionSummary,
  sort: SessionSort,
) {
  if (sort === "oldest") {
    return (
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }

  if (sort === "urgency") {
    const urgencyDiff =
      (URGENCY_RANK[normalizeTriageForFilter(b.triage_level)] ?? 0) -
      (URGENCY_RANK[normalizeTriageForFilter(a.triage_level)] ?? 0);
    if (urgencyDiff !== 0) return urgencyDiff;
  }

  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
}

async function getAccessToken() {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session?.access_token ?? null;
}
