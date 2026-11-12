"use client";

import { useEffect } from "react";
import { reportProblem } from "@/components/ProblemReporter";

/** Last-resort screen when the whole app fails to load. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    reportProblem(error.message || "App failed to load", error.stack, error.digest);
  }, [error]);
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: "64px 24px", maxWidth: 560, margin: "0 auto", color: "#16201d", background: "#f6f7f5" }}>
        <h1 style={{ fontWeight: 400, fontSize: 28 }}>The Renewal System didn&apos;t load</h1>
        <p style={{ color: "#5b6661" }}>
          It has been reported. Try again in a moment{error.digest ? `, and quote reference ${error.digest} if you tell a Super Admin` : ""}.
        </p>
        <button onClick={reset} style={{ marginTop: 16, padding: "10px 16px", borderRadius: 8, border: 0, background: "#0f5b50", color: "#fff", fontWeight: 600 }}>
          Try again
        </button>
      </body>
    </html>
  );
}
