"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useUser } from "@/hooks/useUser";
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

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export default function SessionDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { isGuest, loading } = useUser();
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
        <div className="mt-6 bg-white border border-gray-200 rounded-2xl p-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {error || "Session not found"}
          </h1>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <Link href="/dashboard" className="text-sm text-blue-600 hover:underline">
        Back to dashboard
      </Link>

      <div className="mt-6 bg-white border border-gray-200 rounded-2xl p-6">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {session.initial_input || "Symptom check"}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {new Date(session.created_at).toLocaleString()}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
            {session.triage_level?.replace(/_/g, " ") || "Pending"}
          </span>
        </div>

        <div className="mb-6">
          <button
            type="button"
            onClick={openChat}
            disabled={chatOpening}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            {chatOpening ? "Opening chat..." : "Ask follow-up questions"}
          </button>
          {chatError && <p className="mt-2 text-sm text-red-500">{chatError}</p>}
        </div>

        {error && <p className="mb-4 text-sm text-red-500">{error}</p>}

        {session.red_flags_detected && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
            Warning: red flags were detected in this session.
          </div>
        )}

        <div className="space-y-5">
          <Detail label="Suggested specialty" value={session.specialty_suggestion} />
          <Detail
            label="LLM confidence"
            value={
              session.llm_confidence === null
                ? null
                : `${session.llm_confidence}%`
            }
          />
          <Detail label="Summary" value={session.summary} />

          <JsonBlock label="User answers" value={session.user_answers} />
          <JsonBlock
            label="Health profile snapshot"
            value={session.health_profile_snapshot}
          />
        </div>
      </div>

      <section className="mt-6 bg-white border border-gray-200 rounded-2xl p-6">
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

function Detail({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-gray-500">{label}</h2>
      <p className="mt-1 text-gray-900">{value || "Not provided"}</p>
    </div>
  );
}

function JsonBlock({ label, value }: { label: string; value: unknown }) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-gray-500">{label}</h2>
      <pre className="mt-2 overflow-x-auto rounded-lg bg-gray-950 p-4 text-sm text-gray-100">
        {JSON.stringify(value ?? null, null, 2)}
      </pre>
    </div>
  );
}
