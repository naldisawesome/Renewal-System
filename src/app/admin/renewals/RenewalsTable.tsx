"use client";

import { useState } from "react";
import Link from "next/link";
import { StatusBadge, CompanyBadge, BookTypeBadge } from "@/components/Badges";
import { monthYearLabel } from "@/lib/dates";
import NotesButton from "@/components/NotesButton";
import Spinner from "@/components/Spinner";
import SortableTh from "@/components/SortableTh";
import RenewalCards from "@/components/RenewalCards";
import { useRouter } from "next/navigation";
import { dueWindow, daysUntil, dueChip, dueTone } from "@/lib/deadlines";

type RenewalRow = {
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
  targetGwpMultiplier,
}: {
  renewals: RenewalRow[];
  canManage: boolean;
  currentParams: { [key: string]: string | undefined };
  sortField: string;
  sortDir: "asc" | "desc";
  targetGwpMultiplier: number;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const allSelected = renewals.length > 0 && selected.size === renewals.length;
  const columnCount = canManage ? 14 : 13;

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
  const muted = "text-slate-400 dark:text-slate-500";

  return (
    <div>
      {canManage && selected.size > 0 && (
        <div className="rs-pop sticky top-[3.75rem] z-20 mb-3 flex items-center gap-3 rounded-xl bg-slate-900 px-4 py-2.5 text-white shadow-pop dark:bg-slate-100 dark:text-slate-900">
          <span className="text-[0.875rem]">
            {selected.size} selected
          </span>
          <span className="flex-1" />
          <button onClick={() => setSelected(new Set())} className="rounded-lg px-3 py-1.5 text-[0.8125rem] text-white/80 hover:bg-white/10 hover:text-white dark:text-slate-700 dark:hover:bg-slate-900/10">
            Clear
          </button>
          <button onClick={bulkDelete} disabled={loading} aria-busy={loading} className="inline-flex items-center gap-2 rounded-lg bg-[#c4503f] px-3 py-1.5 text-[0.8125rem] font-medium text-white hover:bg-[#a33a2c] disabled:opacity-60">
            {loading && <Spinner />}
            Delete selected
          </button>
        </div>
      )}

      <RenewalCards
        rows={renewals.map((r) => ({ ...r, people: [r.assignedAdviser?.name, r.assignedUnderwriter?.name].filter(Boolean).join(" and ") || "Not assigned" }))}
        empty="No renewals match these filters."
      />
      <div className="tbl-wrap hidden max-h-[calc(100vh-9rem)] md:block">
        <table className="tbl min-w-[78rem]">
          <thead>
            <tr>
              {canManage && (
                <th className="w-10">
                  <input type="checkbox" aria-label="Select all" checked={allSelected} onChange={toggleAll} className="accent-brand-600" />
                </th>
              )}
              <th>Client</th>
              <th>Policy</th>
              <th>Insurer</th>
              <SortableTh label="Portfolio" sortKey="bookType" {...sortProps} />
              <SortableTh label="Renewal date" sortKey="renewalDate" {...sortProps} />
              <SortableTh label="Month" sortKey="monthYear" {...sortProps} />
              <th className="text-right">Invoice total</th>
              <th className="text-right">Target GWP</th>
              <th className="text-right">Actual GWP</th>
              <th>Adviser</th>
              <th>Underwriter</th>
              <th>Status</th>
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
                    className="block max-w-[14rem] truncate font-medium text-slate-900 decoration-slate-300 underline-offset-4 hover:underline dark:text-slate-100"
                  >
                    {r.clientName}
                  </Link>
                </td>
                <td>
                  <span className="block max-w-[10rem] truncate text-slate-500 dark:text-slate-400" title={r.policyNumber}>
                    {r.policyNumber}
                  </span>
                </td>
                <td>
                  <span className="block max-w-[10rem] truncate" title={r.insurer || ""}>
                    {r.insurer || <span className={muted}>—</span>}
                  </span>
                </td>
                <td>
                  <div className="flex flex-col leading-tight">
                    <CompanyBadge company={r.company} />
                    <BookTypeBadge bookType={r.bookType} />
                  </div>
                </td>
                <td className="whitespace-nowrap">
                  {r.renewalDate && new Date(r.renewalDate).getTime() !== 0 ? new Date(r.renewalDate).toLocaleDateString("en-NZ", { timeZone: "UTC" }) : <span className={muted}>—</span>}
                  {dueWindow(r.renewalDate, r.status) && (
                    <span className={`ml-2 text-[0.75rem] ${dueTone(daysUntil(r.renewalDate)!)}`}>{dueChip(daysUntil(r.renewalDate)!)}</span>
                  )}
                </td>
                <td className="whitespace-nowrap text-slate-500 dark:text-slate-400">{monthYearLabel(r.renewalDate)}</td>
                <td className="whitespace-nowrap text-right">{formatCurrency(r.invoiceTotal)}</td>
                <td className="whitespace-nowrap text-right text-brand-700 dark:text-brand-300">
                  {formatCurrency(r.invoiceTotal != null ? r.invoiceTotal * targetGwpMultiplier : null)}
                </td>
                <td className="whitespace-nowrap text-right">{formatCurrency(r.invoiceTotal)}</td>
                <td>
                  <span className={`block max-w-[10rem] truncate ${r.assignedAdviser ? "" : muted}`} title={r.assignedAdviser?.name || "Unassigned"}>
                    {r.assignedAdviser?.name || "Unassigned"}
                  </span>
                </td>
                <td>
                  <span className={`block max-w-[10rem] truncate ${r.assignedUnderwriter ? "" : muted}`} title={r.assignedUnderwriter?.name || "Unassigned"}>
                    {r.assignedUnderwriter?.name || "Unassigned"}
                  </span>
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
