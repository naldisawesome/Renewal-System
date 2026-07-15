"use client";

import { useState } from "react";
import Link from "next/link";
import { StatusBadge, CompanyBadge, BookTypeBadge } from "@/components/Badges";
import { monthYearLabel } from "@/lib/dates";
import NotesButton from "@/components/NotesButton";
import Spinner from "@/components/Spinner";
import { useRouter } from "next/navigation";

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
}: {
  renewals: RenewalRow[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const allSelected = renewals.length > 0 && selected.size === renewals.length;
  const columnCount = canManage ? 12 : 11;

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

  return (
    <div className="space-y-3">
      {canManage && selected.size > 0 && (
        <div className="card p-3 flex items-center gap-3 sticky top-0 z-10">
          <span className="text-sm text-slate-600">{selected.size} selected</span>
          <button onClick={bulkDelete} disabled={loading} className="btn-danger text-xs">
            {loading && <Spinner className="mr-1.5" />}
            Delete selected
          </button>
          <button onClick={() => setSelected(new Set())} className="btn-secondary text-xs">
            Clear selection
          </button>
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full table-fixed text-sm">
          <colgroup>
            {canManage && <col className="w-[3%]" />}
            <col className={canManage ? "w-[19%]" : "w-[22%]"} />
            <col className="w-[9%]" />
            <col className="w-[12%]" />
            <col className="w-[10%]" />
            <col className="w-[7%]" />
            <col className="w-[6%]" />
            <col className="w-[7%]" />
            <col className="w-[8%]" />
            <col className="w-[8%]" />
            <col className="w-[6%]" />
            <col className="w-[5%]" />
          </colgroup>
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              {canManage && (
                <th className="px-3 py-3">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} />
                </th>
              )}
              <th className="px-3 py-3">Client</th>
              <th className="px-3 py-3">Policy #</th>
              <th className="px-3 py-3">Insurer</th>
              <th className="px-3 py-3">Type</th>
              <th className="px-3 py-3">Renewal Date</th>
              <th className="px-3 py-3">Month/Year</th>
              <th className="px-3 py-3">Invoice Total</th>
              <th className="px-3 py-3">Adviser</th>
              <th className="px-3 py-3">Underwriter</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {renewals.map((r) => (
              <tr key={r.id} className={`h-14 ${selected.has(r.id) ? "bg-brand-50" : "hover:bg-slate-50"}`}>
                {canManage && (
                  <td className="px-3 py-3 align-middle">
                    <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleOne(r.id)} />
                  </td>
                )}
                <td className="px-3 py-3 align-middle">
                  <Link
                    href={`/renewals/${r.id}`}
                    title={r.clientName}
                    className="block truncate font-medium text-brand-700 hover:underline"
                  >
                    {r.clientName}
                  </Link>
                </td>
                <td className="px-3 py-3 align-middle text-slate-600">
                  <span className="block truncate" title={r.policyNumber}>
                    {r.policyNumber}
                  </span>
                </td>
                <td className="px-3 py-3 align-middle text-slate-600">
                  <span className="block truncate" title={r.insurer || ""}>
                    {r.insurer || "—"}
                  </span>
                </td>
                <td className="px-3 py-3 align-middle">
                  <div className="flex flex-nowrap gap-1">
                    <CompanyBadge company={r.company} />
                    <BookTypeBadge bookType={r.bookType} />
                  </div>
                </td>
                <td className="px-3 py-3 align-middle text-slate-600 whitespace-nowrap">
                  {r.renewalDate ? new Date(r.renewalDate).toLocaleDateString("en-NZ") : "—"}
                </td>
                <td className="px-3 py-3 align-middle whitespace-nowrap">
                  <span className="badge bg-slate-100 text-slate-600">{monthYearLabel(r.renewalDate)}</span>
                </td>
                <td className="px-3 py-3 align-middle text-slate-600 whitespace-nowrap">
                  {r.invoiceTotal != null
                    ? r.invoiceTotal.toLocaleString("en-NZ", { style: "currency", currency: "NZD" })
                    : "—"}
                </td>
                <td className="px-3 py-3 align-middle text-slate-600">
                  <span className="block truncate" title={r.assignedAdviser?.name || "Unassigned"}>
                    {r.assignedAdviser?.name || "Unassigned"}
                  </span>
                </td>
                <td className="px-3 py-3 align-middle text-slate-600">
                  <span className="block truncate" title={r.assignedUnderwriter?.name || "Unassigned"}>
                    {r.assignedUnderwriter?.name || "Unassigned"}
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
                <td colSpan={columnCount} className="px-4 py-10 text-center text-slate-400">
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
