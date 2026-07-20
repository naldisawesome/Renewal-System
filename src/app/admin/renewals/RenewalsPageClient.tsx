"use client";

import { useState } from "react";
import AddRenewalForm from "./AddRenewalForm";
import FilterBar from "./FilterBar";
import RenewalsTable from "./RenewalsTable";
import TargetGwpMultiplierInput from "@/components/TargetGwpMultiplierInput";

export default function RenewalsPageClient({
  renewals,
  canManage,
  currentParams,
  sortField,
  sortDir,
  advisers,
  underwriters,
  monthOptions,
}: {
  renewals: any[];
  canManage: boolean;
  currentParams: { [key: string]: string | undefined };
  sortField: string;
  sortDir: "asc" | "desc";
  advisers: { id: string; name: string }[];
  underwriters: { id: string; name: string }[];
  monthOptions: { key: string; label: string; count: number }[];
}) {
  // Target GWP is a view-time projection, not stored data - it's just
  // Invoice Total scaled by whatever plain number the admin types in here
  // (1 = same as Actual GWP, 1.1 = 10% above, etc.), so it lives as local
  // state and recalculates instantly with no round trip. Starts empty so
  // the placeholder label shows; an empty/invalid box is treated as 1x.
  const [multiplierInput, setMultiplierInput] = useState("");
  const parsedMultiplier = parseFloat(multiplierInput);
  const multiplier = Number.isFinite(parsedMultiplier) ? parsedMultiplier : 1;

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

      <FilterBar advisers={advisers} underwriters={underwriters} monthOptions={monthOptions} current={currentParams} />

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
