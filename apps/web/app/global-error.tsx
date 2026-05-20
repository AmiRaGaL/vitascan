"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("VitaScan global error", {
      message: error.message,
      digest: error.digest,
    });
  }, [error]);

  return (
    <html lang="en">
      <body>
        <main style={{ margin: "0 auto", maxWidth: 640, padding: 24 }}>
          <h1>VitaScan hit a snag</h1>
          <p>
            Something went wrong while loading the app. Please try again or
            return home.
          </p>
          <button type="button" onClick={reset}>
            Try again
          </button>
          <p>
            <a href="/">Home</a>
          </p>
        </main>
      </body>
    </html>
  );
}
