"use client";

import { useState } from "react";
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

export default function AllocateTable({
  renewals,
  advisers,
  underwriters,
  filters,
  sortField,
  sortDir,
}: {
  renewals: RenewalRow[];
  advisers: { id: string; name: string }[];
  underwriters: { id: string; name: string }[];
  filters: { [key: string]: string | undefined };
  sortField: string;
  sortDir: "asc" | "desc";
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [assignAs, setAssignAs] = useState<"ADVISER" | "UNDERWRITER">("ADVISER");
  const [targetUserId, setTargetUserId] = useState("");
  const [loading, setLoading] = useState(false);

  const allSelected = renewals.length > 0 && selected.size === renewals.length;
  const options = assignAs === "UNDERWRITER" ? underwriters : advisers;

  // Allocate doesn't have its own multiplier control (that lives on All
  // Renewals) - Target GWP here is Invoice Total at the default 1x, i.e.
  // matches Actual GWP until adjusted from All Renewals' view.
  const targetGwpMultiplier = 1;

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
    router.push(`/admin/allocate?${usp.toString()}`);
  }

  return (
    <div className="space-y-4">
      <div className="card p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="label">Portfolio</label>
          <select
            className="input"
            value={filters.company || ""}
            onChange={(e) => updateFilter({ company: e.target.value || undefined })}
          >
            <option value="">All</option>
            <option value="CACTUS">Cactus</option>
            <option value="BLANKET">Blanket</option>
          </select>
        </div>
        <div>
          <label className="label">Type</label>
          <select
            className="input"
            value={filters.bookType || ""}
            onChange={(e) => updateFilter({ bookType: e.target.value || undefined })}
          >
            <option value="">All</option>
            <option value="RENEWALS">Renewals</option>
            <option value="CONTRACT_WORKS">Contract Works</option>
          </select>
        </div>
        <div>
          <label className="label">Show</label>
          <select
            className="input"
            value={filters.view || "unassigned"}
            onChange={(e) => updateFilter({ view: e.target.value })}
          >
            <option value="unassigned">Unassigned only</option>
            <option value="all">All (to reassign)</option>
          </select>
        </div>
      </div>

      <div className="card p-4 flex flex-wrap items-center gap-3 sticky top-0 z-10">
        <span className="text-sm text-slate-600 dark:text-slate-300">{selected.size} selected</span>

        <div className="flex rounded-md border border-slate-300 dark:border-slate-600 overflow-hidden text-sm">
          <button
            type="button"
            onClick={() => switchAssignAs("ADVISER")}
            className={`px-3 py-2 ${assignAs === "ADVISER" ? "bg-brand-600 text-white" : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300"}`}
          >
            As Adviser
          </button>
          <button
            type="button"
            onClick={() => switchAssignAs("UNDERWRITER")}
            className={`px-3 py-2 border-l border-slate-300 dark:border-slate-600 ${
              assignAs === "UNDERWRITER" ? "bg-brand-600 text-white" : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300"
            }`}
          >
            As Underwriter
          </button>
        </div>

        <select
          className="input max-w-xs"
          value={targetUserId}
          onChange={(e) => setTargetUserId(e.target.value)}
        >
          <option value="">Choose {assignAs === "UNDERWRITER" ? "underwriter" : "adviser"}...</option>
          {options.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
        <button
          onClick={assign}
          disabled={loading || selected.size === 0 || !targetUserId}
          className="btn-primary text-sm"
        >
          {loading && <Spinner className="mr-1.5" />}
          Assign
        </button>
        <button
          onClick={unassign}
          disabled={loading || selected.size === 0}
          className="btn-secondary text-sm"
        >
          {loading && <Spinner className="mr-1.5" />}
          Unassign
        </button>
        <button
          onClick={bulkDelete}
          disabled={loading || selected.size === 0}
          className="btn-danger text-sm"
        >
          {loading && <Spinner className="mr-1.5" />}
          Delete selected
        </button>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full table-fixed text-sm">
          <colgroup>
            <col className="w-[3%]" />
            <col className="w-[15%]" />
            <col className="w-[9%]" />
            <col className="w-[11%]" />
            <col className="w-[8%]" />
            <col className="w-[7%]" />
            <col className="w-[8%]" />
            <col className="w-[8%]" />
            <col className="w-[8%]" />
            <col className="w-[10%]" />
            <col className="w-[9%]" />
            <col className="w-[9%]" />
            <col className="w-[6%]" />
            <col className="w-[5%]" />
          </colgroup>
          <thead className="bg-slate-50 dark:bg-slate-800 text-left text-xs uppercase text-slate-500 dark:text-slate-400">
            <tr>
              <th className="px-3 py-3">
                <input type="checkbox" checked={allSelected} onChange={toggleAll} />
              </th>
              <th className="px-3 py-3">Client</th>
              <th className="px-3 py-3">Policy #</th>
              <SortableTh
                label="Type"
                sortKey="bookType"
                currentParams={filters}
                activeField={sortField}
                activeDir={sortDir}
                basePath="/admin/allocate"
              />
              <SortableTh
                label="Renewal Date"
                sortKey="renewalDate"
                currentParams={filters}
                activeField={sortField}
                activeDir={sortDir}
                basePath="/admin/allocate"
              />
              <SortableTh
                label="Month/Year"
                sortKey="monthYear"
                currentParams={filters}
                activeField={sortField}
                activeDir={sortDir}
                basePath="/admin/allocate"
              />
              <th className="px-3 py-3">Invoice Total</th>
              <th className="px-3 py-3">Target GWP</th>
              <th className="px-3 py-3">Actual GWP</th>
              <th className="px-3 py-3">File's "Sales Team"</th>
              <th className="px-3 py-3">Adviser</th>
              <th className="px-3 py-3">Underwriter</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {renewals.map((r) => (
              <tr key={r.id} className={`h-14 ${selected.has(r.id) ? "bg-brand-50 dark:bg-brand-900/30" : "hover:bg-slate-50 dark:hover:bg-slate-800"}`}>
                <td className="px-3 py-3 align-middle">
                  <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleOne(r.id)} />
                </td>
                <td className="px-3 py-3 align-middle font-medium text-slate-900 dark:text-slate-100">
                  <span className="block truncate" title={r.clientName}>
                    {r.clientName}
                  </span>
                </td>
                <td className="px-3 py-3 align-middle text-slate-600 dark:text-slate-300">
                  <span className="block truncate" title={r.policyNumber}>
                    {r.policyNumber}
                  </span>
                </td>
                <td className="px-3 py-3 align-middle">
                  <div className="flex flex-nowrap gap-1">
                    <CompanyBadge company={r.company} />
                    <BookTypeBadge bookType={r.bookType} />
                  </div>
                </td>
                <td className="px-3 py-3 align-middle text-slate-600 dark:text-slate-300 whitespace-nowrap">
                  {r.renewalDate ? new Date(r.renewalDate).toLocaleDateString("en-NZ") : "—"}
                </td>
                <td className="px-3 py-3 align-middle whitespace-nowrap">
                  <span className="badge bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">{monthYearLabel(r.renewalDate)}</span>
                </td>
                <td className="px-3 py-3 align-middle text-slate-600 dark:text-slate-300 whitespace-nowrap">
                  {formatCurrency(r.invoiceTotal)}
                </td>
                <td className="px-3 py-3 align-middle text-slate-600 dark:text-slate-300 whitespace-nowrap">
                  {formatCurrency(r.invoiceTotal != null ? r.invoiceTotal * targetGwpMultiplier : null)}
                </td>
                <td className="px-3 py-3 align-middle text-slate-600 dark:text-slate-300 whitespace-nowrap">
                  {formatCurrency(r.invoiceTotal)}
                </td>
                <td className="px-3 py-3 align-middle text-slate-400 dark:text-slate-500">
                  <span className="block truncate" title={r.sourceSalesTeam || ""}>
                    {r.sourceSalesTeam || "—"}
                  </span>
                </td>
                <td className="px-3 py-3 align-middle text-slate-600 dark:text-slate-300">
                  <span className="block truncate" title={r.assignedAdviser?.name || ""}>
                    {r.assignedAdviser?.name || "—"}
                  </span>
                </td>
                <td className="px-3 py-3 align-middle text-slate-600 dark:text-slate-300">
                  <span className="block truncate" title={r.assignedUnderwriter?.name || ""}>
                    {r.assignedUnderwriter?.name || "—"}
                  </span>
                </td>
                <td className="px-3 py-3 align-middle whitespace-nowrap">
                  <StatusBadge status={r.status} />
                </td>
                <td className="px-3 py-3 align-middle whitespace-nowrap">
                  <NotesButton renewalId={r.id} clientName={r.clientName} initialCount={r._count.comments} />
                </td>
              </tr>
            ))}
            {renewals.length === 0 && (
              <tr>
                <td colSpan={14} className="px-4 py-10 text-center text-slate-400 dark:text-slate-500">
                  Nothing to allocate here.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
