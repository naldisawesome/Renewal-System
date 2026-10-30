"use client";

import Link from "next/link";
import { StatusBadge, CompanyBadge, BookTypeBadge } from "@/components/Badges";
import { monthYearLabel } from "@/lib/dates";
import NotesButton from "@/components/NotesButton";
import RenewalCards from "@/components/RenewalCards";
import { daysUntil, dueWindow, dueChip, dueTone } from "@/lib/deadlines";

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
  followUpAt?: string | Date | null;
  followUpNote?: string | null;
};


function FollowUpChip({ date, note, closed }: { date?: string | Date | null; note?: string | null; closed: boolean }) {
  if (!date || closed) return <span className="text-slate-400 dark:text-slate-500">—</span>;
  const days = daysUntil(date) ?? 0;
  return (
    <span title={note || undefined} className={`text-[0.8125rem] ${days <= 0 ? "font-medium text-[#a33a2c] dark:text-[#eda499]" : "text-slate-600 dark:text-slate-300"}`}>
      {days < 0 ? `${-days}d overdue` : days === 0 ? "Today" : new Date(date).toLocaleDateString("en-NZ", { day: "numeric", month: "short", timeZone: "UTC" })}
    </span>
  );
}

export default function MyRenewalsTable({ renewals }: { renewals: RenewalRow[] }) {
  const muted = "text-slate-400 dark:text-slate-500";
  return (
    <>
    <RenewalCards rows={renewals} empty="Nothing here. Renewals assigned to you will appear in this list." />
    <div className="tbl-wrap hidden md:block">
      <table className="tbl min-w-[58rem]">
        <thead>
          <tr>
            <th>Client</th>
            <th>Policy</th>
            <th>Insurer</th>
            <th>Portfolio</th>
            <th>Renewal date</th>
            <th>Month</th>
            <th className="text-right">Invoice total</th>
            <th>Status</th>
            <th>Follow-up</th>
            <th className="w-14">Notes</th>
          </tr>
        </thead>
        <tbody>
          {renewals.map((r) => {
            const days = daysUntil(r.renewalDate);
            const soon = dueWindow(r.renewalDate, r.status) != null;
            return (
              <tr key={r.id}>
                <td>
                  <Link
                    href={`/renewals/${r.id}`}
                    title={r.clientName}
                    className="block max-w-[16rem] truncate font-medium text-slate-900 decoration-slate-300 underline-offset-4 hover:underline dark:text-slate-100"
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
                  {r.renewalDate && days != null ? new Date(r.renewalDate).toLocaleDateString("en-NZ", { timeZone: "UTC" }) : <span className={muted}>—</span>}
                  {soon && <span className={`ml-2 text-[0.75rem] ${dueTone(days!)}`}>{dueChip(days!)}</span>}
                </td>
                <td className="whitespace-nowrap text-slate-500 dark:text-slate-400">{monthYearLabel(r.renewalDate)}</td>
                <td className="whitespace-nowrap text-right">
                  {r.invoiceTotal != null ? r.invoiceTotal.toLocaleString("en-NZ", { style: "currency", currency: "NZD" }) : <span className={muted}>—</span>}
                </td>
                <td className="whitespace-nowrap">
                  <StatusBadge status={r.status} />
                </td>
                <td className="whitespace-nowrap">
                  <FollowUpChip date={r.followUpAt} note={r.followUpNote} closed={!dueWindow(r.renewalDate, r.status) && ["RENEWED", "CANCELLED", "LAPSED"].includes(r.status)} />
                </td>
                <td className="whitespace-nowrap">
                  <NotesButton renewalId={r.id} clientName={r.clientName} initialCount={r.commentCount} />
                </td>
              </tr>
            );
          })}
          {renewals.length === 0 && (
            <tr>
              <td colSpan={10} className="!py-16 text-center text-slate-500">
                Nothing here. Renewals assigned to you will appear in this list.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
    </>
  );
}
