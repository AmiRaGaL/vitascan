"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { MedicalDisclaimer } from "@/components/MedicalDisclaimer";
import { normalizeTriageLevel, TriageBadge } from "@/components/TriageBadge";
import { useUser } from "@/hooks/useUser";
import { API_URL } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";

interface SavedSession {
  id: string;
  initial_input: string | null;
  created_at: string;
  triage_level: string | null;
  specialty_suggestion: string | null;
  llm_confidence: number | null;
  red_flags_detected: boolean;
  summary: string | null;
  user_answers: unknown;
  health_profile_snapshot: unknown;
}

interface Recipe {
  id: string;
  title: string;
  ingredients: string[];
  instructions: string;
  tags: string[];
  diet_labels: string[];
  source_url: string | null;
}


export default function SessionDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { isGuest, loading } = useUser();
  const autoPrintStarted = useRef(false);
  const id = useMemo(() => {
    const value = params.id;
    return Array.isArray(value) ? value[0] : value;
  }, [params.id]);

  const [session, setSession] = useState<SavedSession | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [recipesLoading, setRecipesLoading] = useState(true);
  const [recipesError, setRecipesError] = useState<string | null>(null);
  const [chatOpening, setChatOpening] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!loading && isGuest) router.push("/");
  }, [loading, isGuest, router]);

  useEffect(() => {
    if (loading || isGuest || !id) return;

    const loadSessionAndRecipes = async () => {
      setSessionLoading(true);
      setRecipesLoading(true);
      setNotFound(false);
      setError(null);
      setRecipesError(null);

      try {
        const supabase = createClient();
        const {
          data: { session: authSession },
        } = await supabase.auth.getSession();

        const res = await fetch(`${API_URL}/symptom-sessions/${id}`, {
          headers: {
            ...(authSession?.access_token
              ? { Authorization: `Bearer ${authSession.access_token}` }
              : {}),
          },
        });

        if (res.status === 404) {
          setNotFound(true);
          setSession(null);
          setRecipes([]);
          setRecipesLoading(false);
          return;
        }

        if (!res.ok) throw new Error("Failed to load session");

        const data = (await res.json()) as SavedSession | null;
        if (!data) {
          setNotFound(true);
          setSession(null);
          setRecipes([]);
          setRecipesLoading(false);
          return;
        }

        setSession(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load session");
        setRecipes([]);
        setRecipesLoading(false);
        return;
      } finally {
        setSessionLoading(false);
      }

      try {
        const supabase = createClient();
        const {
          data: { session: authSession },
        } = await supabase.auth.getSession();

        const recipesRes = await fetch(
          `${API_URL}/symptom-sessions/${id}/recipes`,
          {
            headers: {
              ...(authSession?.access_token
                ? { Authorization: `Bearer ${authSession.access_token}` }
                : {}),
            },
          },
        );

        if (!recipesRes.ok) throw new Error("Failed to load recipes");

        const recipeData = (await recipesRes.json()) as Recipe[];
        setRecipes(recipeData);
      } catch (err) {
        setRecipes([]);
        setRecipesError(
          err instanceof Error ? err.message : "Failed to load recipes",
        );
      } finally {
        setRecipesLoading(false);
      }
    };

    loadSessionAndRecipes();
  }, [loading, isGuest, id]);

  const openChat = useCallback(async () => {
    if (!id) return;

    setChatOpening(true);
    setChatError(null);

    try {
      const supabase = createClient();
      const {
        data: { session: authSession },
      } = await supabase.auth.getSession();

      const res = await fetch(`${API_URL}/chat/threads`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authSession?.access_token
            ? { Authorization: `Bearer ${authSession.access_token}` }
            : {}),
        },
        body: JSON.stringify({ symptom_session_id: id }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.message || "Failed to open follow-up chat");
      }

      router.push(`/sessions/${id}/chat`);
    } catch (err) {
      setChatError(
        err instanceof Error ? err.message : "Failed to open follow-up chat",
      );
    } finally {
      setChatOpening(false);
    }
  }, [id, router]);

  useEffect(() => {
    if (
      autoPrintStarted.current ||
      loading ||
      sessionLoading ||
      !session
    ) {
      return;
    }

    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get("print") !== "1") return;

    autoPrintStarted.current = true;
    window.setTimeout(() => window.print(), 250);
  }, [loading, session, sessionLoading]);

  const copySummary = useCallback(async () => {
    if (!session) return;

    setCopyMessage(null);

    try {
      await navigator.clipboard.writeText(buildSessionSummaryText(session));
      setCopyMessage("Summary copied.");
    } catch {
      setCopyMessage("Unable to copy summary.");
    }
  }, [session]);

  const deleteSession = useCallback(async () => {
    if (!id) return;

    const confirmed = window.confirm(
      "Delete this saved symptom check? This cannot be undone.",
    );
    if (!confirmed) return;

    setDeleting(true);
    setError(null);

    try {
      const token = await getAccessToken();
      const res = await fetch(`${API_URL}/symptom-sessions/${id}`, {
        method: "DELETE",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.message || "Failed to delete session");
      }

      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete session");
      setDeleting(false);
    }
  }, [id, router]);

  if (loading || sessionLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (isGuest) return null;

  if (notFound || !session) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10">
        <Link href="/dashboard" className="text-sm text-blue-600 hover:underline">
          Back to dashboard
        </Link>
        <div className="mt-6 bg-white border border-gray-200 rounded-2xl p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            {error || "Session not found"}
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            This session may have been removed or may not belong to your account.
          </p>
          <Link
            href="/dashboard"
            className="mt-5 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
          >
            Return to dashboard
          </Link>
        </div>
      </div>
    );
  }

  const normalizedLevel = normalizeTriageLevel(session.triage_level);
  const showEmergencyGuidance =
    session.red_flags_detected ||
    normalizedLevel === "emergency" ||
    normalizedLevel === "er";

  return (
    <div className="session-print-root max-w-3xl mx-auto px-4 py-10">
      <Link
        href="/dashboard"
        className="print-hidden text-sm text-blue-600 hover:underline"
      >
        Back to dashboard
      </Link>

      <div className="print-card mt-6 bg-white border border-gray-200 rounded-2xl p-6">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {session.initial_input || "Symptom check"}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {new Date(session.created_at).toLocaleString()}
            </p>
          </div>
          <TriageBadge level={session.triage_level} />
        </div>

        <MedicalDisclaimer className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-3" />

        {showEmergencyGuidance && (
          <section className="mb-6 rounded-lg border border-red-300 bg-red-50 p-5 text-red-900">
            <h2 className="text-lg font-semibold">Urgent care guidance</h2>
            <p className="mt-2 text-sm leading-6">
              This may require urgent or emergency care. Call emergency
              services or go to the nearest ER if symptoms are severe, sudden,
              or worsening.
            </p>
          </section>
        )}

        <div className="print-hidden mb-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-blue-300 hover:text-blue-700"
          >
            Print summary
          </button>
          <button
            type="button"
            onClick={copySummary}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-blue-300 hover:text-blue-700"
          >
            Copy summary
          </button>
          <button
            type="button"
            onClick={openChat}
            disabled={chatOpening}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            {chatOpening ? "Opening chat..." : "Ask follow-up questions"}
          </button>
          <button
            type="button"
            onClick={deleteSession}
            disabled={deleting}
            className="rounded-lg border border-red-100 px-4 py-2 text-sm font-medium text-red-600 transition hover:border-red-200 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
        {copyMessage && (
          <p
            className={`print-hidden mb-4 text-sm ${
              copyMessage.includes("copied") ? "text-green-600" : "text-red-500"
            }`}
          >
            {copyMessage}
          </p>
        )}
        {chatError && (
          <p className="print-hidden mb-4 text-sm text-red-500">{chatError}</p>
        )}

        {error && <p className="mb-4 text-sm text-red-500">{error}</p>}

        <div className="space-y-6">
          <SessionSection title="Overview">
            <div className="grid gap-4 sm:grid-cols-2">
              <Detail
                label="Session"
                value={session.initial_input || "Symptom check"}
              />
              <Detail
                label="Date"
                value={new Date(session.created_at).toLocaleString()}
              />
              <Detail
                label="Triage level"
                value={formatTriageLevel(session.triage_level)}
              />
              <Detail
                label="LLM confidence"
                value={
                  session.llm_confidence === null
                    ? null
                    : `${session.llm_confidence}%`
                }
              />
            </div>
          </SessionSection>

          <SessionSection title="Recommended care">
            <div className="space-y-4">
              <Detail
                label="Suggested specialty"
                value={session.specialty_suggestion}
              />
              <Detail label="Summary / advice" value={session.summary} />
            </div>
          </SessionSection>

          <SessionSection title="Red flags">
            <p
              className={`text-sm font-medium ${
                session.red_flags_detected ? "text-red-700" : "text-gray-700"
              }`}
            >
              {session.red_flags_detected
                ? "Red flags were detected in this session."
                : "No red flags were detected in this session."}
            </p>
          </SessionSection>

          <SessionSection title="Answers">
            <JsonBlock value={session.user_answers} />
          </SessionSection>

          <SessionSection title="Health profile snapshot">
            <JsonBlock value={session.health_profile_snapshot} />
          </SessionSection>
        </div>
      </div>

      <section className="print-hidden mt-6 bg-white border border-gray-200 rounded-2xl p-6">
        <div className="mb-5">
          <h2 className="text-xl font-bold text-gray-900">
            Recommended recipes
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Recipes are general wellness suggestions and not medical treatment.
          </p>
        </div>

        {recipesLoading ? (
          <p className="text-sm text-gray-400">Loading recommended recipes...</p>
        ) : recipesError ? (
          <p className="text-sm text-red-500">{recipesError}</p>
        ) : recipes.length === 0 ? (
          <p className="text-sm text-gray-400">
            No recipe recommendations are available for this session yet.
          </p>
        ) : (
          <div className="space-y-5">
            {recipes.map((recipe) => (
              <article
                key={recipe.id}
                className="border-t border-gray-100 pt-5 first:border-t-0 first:pt-0"
              >
                <h3 className="text-lg font-semibold text-gray-900">
                  {recipe.title}
                </h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {[...recipe.tags, ...recipe.diet_labels].map((label) => (
                    <span
                      key={`${recipe.id}-${label}`}
                      className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700"
                    >
                      {label}
                    </span>
                  ))}
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-500">
                      Ingredients
                    </h4>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-700">
                      {recipe.ingredients.map((ingredient) => (
                        <li key={`${recipe.id}-${ingredient}`}>
                          {ingredient}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-500">
                      Instructions
                    </h4>
                    <p className="mt-2 text-sm leading-6 text-gray-700">
                      {recipe.instructions}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function SessionSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="border-t border-gray-100 pt-5 first:border-t-0 first:pt-0">
      <h2 className="mb-3 text-lg font-semibold text-gray-900">{title}</h2>
      {children}
    </section>
  );
}

function Detail({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-gray-500">{label}</h2>
      <p className="mt-1 text-gray-900">{value || "Not provided"}</p>
    </div>
  );
}

function JsonBlock({ value }: { value: unknown }) {
  return (
    <pre className="overflow-x-auto rounded-lg bg-gray-950 p-4 text-sm text-gray-100">
      {JSON.stringify(value ?? null, null, 2)}
    </pre>
  );
}

function formatTriageLevel(level: string | null) {
  if (!level) return "Pending";
  if (level === "er" || level === "emergency") return "ER";
  return level.replace(/_/g, " ");
}

function buildSessionSummaryText(session: SavedSession) {
  return [
    `VitaScan session summary`,
    ``,
    `Symptom/session: ${session.initial_input || "Symptom check"}`,
    `Date: ${new Date(session.created_at).toLocaleString()}`,
    `Triage level: ${formatTriageLevel(session.triage_level)}`,
    `Red flags detected: ${session.red_flags_detected ? "Yes" : "No"}`,
    `Specialty suggestion: ${session.specialty_suggestion || "Not provided"}`,
    ``,
    `Summary/advice:`,
    session.summary || "Not provided",
    ``,
    `User answers:`,
    JSON.stringify(session.user_answers ?? null, null, 2),
  ].join("\n");
}

async function getAccessToken() {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session?.access_token ?? null;
}
