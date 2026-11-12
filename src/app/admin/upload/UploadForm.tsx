"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Spinner from "@/components/Spinner";
import { UploadIcon, CheckIcon, AlertIcon } from "@/components/icons";

type Scope = "ALL" | "NEW_CONTRACT_WORKS";

type Result = {
  scope: Scope;
  newCount: number;
  newRenewalsCount: number;
  newContractWorksCount: number;
  alreadyOnFileCount: number;
  renewalsLeftOut: number;
  skipped: number;
  crossTypeDuplicateCount: number;
  ignoredColumns: string[];
  badDates?: number;
  sampleNew: { clientName: string; policyNumber: string; bookType: string }[];
  fileName: string;
};

const PORTFOLIOS = [
  { value: "CACTUS", label: "Cactus", color: "var(--cactus)" },
  { value: "BLANKET", label: "Blanket", color: "var(--blanket)" },
];

const SCOPES: { value: Scope; label: string; text: string }[] = [
  {
    value: "ALL",
    label: "New renewals and contract works",
    text: "Adds every renewal and contract works in the file that isn't in the system yet.",
  },
  {
    value: "NEW_CONTRACT_WORKS",
    label: "New contract works only",
    text: "Adds only the contract works that aren't in the system yet. Renewal rows in the file are left out.",
  },
];

/** The four figures shown for a preview or a saved upload. */
const figures = (r: Result, saved: boolean): [string, number][] =>
  r.scope === "NEW_CONTRACT_WORKS"
    ? [
        [saved ? "Contract works added" : "New contract works", r.newContractWorksCount],
        ["Already in the system", r.alreadyOnFileCount],
        ["Renewal rows left out", r.renewalsLeftOut],
        ["Skipped rows", r.skipped],
      ]
    : [
        [saved ? "Renewals added" : "New renewals", r.newRenewalsCount],
        [saved ? "Contract works added" : "New contract works", r.newContractWorksCount],
        ["Already in the system", r.alreadyOnFileCount],
        ["Skipped rows", r.skipped],
      ];
const SCOPE_KEY = "rs-upload-scope";

const MAX_BYTES = 20 * 1024 * 1024;

function size(n: number) {
  return n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;
}

export default function UploadForm() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [company, setCompany] = useState("CACTUS");
  const [scope, setScopeState] = useState<Scope>("ALL");
  // Remember the last choice in this browser, so a monthly re-pull doesn't need choosing every time.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SCOPE_KEY);
      if (saved === "ALL" || saved === "NEW_CONTRACT_WORKS") setScopeState(saved);
    } catch {}
  }, []);
  const setScope = (s: Scope) => {
    setScopeState(s);
    setPreview(null);
    try {
      localStorage.setItem(SCOPE_KEY, s);
    } catch {}
  };
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [preview, setPreview] = useState<Result | null>(null);

  function choose(f: File | null | undefined) {
    setError(null);
    if (!f) return;
    if (!/\.(xlsx|xls|csv)$/i.test(f.name)) {
      setError("Choose an .xlsx, .xls or .csv file.");
      return;
    }
    if (f.size > MAX_BYTES) {
      setError("That file is too large (max 20 MB). Split it into smaller batches and try again.");
      return;
    }
    setFile(f);
    setResult(null);
    setPreview(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await send("preview");
  }

  async function send(mode: "preview" | "apply") {
    setError(null);
    if (!file) {
      setError("Choose a file first.");
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("company", company);
      formData.append("mode", mode);
      formData.append("scope", scope);
      const res = await fetch("/api/upload", { method: "POST", body: formData });

      let data: any = null;
      try {
        data = await res.json();
      } catch {
        throw new Error(
          `The server didn't return a valid response (status ${res.status}). A very large file may have timed out - try again, or split it into smaller batches.`
        );
      }
      if (!res.ok) throw new Error(data?.error || `Upload failed (status ${res.status}).`);

      if (mode === "preview") {
        setPreview({ ...data, fileName: file.name });
      } else {
        setResult({ ...data, fileName: file.name });
        setPreview(null);
        setFile(null);
        router.refresh();
      }
    } catch (err: any) {
      setError(err?.message || "Something went wrong during the upload. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {result && (
        <section className="rs-enter rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900" role="status">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white dark:bg-brand-300 dark:text-slate-950">
              <CheckIcon size={14} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[0.9375rem] font-medium text-slate-900 dark:text-slate-100">Upload saved</p>
              <p className="truncate text-[0.8125rem] text-slate-500">{result.fileName}</p>
              <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
                {figures(result, true).map(([k, v]) => (
                  <div key={k as string}>
                    <dt className="text-[0.75rem] text-slate-500">{k}</dt>
                    <dd className="figure text-[1.5rem] leading-tight">{v as number}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-3 text-[0.8125rem] text-slate-600 dark:text-slate-300">Nothing already in the system was changed.</p>
              {result.skipped > 0 && (
                <p className="mt-3 text-[0.8125rem] text-slate-600 dark:text-slate-300">
                  {result.skipped} {result.skipped === 1 ? "row was" : "rows were"} skipped because they had no client or policy number.
                </p>
              )}
              <p className="mt-3 text-[0.8125rem] text-slate-500">Wrong file or portfolio? Undo it from Recent uploads below.</p>
              <div className="mt-4 flex gap-2">
                <Link href="/admin/renewals?status=UNASSIGNED" className="btn-primary">Assign the new ones</Link>
                <Link href="/admin/renewals" className="btn-ghost">View all renewals</Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {preview && (
        <section aria-labelledby="preview-h" className="rs-enter rounded-xl border border-slate-300 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
          <h2 id="preview-h" className="text-[0.9375rem] font-medium text-slate-900 dark:text-slate-100">Check before saving</h2>
          <p className="truncate text-[0.8125rem] text-slate-500">
            {preview.fileName}, {company === "BLANKET" ? "Blanket" : "Cactus"}{preview.scope === "NEW_CONTRACT_WORKS" ? ", contract works only" : ""}. Nothing has been saved yet.
          </p>
          <p className="mt-3 flex items-start gap-2 rounded-lg bg-brand-50 px-3 py-2 text-[0.8125rem] text-brand-800 dark:bg-brand-900/40 dark:text-brand-100">
            <CheckIcon size={15} className="mt-0.5 shrink-0" />
            Only new rows are added. Nothing already in the system is changed or removed, including allocations, statuses and notes.
          </p>
          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
            {figures(preview, false).map(([k, v]) => (
              <div key={k as string}>
                <dt className="text-[0.75rem] text-slate-500">{k}</dt>
                <dd className="figure text-[1.5rem] leading-tight">{v as number}</dd>
              </div>
            ))}
          </dl>

          {preview.sampleNew.length > 0 && (
            <details className="mt-4 text-[0.8125rem]">
              <summary className="cursor-pointer font-medium text-brand-700 dark:text-brand-300">See examples of what will be added</summary>
              <ul className="mt-3 space-y-1">
                {preview.sampleNew.map((n, i) => (
                  <li key={i} className="text-slate-900 dark:text-slate-100">
                    {n.clientName} <span className="text-slate-500">{n.policyNumber}, {n.bookType === "CONTRACT_WORKS" ? "Contract Works" : "Renewals"}</span>
                  </li>
                ))}
              </ul>
            </details>
          )}

          {preview.ignoredColumns.length > 0 && (
            <p className="mt-4 text-[0.8125rem] text-slate-500">
              Columns in the file that aren&apos;t used: {preview.ignoredColumns.join(", ")}.
            </p>
          )}

          {!!preview.badDates && preview.badDates > 0 && (
            <div className="mt-4 flex gap-3 rounded-lg border border-[#e6d3a8] bg-[#fbf6ea] p-3 text-[0.8125rem] text-[#6b5114] dark:border-[#4a3d1f] dark:bg-[#231d10] dark:text-[#e2c47c]">
              <AlertIcon size={18} className="mt-px shrink-0" />
              <p>
                <strong className="font-medium">{preview.badDates} date{preview.badDates === 1 ? "" : "s"} couldn&apos;t be read.</strong>{" "}
                Those renewals will show no date. Dates written as text should look like 25/12/2026 (day first) or 2026-12-25.
              </p>
            </div>
          )}

          {preview.crossTypeDuplicateCount > 0 && (
            <div className="mt-4 flex gap-3 rounded-lg border border-[#e6d3a8] bg-[#fbf6ea] p-3 text-[0.8125rem] text-[#6b5114] dark:border-[#4a3d1f] dark:bg-[#231d10] dark:text-[#e2c47c]">
              <AlertIcon size={18} className="mt-px shrink-0" />
              <p>
                <strong className="font-medium">
                  {preview.crossTypeDuplicateCount} of the new {preview.crossTypeDuplicateCount === 1 ? "policies shares" : "policies share"} a policy number with a renewal under the other portfolio.
                </strong>{" "}
                Check you chose the right portfolio before saving.
              </p>
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-2">
            <button type="button" className="btn-primary" disabled={loading || preview.newCount === 0} aria-busy={loading} onClick={() => send("apply")}>
              {loading && <Spinner />}
              {preview.newCount === 0 ? "Nothing new to add" : `Add ${preview.newCount} new ${preview.newCount === 1 ? "row" : "rows"}`}
            </button>
            <button type="button" className="btn-ghost" disabled={loading} onClick={() => setPreview(null)}>
              Cancel
            </button>
          </div>
        </section>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <fieldset>
          <legend className="label">What this upload does</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {SCOPES.map((o) => (
              <label
                key={o.value}
                className={`flex cursor-pointer gap-3 rounded-xl border bg-white px-4 py-3.5 transition-colors dark:bg-slate-900 ${
                  scope === o.value
                    ? "border-brand-600 ring-1 ring-brand-600 dark:border-brand-300 dark:ring-brand-300"
                    : "border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700"
                }`}
              >
                <input type="radio" name="scope" value={o.value} checked={scope === o.value} onChange={() => setScope(o.value)} className="mt-1 accent-[color:var(--accent)]" />
                <span>
                  <span className="block text-[0.9375rem] font-medium text-slate-900 dark:text-slate-100">{o.label}</span>
                  <span className="mt-0.5 block text-[0.8125rem] leading-snug text-slate-500 dark:text-slate-400">{o.text}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="label">Portfolio</legend>
          <div className="grid grid-cols-2 gap-3">
            {PORTFOLIOS.map((p) => (
              <label
                key={p.value}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border bg-white px-4 py-3.5 transition-colors dark:bg-slate-900 ${
                  company === p.value
                    ? "border-slate-900 ring-1 ring-slate-900 dark:border-slate-200 dark:ring-slate-200"
                    : "border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700"
                }`}
              >
                <input
                  type="radio"
                  name="company"
                  value={p.value}
                  checked={company === p.value}
                  onChange={() => setCompany(p.value)}
                  className="sr-only"
                />
                <span aria-hidden="true" className="h-3 w-3 rounded-[3px]" style={{ background: p.color }} />
                <span className="text-[0.9375rem] text-slate-900 dark:text-slate-100">{p.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <span className="label">File</span>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              choose(e.dataTransfer.files?.[0]);
            }}
            className={`flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-6 py-10 text-center transition-colors ${
              dragging
                ? "border-brand-500 bg-brand-50 dark:bg-brand-900/30"
                : "border-slate-300 bg-white hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600"
            }`}
          >
            <UploadIcon size={22} className="text-slate-500 dark:text-slate-400" />
            {file ? (
              <>
                <span className="text-[0.9375rem] font-medium text-slate-900 dark:text-slate-100">{file.name}</span>
                <span className="text-[0.8125rem] text-slate-500">{size(file.size)}. Choose a different file</span>
              </>
            ) : (
              <>
                <span className="text-[0.9375rem] text-slate-800 dark:text-slate-100">Drop the export here, or choose a file</span>
                <span className="text-[0.8125rem] text-slate-500">.xlsx, .xls or .csv, up to 20 MB</span>
              </>
            )}
          </button>
          <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => choose(e.target.files?.[0])} />
        </div>

        {error && (
          <p className="rounded-lg border border-[#ecc7c0] bg-[#f8e9e6] px-3 py-2 text-[0.875rem] text-[#8a2f23] dark:border-[#4d2722] dark:bg-[#311c19] dark:text-[#eda499]" role="alert">
            {error}
          </p>
        )}

        <div className="flex items-center gap-4">
          <button type="submit" disabled={loading || !file || !!preview} aria-busy={loading && !preview} className="btn-primary min-w-[10rem]">
            {loading && !preview && <Spinner />}
            {loading && !preview ? "Checking…" : "Check file"}
          </button>
          {loading && <span className="text-[0.8125rem] text-slate-500">Large files can take up to a minute.</span>}
        </div>
      </form>

      <section className="border-t border-slate-200 pt-6 text-[0.875rem] text-slate-600 dark:border-slate-800 dark:text-slate-400">
        <h2 className="section-title mb-2">How uploads work</h2>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Uploads only add. A renewal or contract works already in the system is never changed or removed: its details, status, adviser and underwriter, follow-up and notes stay exactly as they are. So you can pull a month again at any time to pick up rows that were missed.</li>
          <li>A row counts as already in the system when it has the same Id, or the same policy number, renewal date and description, as one stored under either Renewals or Contract Works.</li>
          <li>Each new row is sorted automatically: rows whose description or class of risk says Contract Works are tagged Contract Works, everything else Renewals. New rows start as Not assigned.</li>
          <li>You see what will be added before anything is saved.</li>
          <li>The heading row can be anywhere in the first 15 rows, so exports with a title or a run date above the table work as they are.</li>
          <li>The most recent upload can be undone from Recent uploads. Undo removes only what that upload added, and keeps anything someone has already started working on.</li>
        </ul>
      </section>
    </div>
  );
}
