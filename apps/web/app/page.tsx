"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MedicalDisclaimer } from "@/components/MedicalDisclaimer";
import { useUser } from "@/hooks/useUser";

export default function HomePage() {
  const { isGuest, loading, loginWithGoogle, loginWithPassword } = useUser();
  const router = useRouter();

  // Secret modal state
  const [showSecretModal, setShowSecretModal] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // Secret tap counter — 5 clicks within 3s on the emoji
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
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] px-4 text-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Secret trigger — no visual hint, just the emoji */}
      <div
        className="mb-6 text-6xl select-none cursor-default"
        onClick={handleSecretTap}
        aria-hidden="true"
      >
        🩺
      </div>

      <h1 className="text-4xl font-bold text-gray-900 mb-4">
        Know What Your Body Is Telling You
      </h1>
      <p className="text-gray-500 text-lg max-w-xl mb-10">
        VitaScan uses AI to help you understand your symptoms and decide your
        next step — no appointment needed.
      </p>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <Link
          href="/symptom-check"
          className="px-6 py-3 bg-gray-100 text-gray-800 rounded-xl font-medium hover:bg-gray-200 transition"
        >
          Continue as Guest
        </Link>
        <button
          onClick={loginWithGoogle}
          className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition flex items-center gap-2"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
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
          Login with Google
        </button>
      </div>

      <div className="flex gap-6 text-sm text-gray-400 mb-10">
        <span>✓ Free to use</span>
        <span>✓ No account required for basic check</span>
        <span>✓ AI-powered triage</span>
      </div>

      <MedicalDisclaimer className="max-w-lg text-gray-400" />

      {/* Secret password modal — invisible to regular users */}
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
                {authLoading ? "Signing in…" : "Sign In"}
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
