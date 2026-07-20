"use client";

import { useState } from "react";
import Link from "next/link";
import { StatusBadge, CompanyBadge, BookTypeBadge } from "@/components/Badges";
import { monthYearLabel } from "@/lib/dates";
import NotesModal from "@/components/NotesModal";

type RenewalRow = {
  id: string;
  clientName: string;
  policyNumber: string;
  insurer: string | null;
  company: string;
  bookType: string;
  renewalDate: string | Date | null;
  invoiceTotal: number | null;
  status: string;
  commentCount: number;
};

export default function MyRenewalsTable({ renewals }: { renewals: RenewalRow[] }) {
  const [openRenewal, setOpenRenewal] = useState<RenewalRow | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});

  function countFor(r: RenewalRow) {
    return counts[r.id] ?? r.commentCount;
  }

  return (
    <div className="card overflow-x-auto">
      <table className="w-full table-fixed text-sm">
        <colgroup>
          <col className="w-[18%]" />
          <col className="w-[12%]" />
          <col className="w-[16%]" />
          <col className="w-[13%]" />
          <col className="w-[10%]" />
          <col className="w-[9%]" />
          <col className="w-[10%]" />
          <col className="w-[7%]" />
          <col className="w-[5%]" />
        </colgroup>
        <thead className="bg-slate-50 dark:bg-slate-800 text-left text-xs uppercase text-slate-500 dark:text-slate-400">
          <tr>
            <th className="px-3 py-3">Client</th>
            <th className="px-3 py-3">Policy #</th>
            <th className="px-3 py-3">Insurer</th>
            <th className="px-3 py-3">Type</th>
            <th className="px-3 py-3">Renewal Date</th>
            <th className="px-3 py-3">Month/Year</th>
            <th className="px-3 py-3">Invoice Total</th>
            <th className="px-3 py-3">Status</th>
            <th className="px-3 py-3">Notes</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
          {renewals.map((r) => (
            <tr key={r.id} className="h-14 hover:bg-slate-50 dark:hover:bg-slate-800">
              <td className="px-3 py-3 align-middle">
                <Link
                  href={`/renewals/${r.id}`}
                  title={r.clientName}
                  className="block truncate font-medium text-brand-700 dark:text-brand-200 hover:underline"
                >
                  {r.clientName}
                </Link>
              </td>
              <td className="px-3 py-3 align-middle text-slate-600 dark:text-slate-300">
                <span className="block truncate" title={r.policyNumber}>
                  {r.policyNumber}
                </span>
              </td>
              <td className="px-3 py-3 align-middle text-slate-600 dark:text-slate-300">
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
              <td className="px-3 py-3 align-middle text-slate-600 dark:text-slate-300 whitespace-nowrap">
                {r.renewalDate ? new Date(r.renewalDate).toLocaleDateString("en-NZ") : "—"}
              </td>
              <td className="px-3 py-3 align-middle whitespace-nowrap">
                <span className="badge bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">{monthYearLabel(r.renewalDate)}</span>
              </td>
              <td className="px-3 py-3 align-middle text-slate-600 dark:text-slate-300 whitespace-nowrap">
                {r.invoiceTotal != null
                  ? r.invoiceTotal.toLocaleString("en-NZ", { style: "currency", currency: "NZD" })
                  : "—"}
              </td>
              <td className="px-3 py-3 align-middle whitespace-nowrap">
                <StatusBadge status={r.status} />
              </td>
              <td className="px-3 py-3 align-middle whitespace-nowrap">
                <button
                  onClick={() => setOpenRenewal(r)}
                  className="relative inline-flex items-center justify-center w-8 h-8 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-700"
                  title={countFor(r) > 0 ? `${countFor(r)} note${countFor(r) === 1 ? "" : "s"}` : "Notes"}
                  aria-label="Notes"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                  </svg>
                  {countFor(r) > 0 && (
                    <span className="absolute -top-1 -right-1 bg-brand-600 text-white text-[10px] leading-none rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-1 ring-2 ring-white dark:ring-slate-900">
                      {countFor(r) > 9 ? "9+" : countFor(r)}
                    </span>
                  )}
                </button>
              </td>
            </tr>
          ))}
          {renewals.length === 0 && (
            <tr>
              <td colSpan={9} className="px-4 py-10 text-center text-slate-400 dark:text-slate-500">
                No renewals assigned to you yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {openRenewal && (
        <NotesModal
          renewalId={openRenewal.id}
          clientName={openRenewal.clientName}
          onClose={() => setOpenRenewal(null)}
          onCountChange={(count) => setCounts((c) => ({ ...c, [openRenewal.id]: count }))}
        />
      )}
    </div>
  );
}
