"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Toast from "@/components/Toast";
import Spinner from "@/components/Spinner";

export default function UploadForm() {
  const router = useRouter();
  const [company, setCompany] = useState("CACTUS");
  const [bookType, setBookType] = useState("RENEWALS");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; kind: "success" | "error" } | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<number | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setDuplicateWarning(null);

    if (!file) {
      setError("Choose a file first.");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("company", company);
      formData.append("bookType", bookType);

      const res = await fetch("/api/upload", { method: "POST", body: formData });

      let data: any = null;
      try {
        data = await res.json();
      } catch {
        throw new Error(
          `The server didn't return a valid response (status ${res.status}). The upload may have timed out on a very large file - try again, or split the file into smaller batches.`
        );
      }

      if (!res.ok) {
        throw new Error(data?.error || `Upload failed (status ${res.status}).`);
      }

      const splitMessage = data.bookTypeFilterApplied
        ? ` (${data.contractWorksCount} tagged Contract Works, ${data.renewalsCount} tagged Renewals)`
        : "";

      setToast({
        message: `Upload complete - ${data.newCount} new renewal${
          data.newCount === 1 ? "" : "s"
        } added, ${data.updatedCount} updated${
          data.skipped > 0 ? `, ${data.skipped} row(s) skipped` : ""
        }.${splitMessage}`,
        kind: "success",
      });

      if (data.crossTypeDuplicateCount > 0) {
        setDuplicateWarning(data.crossTypeDuplicateCount);
      }

      setFile(null);
      router.refresh();
    } catch (err: any) {
      const message = err?.message || "Something went wrong during upload. Please try again.";
      setError(message);
      setToast({ message, kind: "error" });
    } finally {
      // This always runs, even if something above throws - the spinner can
      // never get stuck again.
      setLoading(false);
    }
  }

  return (
    <>
      {toast && <Toast message={toast.message} kind={toast.kind} onClose={() => setToast(null)} />}

      <form onSubmit={handleSubmit} className="card p-6 space-y-5">
        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {duplicateWarning !== null && (
          <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800 space-y-1">
            <p className="font-medium">
              Heads up: {duplicateWarning} of the newly added polic{duplicateWarning === 1 ? "y" : "ies"} share a
              policy number with an existing renewal under a different Portfolio.
            </p>
            <p>
              This usually means the same file was uploaded before under a different Portfolio
              selection. Double-check you picked the right one, and use{" "}
              <Link href="/admin/renewals" className="underline font-medium">
                All Renewals
              </Link>{" "}
              to search and bulk-delete anything that shouldn't be there.
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Portfolio</label>
            <select className="input" value={company} onChange={(e) => setCompany(e.target.value)}>
              <option value="CACTUS">Cactus</option>
              <option value="BLANKET">Blanket</option>
            </select>
          </div>
          <div>
            <label className="label">Type</label>
            <select className="input" value={bookType} onChange={(e) => setBookType(e.target.value)}>
              <option value="RENEWALS">Renewals</option>
              <option value="CONTRACT_WORKS">Contract Works</option>
            </select>
            {bookType === "CONTRACT_WORKS" && (
              <p className="text-xs text-slate-400 mt-1">
                Only rows whose Policy Description / Class of Risk actually says "Contract Works"
                will be tagged Contract Works. Every other row in the file is tagged Renewals
                automatically - no need to split the file yourself.
              </p>
            )}
          </div>
        </div>

        <div>
          <label className="label">File (.xlsx or .csv)</label>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-md file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-brand-700 hover:file:bg-brand-100"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          {file && <p className="text-xs text-slate-400 mt-1">Selected: {file.name}</p>}
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading && <Spinner className="mr-2" />}
          {loading ? "Uploading..." : "Upload and sort"}
        </button>
      </form>
    </>
  );
}
