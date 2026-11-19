"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { BugIcon, CheckIcon, CloseIcon } from "./icons";
import Spinner from "./Spinner";

type Kind = "bug" | "request";
type Urgency = "low" | "medium" | "high";

const URGENCY: { value: Urgency; label: string; hint: string }[] = [
  { value: "low", label: "Low", hint: "When there's time" },
  { value: "medium", label: "Medium", hint: "Getting in the way" },
  { value: "high", label: "High", hint: "Stopping my work" },
];

/**
 * Top-bar button: report a bug or request a change. It's filed straight into the project management system
 * with the page you were on, your name and your browser attached.
 */
export default function FeedbackButton({ dock = false, startOpen = false }: { dock?: boolean; startOpen?: boolean }) {
  const [open, setOpen] = useState(startOpen);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Report a bug or request a change"
        aria-label="Report a bug or request a change"
        className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${dock ? "text-slate-300 hover:bg-white/10 hover:text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-50"}`}
      >
        <BugIcon size={20} />
      </button>
      {/* Rendered on the page body: the top bar's blurred background would otherwise trap the dialog inside it. */}
      {open && typeof document !== "undefined" && createPortal(<FeedbackDialog onClose={() => setOpen(false)} />, document.body)}
    </>
  );
}

function FeedbackDialog({ onClose }: { onClose: () => void }) {
  const pathname = usePathname();
  const [kind, setKind] = useState<Kind>("bug");
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [expected, setExpected] = useState("");
  const [steps, setSteps] = useState("");
  const [urgency, setUrgency] = useState<Urgency>("medium");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState<{ key?: string; saved?: boolean } | null>(null);
  const firstRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    firstRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !busy && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  const page = typeof window !== "undefined" ? window.location.href : pathname;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          title,
          details,
          expected: kind === "bug" && expected.trim() ? expected : undefined,
          steps: kind === "bug" && steps.trim() ? steps : undefined,
          urgency,
          page,
          browser: navigator.userAgent.slice(0, 300),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) setSent({ key: data.key });
      else if (data.saved) setSent({ saved: true });
      else setError(data.error || "That didn't send. Try again.");
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  const label = "mb-1.5 block text-[0.8125rem] font-medium text-slate-700 dark:text-slate-300";
  const optional = <span className="font-normal text-slate-500"> (optional)</span>;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
      <div className="rs-backdrop absolute inset-0 bg-slate-950/40" onClick={() => !busy && onClose()} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="fb-title"
        className="rs-dialog relative flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl border border-slate-200 bg-white shadow-pop dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="flex items-center justify-between px-6 pb-2 pt-5">
          <h2 id="fb-title" className="text-[1.125rem] font-semibold leading-tight tracking-[-0.01em] text-slate-900 dark:text-slate-50">
            {sent ? (sent.saved ? "Saved for the admin" : "Sent, thank you") : "Report a bug or request a change"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="-mr-1.5 flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            aria-label="Close"
          >
            <CloseIcon size={18} />
          </button>
        </div>

        {sent ? (
          <div className="px-6 pb-6">
            <div className="mt-2 flex items-start gap-3 rounded-xl bg-brand-50 p-4 text-[0.875rem] text-slate-700 dark:bg-brand-900/50 dark:text-slate-200">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white"><CheckIcon size={14} /></span>
              <p>
                {sent.saved ? (
                  <>The project tracker couldn&apos;t be reached just now, so your report was kept for the admin to file. You don&apos;t need to send it again.</>
                ) : (
                  <>
                    Your {kind === "bug" ? "bug report" : "request"} is in the project tracker as <strong className="num font-semibold">{sent.key}</strong>. Quote that
                    number if you follow up on it.
                  </>
                )}
              </p>
            </div>
            <div className="mt-5 flex justify-end">
              <button type="button" onClick={onClose} className="btn-primary px-4 py-2 text-[0.875rem]">Done</button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 pb-2 pt-2">
              <div role="radiogroup" aria-label="What is it?" className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
                {([["bug", "Something's wrong"], ["request", "I'd like a change"]] as const).map(([v, l]) => (
                  <button
                    key={v}
                    type="button"
                    role="radio"
                    aria-checked={kind === v}
                    onClick={() => setKind(v)}
                    className={`rounded-lg px-3 py-1.5 text-[0.8125rem] font-medium transition-colors ${kind === v ? "bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-slate-50" : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"}`}
                  >
                    {l}
                  </button>
                ))}
              </div>

              <div>
                <label htmlFor="fb-t" className={label}>{kind === "bug" ? "What's wrong, in a few words?" : "What would you like, in a few words?"}</label>
                <input
                  ref={firstRef}
                  id="fb-t"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={160}
                  required
                  placeholder={kind === "bug" ? "e.g. Export misses contract works" : "e.g. Filter My renewals by insurer"}
                  className="input w-full"
                />
              </div>

              <div>
                <label htmlFor="fb-d" className={label}>{kind === "bug" ? "What happened?" : "Tell us more"}</label>
                <textarea
                  id="fb-d"
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  maxLength={5000}
                  required
                  rows={4}
                  placeholder={kind === "bug" ? "What you did and what you saw, including any error message." : "What it should do, and how it would help your work."}
                  className="input w-full resize-y"
                />
              </div>

              {kind === "bug" && (
                <>
                  <div>
                    <label htmlFor="fb-e" className={label}>What did you expect to happen?{optional}</label>
                    <textarea id="fb-e" value={expected} onChange={(e) => setExpected(e.target.value)} maxLength={2000} rows={2} className="input w-full resize-y" />
                  </div>
                  <div>
                    <label htmlFor="fb-s" className={label}>Steps to make it happen again{optional}</label>
                    <textarea id="fb-s" value={steps} onChange={(e) => setSteps(e.target.value)} maxLength={3000} rows={2} placeholder={"1. Open …\n2. Click …"} className="input w-full resize-y" />
                  </div>
                </>
              )}

              <fieldset>
                <legend className={label}>How urgent is it?</legend>
                <div className="grid grid-cols-3 gap-2">
                  {URGENCY.map((u) => (
                    <label
                      key={u.value}
                      className={`cursor-pointer rounded-xl border px-3 py-2 text-[0.8125rem] transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-500 ${urgency === u.value ? "border-brand-600 bg-brand-50 dark:border-brand-400 dark:bg-brand-900/50" : "border-slate-200 hover:border-slate-300 dark:border-slate-700"}`}
                    >
                      <input type="radio" name="fb-urgency" value={u.value} checked={urgency === u.value} onChange={() => setUrgency(u.value)} className="sr-only" />
                      <span className="block font-medium text-slate-900 dark:text-slate-100">{u.label}</span>
                      <span className="block text-[0.75rem] text-slate-500">{u.hint}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <p className="text-[0.75rem] text-slate-500">Sent with your name, this page ({pathname}) and your browser, so it can be looked into.</p>
              {error && <p className="alert-error" role="alert">{error}</p>}
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4 dark:border-slate-800">
              <button type="button" onClick={onClose} disabled={busy} className="btn-ghost px-4 py-2 text-[0.875rem]">Cancel</button>
              <button type="submit" disabled={busy} aria-busy={busy} className="btn-primary px-4 py-2 text-[0.875rem]">
                {busy && <Spinner />}
                {busy ? "Sending…" : "Send"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
