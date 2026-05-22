"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MedicalDisclaimer } from "@/components/MedicalDisclaimer";
import { useUser } from "@/hooks/useUser";

export default function HomePage() {
  const { isGuest, loading, loginWithGoogle, loginWithPassword } = useUser();
  const router = useRouter();

  const [showSecretModal, setShowSecretModal] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  const clickTimestamps = useRef<number[]>([]);
  const handleSecretTap = () => {
    const now = Date.now();
    clickTimestamps.current = [...clickTimestamps.current, now].filter(
      (t) => now - t < 3000,
    );
    if (clickTimestamps.current.length >= 5) {
      clickTimestamps.current = [];
      setShowSecretModal(true);
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);
    const { error } = await loginWithPassword(email, password);
    setAuthLoading(false);
    if (error) setAuthError(error);
    else setShowSecretModal(false);
  };

  useEffect(() => {
    if (!loading && !isGuest) router.push("/dashboard");
  }, [loading, isGuest, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] overflow-hidden bg-gradient-to-br from-blue-50 via-white to-purple-50 px-4 py-10 text-gray-900 sm:px-6 lg:px-8">
      <section className="mx-auto grid max-w-6xl items-center gap-8 lg:grid-cols-[1.08fr_0.92fr]">
        <div className="rounded-[2rem] border border-white/80 bg-white/90 p-6 shadow-2xl shadow-blue-950/10 backdrop-blur sm:p-8 lg:p-10">
          <button
            type="button"
            className="mb-6 inline-flex select-none items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700"
            onClick={handleSecretTap}
            aria-label="VitaScan"
          >
            <span aria-hidden="true">🩺</span>
            AI-guided symptom check
          </button>

          <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-normal text-gray-950 sm:text-5xl lg:text-6xl">
            Understand your symptoms and choose a safer next step
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-gray-600">
            VitaScan asks a few guided questions, looks for warning signs, and
            gives educational next-step guidance you can use to decide what to
            do next.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/symptom-check"
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-blue-600 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Start a symptom check
            </Link>
            <button
              type="button"
              onClick={loginWithGoogle}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-6 py-3 text-base font-semibold text-gray-800 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Sign in with Google
            </button>
          </div>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-gray-500">
            No account is needed for a basic check. Sign in to save sessions,
            manage your profile, and ask follow-up questions.
          </p>
        </div>

        <aside className="rounded-[2rem] border border-white/80 bg-white/75 p-6 shadow-xl shadow-purple-950/10 backdrop-blur sm:p-8">
          <div className="rounded-3xl bg-gradient-to-br from-blue-600 to-purple-600 p-6 text-white shadow-lg shadow-blue-900/20">
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-100">
              What to expect
            </p>
            <h2 className="mt-3 text-2xl font-bold">
              A calm check-in when symptoms feel uncertain
            </h2>
            <p className="mt-3 text-sm leading-6 text-blue-50">
              Work through the questions at your own pace, then review guidance
              that keeps safety and next steps front and center.
            </p>
          </div>

          <div className="mt-5 grid gap-3">
            {[
              "Free basic check for guests",
              "Warning signs highlighted clearly",
              "Saved history and chat when signed in",
            ].map((item) => (
              <div
                key={item}
                className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 text-sm font-medium text-gray-700 shadow-sm"
              >
                <span
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-green-50 text-green-700"
                  aria-hidden="true"
                >
                  ✓
                </span>
                {item}
              </div>
            ))}
          </div>
        </aside>
      </section>

      <section className="mx-auto mt-10 max-w-6xl">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            ["1", "Choose where symptoms are happening"],
            ["2", "Answer a few guided questions"],
            ["3", "Review safe next-step guidance"],
          ].map(([number, title]) => (
            <div
              key={number}
              className="rounded-2xl border border-gray-100 bg-white/85 p-5 shadow-sm"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                {number}
              </div>
              <h2 className="text-lg font-semibold text-gray-950">{title}</h2>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-8 grid max-w-6xl gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          [
            "Understand possible next steps",
            "See educational guidance for home care, primary care, urgent care, or emergency care.",
          ],
          [
            "Prepare for a doctor visit",
            "Keep answers and care-prep notes in one place so the conversation is easier.",
          ],
          [
            "Save sessions when signed in",
            "Return to your symptom checks, profile context, and usage history.",
          ],
          [
            "Ask follow-up questions",
            "Use saved session context to ask practical questions after a completed check.",
          ],
        ].map(([title, description]) => (
          <article
            key={title}
            className="rounded-2xl border border-gray-100 bg-white/85 p-5 shadow-sm transition hover:shadow-md"
          >
            <h2 className="text-base font-semibold text-gray-950">{title}</h2>
            <p className="mt-3 text-sm leading-6 text-gray-600">
              {description}
            </p>
          </article>
        ))}
      </section>

      <section className="mx-auto mt-8 max-w-6xl rounded-2xl border border-amber-200 bg-amber-50/90 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-amber-950">
          Safety comes first
        </h2>
        <div className="mt-3 grid gap-3 text-sm leading-6 text-amber-900 md:grid-cols-3">
          <p>VitaScan is educational only.</p>
          <p>It does not diagnose or prescribe treatment.</p>
          <p>
            For severe or emergency symptoms, call emergency services or seek
            urgent care.
          </p>
        </div>
      </section>

      <MedicalDisclaimer className="mx-auto mt-6 max-w-3xl text-center text-gray-500" />

      {showSecretModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm mx-4">
            <h2 className="text-lg font-semibold text-gray-800 mb-1">
              Admin Sign In
            </h2>
            <p className="text-sm text-gray-400 mb-6">Password-based access</p>

            <form
              onSubmit={handlePasswordLogin}
              className="flex flex-col gap-4"
            >
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                className="px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              {authError && (
                <p className="text-sm text-red-500 text-left">{authError}</p>
              )}

              <button
                type="submit"
                disabled={authLoading}
                className="px-4 py-3 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-700 transition disabled:opacity-50"
              >
                {authLoading ? "Signing in..." : "Sign In"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowSecretModal(false);
                  setAuthError(null);
                  setEmail("");
                  setPassword("");
                }}
                className="text-sm text-gray-400 hover:text-gray-600 transition"
              >
                Cancel
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
