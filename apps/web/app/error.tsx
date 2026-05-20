"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ErrorState } from "@/components/ErrorState";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("VitaScan page error", {
      message: error.message,
      digest: error.digest,
    });
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[calc(100vh-64px)] max-w-2xl flex-col justify-center px-4 py-10">
      <ErrorState
        title="VitaScan hit a snag"
        message="Something went wrong while loading this page. Please try again or return to the dashboard."
        action={
          <div className="flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={reset}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
            >
              Try again
            </button>
            <Link
              href="/dashboard"
              className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-700 ring-1 ring-gray-200 transition hover:text-blue-700 hover:ring-blue-200"
            >
              Back to dashboard
            </Link>
            <Link
              href="/"
              className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-700 ring-1 ring-gray-200 transition hover:text-blue-700 hover:ring-blue-200"
            >
              Home
            </Link>
          </div>
        }
      />
    </main>
  );
}
