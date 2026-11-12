"use client";

import { useEffect } from "react";
import { reportProblem } from "@/components/ProblemReporter";

/** Shown when a page fails to load. The problem is reported automatically. */
export default function PageError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    reportProblem(error.message || "Page failed to load", error.stack, error.digest);
  }, [error]);
  return (
    <main className="page-narrow py-24">
      <h1 className="page-title">This page didn&apos;t load</h1>
      <p className="page-sub mt-2">
        Something went wrong on our side. It has been reported. Try again, and if it keeps happening, tell a Super Admin
        {error.digest ? ` and quote reference ${error.digest}` : ""}.
      </p>
      <div className="mt-6 flex gap-2">
        <button type="button" className="btn-primary" onClick={reset}>
          Try again
        </button>
        <a href="/" className="btn-ghost">
          Go to the start page
        </a>
      </div>
    </main>
  );
}
