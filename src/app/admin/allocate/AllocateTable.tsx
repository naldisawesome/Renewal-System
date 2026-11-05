"use client";

import { useState } from "react";
import { startProgress } from "@/components/NavProgress";
import { useRouter } from "next/navigation";
import { CompanyBadge, BookTypeBadge, StatusBadge } from "@/components/Badges";
import { monthYearLabel } from "@/lib/dates";
import NotesButton from "@/components/NotesButton";
import Spinner from "@/components/Spinner";
import SortableTh from "@/components/SortableTh";

type RenewalRow = {
  id: string;
  clientName: string;
  policyNumber: string;
  insurer: string | null;
  sourceSalesTeam: string | null;
  renewalDate: string | null;
  invoiceTotal: number | null;
  company: string;
  bookType: string;
  status: string;
  assignedAdviser: { id: string; name: string } | null;
  assignedUnderwriter: { id: string; name: string } | null;
  _count: { comments: number };
};

type Person = { id: string; name: string; role: string; active: boolean; open: number };

export default function AllocateTable({
  renewals,
  advisers,
  underwriters,
  people,
  filters,
  sortField,
  sortDir,
}: {
  renewals: RenewalRow[];
  advisers: { id: string; name: string }[];
  underwriters: { id: string; name: string }[];
  people: Person[];
  filters: { [key: string]: string | undefined };
  sortField: string;
  sortDir: "asc" | "desc";
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [assignAs, setAssignAs] = useState<"ADVISER" | "UNDERWRITER">("ADVISER");
  const [targetUserId, setTargetUserId] = useState("");
  const [loading, setLoading] = useState(false);
  // Renewal ids with a quick-assign request in flight, so that row's dropdowns disable individually
  // instead of locking the whole table.
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());

  const allSelected = renewals.length > 0 && selected.size === renewals.length;
  const options = assignAs === "UNDERWRITER" ? underwriters : advisers;
  const activeAdvisers = people.filter((p) => p.role === "ADVISER" && p.active);
  const activeUnderwriters = people.filter((p) => p.role === "UNDERWRITER" && p.active);

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

  function switchAssignAs(next: "ADVISER" | "UNDERWRITER") {
    setAssignAs(next);
    setTargetUserId("");
  }

  async function assign() {
    if (selected.size === 0 || !targetUserId) return;
    setLoading(true);
    await fetch("/api/renewals/allocate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ renewalIds: Array.from(selected), assignAs, userId: targetUserId }),
    });
    setLoading(false);
    setSelected(new Set());
    router.refresh();
  }

  // One-click assignment straight from the row: no need to select it first and use the bar below.
  // Used for both the Adviser and Underwriter columns.
  async function quickAssign(renewalId: string, as: "ADVISER" | "UNDERWRITER", userId: string) {
    setSavingIds((prev) => new Set(prev).add(renewalId));
    await fetch("/api/renewals/allocate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ renewalIds: [renewalId], assignAs: as, userId: userId || null }),
    });
    setSavingIds((prev) => {
      const next = new Set(prev);
      next.delete(renewalId);
      return next;
    });
    router.refresh();
  }

  // Spreads the selected renewals across whoever's currently least busy, instead of picking one
  // person for the whole batch - the quickest way to clear a pile of unassigned renewals fairly.
  async function distributeEvenly() {
    const pool = (assignAs === "UNDERWRITER" ? activeUnderwriters : activeAdvisers).slice();
    if (selected.size === 0 || pool.length === 0) return;
    const counts = pool.map((p) => p.open);
    const buckets = new Map<string, string[]>();
    for (const id of selected) {
      let minIdx = 0;
      for (let i = 1; i < counts.length; i++) if (counts[i] < counts[minIdx]) minIdx = i;
      counts[minIdx] += 1;
      const uid = pool[minIdx].id;
      buckets.set(uid, [...(buckets.get(uid) ?? []), id]);
    }
    setLoading(true);
    await Promise.all(
      Array.from(buckets.entries()).map(([userId, renewalIds]) =>
        fetch("/api/renewals/allocate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ renewalIds, assignAs, userId }),
        })
      )
    );
    setLoading(false);
    setSelected(new Set());
    router.refresh();
  }

  async function unassign() {
    if (selected.size === 0) return;
    setLoading(true);
    await fetch("/api/renewals/allocate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ renewalIds: Array.from(selected), assignAs, userId: null }),
    });
    setLoading(false);
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

  function updateFilter(next: Record<string, string | undefined>) {
    const usp = new URLSearchParams();
    const merged = { ...filters, ...next };
    Object.entries(merged).forEach(([k, v]) => {
      if (v) usp.set(k, v);
    });
    startProgress();
    router.push(`/admin/allocate?${usp.toString()}`);
  }

  const sortProps = { currentParams: filters, activeField: sortField, activeDir: sortDir, basePath: "/admin/allocate" };
  const muted = "text-slate-400 dark:text-slate-500";
  const seg = (on: boolean) =>
    `rounded-md px-3 py-1.5 text-[0.8125rem] transition-colors ${on ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white" : "text-slate-600 hover:text-slate-900 dark:text-slate-300"}`;
  const view = filters.view || "unassigned";

  return (
    <div>
      {/* Which renewals to show */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800" role="group" aria-label="Show">
          <button type="button" className={seg(view === "unassigned")} aria-pressed={view === "unassigned"} onClick={() => updateFilter({ view: "unassigned" })}>
            Unassigned
          </button>
          <button type="button" className={seg(view === "all")} aria-pressed={view === "all"} onClick={() => updateFilter({ view: "all" })}>
            All, to reassign
          </button>
        </div>
        <select
          aria-label="Portfolio"
          className="input-sm w-auto min-w-[9rem]"
          value={filters.company || ""}
          onChange={(e) => updateFilter({ company: e.target.value || undefined })}
        >
          <option value="">All portfolios</option>
          <option value="CACTUS">Cactus</option>
          <option value="BLANKET">Blanket</option>
        </select>
        <select
          aria-label="Type"
          className="input-sm w-auto min-w-[9rem]"
          value={filters.bookType || ""}
          onChange={(e) => updateFilter({ bookType: e.target.value || undefined })}
        >
          <option value="">All types</option>
          <option value="RENEWALS">Renewals</option>
          <option value="CONTRACT_WORKS">Contract Works</option>
        </select>
        <span className="ml-auto text-[0.8125rem] text-slate-500">
          {renewals.length} {renewals.length === 1 ? "renewal" : "renewals"} listed
        </span>
      </div>

      {/* Assignment bar: stays in view while scrolling the list */}
      <div
        className={`sticky top-[3.75rem] z-20 mb-3 flex flex-wrap items-center gap-2 rounded-xl px-3 py-2 transition-colors ${
          selected.size > 0
            ? "bg-slate-900 text-white shadow-pop dark:bg-slate-100 dark:text-slate-900"
            : "border border-slate-200 bg-white text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
        }`}
      >
        <span className="min-w-[6.5rem] pl-1 text-[0.875rem]">{selected.size > 0 ? `${selected.size} selected` : "Select renewals"}</span>
        <div className={`flex rounded-lg p-0.5 ${selected.size > 0 ? "bg-white/10 dark:bg-slate-900/10" : "bg-slate-100 dark:bg-slate-800"}`} role="group" aria-label="Assign as">
          {(["ADVISER", "UNDERWRITER"] as const).map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={assignAs === k}
              onClick={() => switchAssignAs(k)}
              className={`rounded-md px-3 py-1.5 text-[0.8125rem] transition-colors ${
                assignAs === k
                  ? selected.size > 0
                    ? "bg-white text-slate-900 dark:bg-slate-900 dark:text-white"
                    : "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                  : "opacity-75 hover:opacity-100"
              }`}
            >
              As {k === "ADVISER" ? "adviser" : "underwriter"}
            </button>
          ))}
        </div>
        <select
          aria-label={assignAs === "UNDERWRITER" ? "Underwriter" : "Adviser"}
          className="input-sm w-auto min-w-[12rem] text-slate-900"
          value={targetUserId}
          onChange={(e) => setTargetUserId(e.target.value)}
        >
          <option value="">Choose {assignAs === "UNDERWRITER" ? "an underwriter" : "an adviser"}</option>
          {options.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
        <button
          onClick={assign}
          disabled={loading || selected.size === 0 || !targetUserId}
          aria-busy={loading}
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-brand-500 px-3.5 text-[0.8125rem] font-medium text-white hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-brand-600 dark:hover:bg-brand-500"
        >
          {loading && <Spinner />}
          Assign
        </button>
        <button
          onClick={distributeEvenly}
          disabled={loading || selected.size === 0}
          title="Spread the selected renewals across whoever's currently least busy"
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-current px-3.5 text-[0.8125rem] font-medium opacity-90 hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-30"
        >
          Distribute evenly
        </button>
        <span className="flex-1" />
        <button
          onClick={unassign}
          disabled={loading || selected.size === 0}
          className="h-9 rounded-lg px-3 text-[0.8125rem] opacity-80 hover:bg-white/10 hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-slate-900/10"
        >
          Unassign
        </button>
        <button
          onClick={bulkDelete}
          disabled={loading || selected.size === 0}
          className="h-9 rounded-lg px-3 text-[0.8125rem] text-[#f0a397] hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30 dark:text-[#a33a2c] dark:hover:bg-slate-900/10"
        >
          Delete selected
        </button>
      </div>

      <div className="tbl-wrap max-h-[calc(100vh-12rem)]">
        <table className="tbl min-w-[66rem]">
          <thead>
            <tr>
              <th className="w-10">
                <input type="checkbox" aria-label="Select all" checked={allSelected} onChange={toggleAll} className="accent-brand-600" />
              </th>
              <th>Client</th>
              <th>Policy</th>
              <SortableTh label="Portfolio" sortKey="bookType" {...sortProps} />
              <SortableTh label="Renewal date" sortKey="renewalDate" {...sortProps} />
              <SortableTh label="Month" sortKey="monthYear" {...sortProps} />
              <th className="text-right">Invoice total</th>
              <th>Adviser</th>
              <th>Underwriter</th>
              <th>Status</th>
              <th className="w-14">Notes</th>
            </tr>
          </thead>
          <tbody>
            {renewals.map((r) => (
              <tr
                key={r.id}
                className={`cursor-pointer ${selected.has(r.id) ? "!bg-brand-50 dark:!bg-brand-900/30" : ""}`}
                onClick={(e) => {
                  // Clicking anywhere on the row toggles it, except on its links and buttons.
                  if ((e.target as HTMLElement).closest("a,button,input")) return;
                  toggleOne(r.id);
                }}
              >
                <td>
                  <input
                    type="checkbox"
                    aria-label={`Select ${r.clientName}`}
                    checked={selected.has(r.id)}
                    onChange={() => toggleOne(r.id)}
                    className="accent-brand-600"
                  />
                </td>
                <td>
                  <span className="block max-w-[15rem] truncate font-medium text-slate-900 dark:text-slate-100" title={r.clientName}>
                    {r.clientName}
                  </span>
                </td>
                <td>
                  <span className="block max-w-[10rem] truncate text-slate-500 dark:text-slate-400" title={r.policyNumber}>
                    {r.policyNumber}
                  </span>
                </td>
                <td>
                  <div className="flex flex-col leading-tight">
                    <CompanyBadge company={r.company} />
                    <BookTypeBadge bookType={r.bookType} />
                  </div>
                </td>
                <td className="whitespace-nowrap">{r.renewalDate ? new Date(r.renewalDate).toLocaleDateString("en-NZ") : <span className={muted}>—</span>}</td>
                <td className="whitespace-nowrap text-slate-500 dark:text-slate-400">{monthYearLabel(r.renewalDate)}</td>
                <td className="whitespace-nowrap text-right">{formatCurrency(r.invoiceTotal)}</td>
                <td onClick={(e) => e.stopPropagation()}>
                  <select
                    aria-label={`Adviser for ${r.clientName}`}
                    className="input-sm w-auto min-w-[9rem] max-w-[11rem]"
                    value={r.assignedAdviser?.id || ""}
                    disabled={savingIds.has(r.id)}
                    onChange={(e) => quickAssign(r.id, "ADVISER", e.target.value)}
                  >
                    <option value="">Unassigned</option>
                    {r.assignedAdviser && !activeAdvisers.some((p) => p.id === r.assignedAdviser!.id) && (
                      <option value={r.assignedAdviser.id}>{r.assignedAdviser.name} (no longer active)</option>
                    )}
                    {activeAdvisers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.open} open)
                      </option>
                    ))}
                  </select>
                </td>
                <td onClick={(e) => e.stopPropagation()}>
                  <select
                    aria-label={`Underwriter for ${r.clientName}`}
                    className="input-sm w-auto min-w-[9rem] max-w-[11rem]"
                    value={r.assignedUnderwriter?.id || ""}
                    disabled={savingIds.has(r.id)}
                    onChange={(e) => quickAssign(r.id, "UNDERWRITER", e.target.value)}
                  >
                    <option value="">Unassigned</option>
                    {r.assignedUnderwriter && !activeUnderwriters.some((p) => p.id === r.assignedUnderwriter!.id) && (
                      <option value={r.assignedUnderwriter.id}>{r.assignedUnderwriter.name} (no longer active)</option>
                    )}
                    {activeUnderwriters.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.open} open)
                      </option>
                    ))}
                  </select>
                </td>
                <td className="whitespace-nowrap">
                  <StatusBadge status={r.status} />
                </td>
                <td className="whitespace-nowrap">
                  <NotesButton renewalId={r.id} clientName={r.clientName} initialCount={r._count.comments} />
                </td>
              </tr>
            ))}
            {renewals.length === 0 && (
              <tr>
                <td colSpan={11} className="!py-16 text-center text-slate-500">
                  {view === "unassigned" ? "Everything here is assigned. Choose “All, to reassign” to change an assignment." : "No renewals match these filters."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
