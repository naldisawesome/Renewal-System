"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Spinner from "@/components/Spinner";
import { UploadIcon, CheckIcon, AlertIcon } from "@/components/icons";

type Result = {
  newCount: number;
  updatedCount: number;
  unchangedCount: number;
  skipped: number;
  contractWorksCount: number;
  renewalsCount: number;
  crossTypeDuplicateCount: number;
  protectedFields: number;
  ignoredColumns: string[];
  fieldCounts: { field: string; count: number }[];
  sampleNew: { clientName: string; policyNumber: string }[];
  sampleUpdates: { clientName: string; changes: { field: string; before: unknown; after: unknown }[] }[];
  fileName: string;
};

const show = (v: unknown) => {
  if (v == null || v === "") return "blank";
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v)) return new Date(v).toLocaleDateString("en-NZ", { timeZone: "UTC" });
  if (typeof v === "number") return v.toLocaleString("en-NZ");
  return String(v);
};

const PORTFOLIOS = [
  { value: "CACTUS", label: "Cactus", color: "var(--cactus)" },
  { value: "BLANKET", label: "Blanket", color: "var(--blanket)" },
];

const MAX_BYTES = 20 * 1024 * 1024;

function size(n: number) {
  return n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;
}

export default function UploadForm() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [company, setCompany] = useState("CACTUS");
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
                {[
                  ["New", result.newCount],
                  ["Updated", result.updatedCount],
                  ["Contract Works", result.contractWorksCount],
                  ["Renewals", result.renewalsCount],
                ].map(([k, v]) => (
                  <div key={k as string}>
                    <dt className="text-[0.75rem] text-slate-500">{k}</dt>
                    <dd className="figure text-[1.5rem] leading-tight">{v as number}</dd>
                  </div>
                ))}
              </dl>
              {result.skipped > 0 && (
                <p className="mt-3 text-[0.8125rem] text-slate-600 dark:text-slate-300">
                  {result.skipped} {result.skipped === 1 ? "row was" : "rows were"} skipped because they had no client or policy number.
                </p>
              )}
              <p className="mt-3 text-[0.8125rem] text-slate-500">Wrong file or portfolio? Undo it from Recent uploads below.</p>
              <div className="mt-4 flex gap-2">
                <Link href="/admin/allocate" className="btn-primary">Allocate new renewals</Link>
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
            {preview.fileName}, {company === "BLANKET" ? "Blanket" : "Cactus"}. Nothing has been saved yet.
          </p>
          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
            {[
              ["New", preview.newCount],
              ["Will change", preview.updatedCount],
              ["Already up to date", preview.unchangedCount],
              ["Skipped rows", preview.skipped],
            ].map(([k, v]) => (
              <div key={k as string}>
                <dt className="text-[0.75rem] text-slate-500">{k}</dt>
                <dd className="figure text-[1.5rem] leading-tight">{v as number}</dd>
              </div>
            ))}
          </dl>

          {preview.fieldCounts.length > 0 && (
            <p className="mt-4 text-[0.8125rem] text-slate-600 dark:text-slate-300">
              <span className="font-medium text-slate-900 dark:text-slate-100">Fields that will change: </span>
              {preview.fieldCounts.map((f) => `${f.field} (${f.count})`).join(", ")}
            </p>
          )}
          {preview.protectedFields > 0 && (
            <p className="mt-2 text-[0.8125rem] text-slate-600 dark:text-slate-300">
              {preview.protectedFields} {preview.protectedFields === 1 ? "value differs" : "values differ"} from what your team entered by hand and will be kept as they are.
            </p>
          )}

          {(preview.sampleUpdates.length > 0 || preview.sampleNew.length > 0) && (
            <details className="mt-4 text-[0.8125rem]">
              <summary className="cursor-pointer font-medium text-brand-700 dark:text-brand-300">See examples</summary>
              <div className="mt-3 grid gap-5 sm:grid-cols-2">
                {preview.sampleUpdates.length > 0 && (
                  <div>
                    <h3 className="mb-1.5 font-medium text-slate-700 dark:text-slate-300">Changes</h3>
                    <ul className="space-y-2">
                      {preview.sampleUpdates.map((u, i) => (
                        <li key={i}>
                          <span className="text-slate-900 dark:text-slate-100">{u.clientName}</span>
                          {u.changes.map((c) => (
                            <span key={c.field} className="block text-slate-500">
                              {c.field}: {show(c.before)} to {show(c.after)}
                            </span>
                          ))}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {preview.sampleNew.length > 0 && (
                  <div>
                    <h3 className="mb-1.5 font-medium text-slate-700 dark:text-slate-300">New renewals</h3>
                    <ul className="space-y-1">
                      {preview.sampleNew.map((n, i) => (
                        <li key={i} className="text-slate-900 dark:text-slate-100">
                          {n.clientName} <span className="text-slate-500">{n.policyNumber}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </details>
          )}

          {preview.ignoredColumns.length > 0 && (
            <p className="mt-4 text-[0.8125rem] text-slate-500">
              Columns in the file that aren&apos;t used: {preview.ignoredColumns.join(", ")}.
            </p>
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
            <button type="button" className="btn-primary" disabled={loading} aria-busy={loading} onClick={() => send("apply")}>
              {loading && <Spinner />}
              Save this upload
            </button>
            <button type="button" className="btn-ghost" disabled={loading} onClick={() => setPreview(null)}>
              Cancel
            </button>
          </div>
        </section>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
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
            <UploadIcon size={22} className="text-slate-400" />
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
          <li>Each row is sorted automatically: rows whose description or class of risk says Contract Works are tagged Contract Works, everything else Renewals.</li>
          <li>You see what will change before anything is saved.</li>
          <li>Re-uploading a file updates renewals already on file. Assignments, status and notes are never changed by an upload, details edited by hand are kept, and a blank cell never erases a value.</li>
          <li>New rows are added as unassigned, ready to allocate.</li>
          <li>The most recent upload can be undone from Recent uploads.</li>
        </ul>
      </section>
    </div>
  );
}
