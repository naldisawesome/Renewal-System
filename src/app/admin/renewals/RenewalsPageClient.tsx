"use client";

import { useState } from "react";
import AddRenewalForm from "./AddRenewalForm";
import FilterBar from "./FilterBar";
import RenewalsTable from "./RenewalsTable";
import TargetGwpMultiplierInput from "@/components/TargetGwpMultiplierInput";

function formatCurrency(value: number) {
  return value.toLocaleString("en-NZ", { style: "currency", currency: "NZD" });
}

export default function RenewalsPageClient({
  renewals,
  canManage,
  currentParams,
  sortField,
  sortDir,
  advisers,
  underwriters,
  monthOptions,
  salesTeams,
  totalInvoice,
  totalCount,
}: {
  renewals: any[];
  canManage: boolean;
  currentParams: { [key: string]: string | undefined };
  sortField: string;
  sortDir: "asc" | "desc";
  advisers: { id: string; name: string }[];
  underwriters: { id: string; name: string }[];
  monthOptions: { key: string; label: string; count: number }[];
  salesTeams: string[];
  totalInvoice: number;
  totalCount: number;
}) {
  // Target GWP is a view-time projection, not stored data - it's just
  // Invoice Total scaled by whatever plain number the admin types in here
  // (1 = same as Actual GWP, 1.1 = 10% above, etc.), so it lives as local
  // state and recalculates instantly with no round trip. Starts empty so
  // the placeholder label shows; an empty/invalid box is treated as 1x.
  const [multiplierInput, setMultiplierInput] = useState("");
  const parsedMultiplier = parseFloat(multiplierInput);
  const multiplier = Number.isFinite(parsedMultiplier) ? parsedMultiplier : 1;

  const filtersApplied = Object.keys(currentParams).some(
    (k) => !!currentParams[k] && k !== "sort" && k !== "sortField" && k !== "sortDir"
  );

  return (
    <>
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">All Renewals</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{renewals.length} shown (max 300 per view)</p>
        </div>
        <div className="flex items-end gap-3">
          <TargetGwpMultiplierInput value={multiplierInput} onChange={setMultiplierInput} />
          {canManage && <AddRenewalForm />}
        </div>
      </div>

      <FilterBar
        advisers={advisers}
        underwriters={underwriters}
        monthOptions={monthOptions}
        salesTeams={salesTeams}
        current={currentParams}
      />

      {/* Totals always reflect every renewal matching the current filters -
          not just the (up to 300) rows actually rendered in the table below. */}
      <div className="card p-4 flex flex-wrap items-center gap-x-8 gap-y-2">
        <div>
          <div className="text-xs uppercase text-slate-400 dark:text-slate-500 tracking-wide">
            {filtersApplied ? "Matching Policies" : "Total Policies"}
          </div>
          <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">{totalCount}</div>
        </div>
        <div>
          <div className="text-xs uppercase text-slate-400 dark:text-slate-500 tracking-wide">Invoice Total</div>
          <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {formatCurrency(totalInvoice)}
          </div>
        </div>
        <div>
          <div className="text-xs uppercase text-slate-400 dark:text-slate-500 tracking-wide">Target GWP</div>
          <div className="text-lg font-semibold text-brand-700 dark:text-brand-300">
            {formatCurrency(totalInvoice * multiplier)}
          </div>
        </div>
        <div>
          <div className="text-xs uppercase text-slate-400 dark:text-slate-500 tracking-wide">Actual GWP</div>
          <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {formatCurrency(totalInvoice)}
          </div>
        </div>
        {filtersApplied && (
          <span className="text-xs text-slate-400 dark:text-slate-500">Updates as filters change</span>
        )}
      </div>

      <RenewalsTable
        renewals={renewals}
        canManage={canManage}
        currentParams={currentParams}
        sortField={sortField}
        sortDir={sortDir}
        targetGwpMultiplier={multiplier}
      />
    </>
  );
}
