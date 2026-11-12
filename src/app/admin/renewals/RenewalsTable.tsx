"use client";

import { useState } from "react";
import Link from "next/link";
import { StatusBadge, CompanyBadge, BookTypeBadge } from "@/components/Badges";
import NotesButton from "@/components/NotesButton";
import Spinner from "@/components/Spinner";
import SortableTh from "@/components/SortableTh";
import RenewalCards from "@/components/RenewalCards";
import { useRouter } from "next/navigation";
import { dueWindow, daysUntil, dueChip, dueTone } from "@/lib/deadlines";
import { Feature, useFeature } from "@/components/FeatureProvider";

type RenewalRow = {
  stuck?: boolean;
  id: string;
  clientName: string;
  policyNumber: string;
  insurer: string | null;
  company: string;
  bookType: string;
  renewalDate: string | Date | null;
  invoiceTotal: number | null;
  assignedAdviser: { name: string } | null;
  assignedUnderwriter: { name: string } | null;
  status: string;
  _count: { comments: number };
};

export default function RenewalsTable({
  renewals,
  canManage,
  currentParams,
  sortField,
  sortDir,
  advisers = [],
  underwriters = [],
}: {
  advisers?: { id: string; name: string; open?: number }[];
  underwriters?: { id: string; name: string; open?: number }[];
  renewals: RenewalRow[];
  canManage: boolean;
  currentParams: { [key: string]: string | undefined };
  sortField: string;
  sortDir: "asc" | "desc";
}) {
  const router = useRouter();
  const bulkOn = useFeature("bulk_actions");
  const allocateOn = useFeature("allocate");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const allSelected = renewals.length > 0 && selected.size === renewals.length;
  const columnCount = canManage ? 9 : 8;

  function formatCurrency(value: number | null) {
    return value != null ? value.toLocaleString("en-NZ", { style: "currency", currency: "NZD" }) : "—";
  }

  function toggleAll() {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(renewals.map((r) => r.id)));
  }

  function toggleOne(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  // Assign or unassign the selected renewals. Value is "ADVISER:<id>", "UNDERWRITER:<id>", "ADVISER:" (remove) etc.
  const [assignTo, setAssignTo] = useState("");
  const [assignError, setAssignError] = useState<string | null>(null);

  const [handover, setHandover] = useState("");
  async function allocate(body: object): Promise<string | null> {
    try {
      const res = await fetch("/api/renewals/allocate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (res.ok) return null;
      const data = await res.json().catch(() => null);
      return data?.error || "Couldn't assign. Please try again.";
    } catch {
      return "Couldn't reach the server. Check your connection and try again.";
    }
  }

  /** Assign the selected renewals to one person, remove the person, or ("EVEN") share them out starting with whoever has the fewest open. */
  async function bulkAssign() {
    if (!assignTo) return;
    const [kind, value] = assignTo.split(":");
    setAssignError(null);
    setLoading(true);
    const note = handover.trim() || undefined;
    let errors: (string | null)[];
    if (kind === "EVEN") {
      const pool = (value === "UNDERWRITER" ? underwriters : advisers).slice();
      const counts = pool.map((p) => p.open ?? 0);
      const buckets = new Map<string, string[]>();
      for (const id of Array.from(selected)) {
        let min = 0;
        for (let i = 1; i < counts.length; i++) if (counts[i] < counts[min]) min = i;
        counts[min] += 1;
        buckets.set(pool[min].id, [...(buckets.get(pool[min].id) ?? []), id]);
      }
      errors = await Promise.all(Array.from(buckets.entries()).map(([userId, renewalIds]) => allocate({ renewalIds, assignAs: value, userId, note })));
    } else {
      errors = [await allocate({ renewalIds: Array.from(selected), assignAs: kind, userId: value || null, note })];
    }
    setLoading(false);
    const failed = errors.find(Boolean);
    if (failed) {
      router.refresh();
      return setAssignError(failed);
    }
    setAssignTo("");
    setHandover("");
    setSelected(new Set());
    router.refresh();
  }

  const [fuOpen, setFuOpen] = useState(false);
  const [fuDate, setFuDate] = useState("");
  const [fuNote, setFuNote] = useState("");
  const [fuError, setFuError] = useState<string | null>(null);
  const [fuMsg, setFuMsg] = useState<string | null>(null);

  async function bulkFollowUp(clear: boolean) {
    if (!clear && !fuDate) return setFuError("Choose a date.");
    setFuError(null);
    setLoading(true);
    let res: Response | null = null;
    try {
      res = await fetch("/api/renewals/bulk-follow-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ renewalIds: Array.from(selected), date: clear ? null : fuDate, note: fuNote }),
      });
    } catch {}
    setLoading(false);
    const data = res ? await res.json().catch(() => null) : null;
    if (!res || !res.ok) return setFuError(data?.error || "Couldn't save. Please try again.");
    setFuOpen(false);
    setFuDate("");
    setFuNote("");
    setFuMsg(`${clear ? "Cleared" : "Set"} the follow-up on ${data.updated} renewal${data.updated === 1 ? "" : "s"}${data.skipped ? ` (${data.skipped} finished, skipped)` : ""}.`);
    setSelected(new Set());
    router.refresh();
  }

  async function bulkDelete() {
    if (selected.size === 0) return;
    if (
      !confirm(
        `Delete ${selected.size} renewal${selected.size === 1 ? "" : "s"}? This also removes their notes and history. This can't be undone.`
      )
    ) {
      return;
    }
    setLoading(true);
    const res = await fetch("/api/renewals/bulk-delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ renewalIds: Array.from(selected) }),
    });
    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "Could not delete these renewals.");
      return;
    }

    setSelected(new Set());
    router.refresh();
  }

  const sortProps = { currentParams, activeField: sortField, activeDir: sortDir, basePath: "/admin/renewals" };
  const muted = "text-slate-500 dark:text-slate-400";

  return (
    <div>
      {/* Actions for the selected rows float at the bottom of the screen, so they are in reach wherever the list is scrolled to. */}
      {bulkOn && canManage && selected.size > 0 && (
        <div className="rs-dialog no-print fixed inset-x-3 bottom-4 z-30 mx-auto flex max-w-[52rem] flex-col gap-2" role="region" aria-label="Actions for selected renewals">
          {fuOpen && (
        <div className="rs-pop flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-pop dark:border-slate-700 dark:bg-slate-900">
          <label className="block">
            <span className="label">Follow up on</span>
            <input type="date" className="input-sm" value={fuDate} onChange={(e) => setFuDate(e.target.value)} />
          </label>
          <label className="block min-w-[14rem] flex-1">
            <span className="label">Note (optional)</span>
            <input className="input-sm" maxLength={300} value={fuNote} onChange={(e) => setFuNote(e.target.value)} placeholder="Why, e.g. waiting on client docs" />
          </label>
          <button className="btn-primary min-h-[34px] text-[0.8125rem]" disabled={loading} onClick={() => bulkFollowUp(false)}>
            {loading && <Spinner />}
            Apply to {selected.size}
          </button>
          <button className="btn-ghost min-h-[34px] text-[0.8125rem]" disabled={loading} onClick={() => bulkFollowUp(true)}>
            Clear follow-up
          </button>
          {fuError && <p role="alert" className="w-full text-[0.8125rem] text-[#8a2c1f] dark:text-[#f0a89c]">{fuError}</p>}
        </div>
          )}
        <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-ink-900 py-2 pl-4 pr-2 text-white shadow-pop ring-1 ring-white/10">
          <span className="text-[0.875rem]">
            {selected.size} selected
          </span>
          <button onClick={() => setSelected(new Set())} className="rounded-lg px-3 py-1.5 text-[0.8125rem] text-white/80 hover:bg-white/10 hover:text-white ">
            Clear
          </button>
          {allocateOn && (
            <>
          <select
            aria-label="Assign selected to"
            value={assignTo}
            onChange={(e) => setAssignTo(e.target.value)}
            className="h-8 rounded-lg border-0 bg-white/15 px-2 text-[0.8125rem] text-white focus:outline-none [&>*]:text-slate-900"
          >
            <option value="">Assign to…</option>
            <optgroup label="Adviser">
              {advisers.map((a) => (
                <option key={a.id} value={`ADVISER:${a.id}`}>{a.name}{a.open != null ? ` (${a.open} open)` : ""}</option>
              ))}
              <option value="ADVISER:">Remove adviser</option>
            </optgroup>
            <optgroup label="Underwriter">
              {underwriters.map((u) => (
                <option key={u.id} value={`UNDERWRITER:${u.id}`}>{u.name}{u.open != null ? ` (${u.open} open)` : ""}</option>
              ))}
              <option value="UNDERWRITER:">Remove underwriter</option>
            </optgroup>
            <optgroup label="Share evenly">
              {advisers.length > 1 && <option value="EVEN:ADVISER">Between all advisers</option>}
              {underwriters.length > 1 && <option value="EVEN:UNDERWRITER">Between all underwriters</option>}
            </optgroup>
          </select>
          {assignTo && !assignTo.endsWith(":") && (
            <input
              aria-label="Hand-over note (optional)"
              value={handover}
              onChange={(e) => setHandover(e.target.value)}
              maxLength={500}
              placeholder="Hand-over note (optional)"
              className="h-8 min-w-[10rem] flex-1 rounded-lg border-0 bg-white/15 px-2.5 text-[0.8125rem] text-white placeholder:text-white/50 focus:outline-none"
            />
          )}
          {assignTo && (
            <button onClick={bulkAssign} disabled={loading} className="rounded-lg bg-white px-3 py-1.5 text-[0.8125rem] font-medium text-slate-900 hover:bg-white/90 disabled:opacity-60">
              Assign
            </button>
          )}
            </>
          )}
          <button onClick={() => setFuOpen((o) => !o)} aria-expanded={fuOpen} className="rounded-lg bg-white/15 px-3 py-1.5 text-[0.8125rem] font-medium text-white hover:bg-white/25">
            Set follow-up
          </button>
          <button onClick={bulkDelete} disabled={loading} aria-busy={loading} className="inline-flex items-center gap-2 rounded-lg bg-[#c4503f] px-3 py-1.5 text-[0.8125rem] font-medium text-white hover:bg-[#a33a2c] disabled:opacity-60">
            {loading && <Spinner />}
            Delete
          </button>
        </div>
        </div>
      )}
      {assignError && selected.size > 0 && (
        <p role="alert" className="mb-3 text-[0.8125rem] text-[#8a2c1f] dark:text-[#f0a89c]">{assignError}</p>
      )}
      {fuMsg && selected.size === 0 && (
        <p role="status" className="mb-3 text-[0.8125rem] text-slate-600 dark:text-slate-300">{fuMsg}</p>
      )}

      <RenewalCards
        rows={renewals.map((r) => ({ ...r, people: [r.assignedAdviser?.name, r.assignedUnderwriter?.name].filter(Boolean).join(" and ") || "Not assigned" }))}
        empty="No renewals match these filters."
      />
      <div className="tbl-wrap hidden md:block">
        <table className="tbl min-w-[62rem]">
          <thead>
            <tr>
              {canManage && (
                <th className="w-10">
                  <input type="checkbox" aria-label="Select all" checked={allSelected} onChange={toggleAll} className="accent-brand-600" />
                </th>
              )}
              <th>Client and policy</th>
              <SortableTh label="Renews" sortKey="renewalDate" {...sortProps} />
              <th>Status</th>
              <th>Adviser and underwriter</th>
              <th>Insurer</th>
              <SortableTh label="Portfolio" sortKey="bookType" {...sortProps} />
              <th className="text-right">Invoice total</th>
              <th className="w-14">Notes</th>
            </tr>
          </thead>
          <tbody>
            {renewals.map((r) => (
              <tr key={r.id} className={selected.has(r.id) ? "!bg-brand-50 dark:!bg-brand-900/30" : ""}>
                {canManage && (
                  <td>
                    <input
                      type="checkbox"
                      aria-label={`Select ${r.clientName}`}
                      checked={selected.has(r.id)}
                      onChange={() => toggleOne(r.id)}
                      className="accent-brand-600"
                    />
                  </td>
                )}
                <td>
                  <Link
                    href={`/renewals/${r.id}`}
                    title={r.clientName}
                    className="block max-w-[20rem] truncate font-medium text-slate-900 decoration-slate-300 underline-offset-4 hover:underline dark:text-slate-100"
                  >
                    {r.clientName}
                  </Link>
                  <span className="block max-w-[20rem] truncate text-[0.75rem] text-slate-500 dark:text-slate-400" title={r.policyNumber}>
                    {r.policyNumber}
                  </span>
                </td>
                <td className="whitespace-nowrap">
                  <span className="block">
                    {r.renewalDate && new Date(r.renewalDate).getTime() !== 0 ? new Date(r.renewalDate).toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : <span className={muted}>No date</span>}
                  </span>
                  <span className="flex items-center gap-1.5 text-[0.75rem]">
                    {dueWindow(r.renewalDate, r.status) && <span className={dueTone(daysUntil(r.renewalDate)!)}>{dueChip(daysUntil(r.renewalDate)!)}</span>}
                    {r.stuck && <span title="Open and due soon, but nothing has happened for a week" className="rounded-full bg-[#f6e7d3] px-1.5 py-px text-[0.6875rem] font-medium text-[#8a4f12] dark:bg-[#3a2a14] dark:text-[#e8b97c]">Stuck</span>}
                  </span>
                </td>
                <td className="whitespace-nowrap">
                  <StatusBadge status={r.status} />
                </td>
                <td>
                  <span className={`block max-w-[12rem] truncate ${r.assignedAdviser ? "text-slate-900 dark:text-slate-100" : muted}`} title={r.assignedAdviser?.name || "No adviser yet"}>
                    {r.assignedAdviser?.name || "No adviser yet"}
                  </span>
                  <span className={`block max-w-[12rem] truncate text-[0.75rem] ${muted}`} title={r.assignedUnderwriter?.name || "No underwriter yet"}>
                    {r.assignedUnderwriter?.name || "No underwriter yet"}
                  </span>
                </td>
                <td>
                  <span className="block max-w-[11rem] truncate" title={r.insurer || ""}>
                    {r.insurer || <span className={muted}>None</span>}
                  </span>
                </td>
                <td>
                  <div className="flex flex-col leading-tight">
                    <CompanyBadge company={r.company} />
                    <BookTypeBadge bookType={r.bookType} />
                  </div>
                </td>
                <td className="whitespace-nowrap text-right text-slate-900 dark:text-slate-100">{formatCurrency(r.invoiceTotal)}</td>
                <td className="whitespace-nowrap">
                  <NotesButton renewalId={r.id} clientName={r.clientName} initialCount={r._count.comments} />
                </td>
              </tr>
            ))}
            {renewals.length === 0 && (
              <tr>
                <td colSpan={columnCount} className="!py-16 text-center text-slate-500">
                  No renewals match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
