"use client";

import { useState } from "react";
import AddRenewalForm from "./AddRenewalForm";
import FilterBar from "./FilterBar";
import RenewalsTable from "./RenewalsTable";
import TargetGwpMultiplierInput from "@/components/TargetGwpMultiplierInput";
import MonthRuler from "@/components/MonthRuler";
import { DownloadIcon } from "@/components/icons";
import Link from "next/link";

function formatCurrency(value: number) {
  return value.toLocaleString("en-NZ", { style: "currency", currency: "NZD", maximumFractionDigits: 0 });
}

function Pager({ page, pageSize, total, shown, params }: { page: number; pageSize: number; total: number; shown: number; params: { [k: string]: string | undefined } }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  const href = (p: number) => {
    const usp = new URLSearchParams();
    Object.entries({ ...params, page: p > 1 ? String(p) : undefined }).forEach(([k, v]) => v && usp.set(k, v));
    return `/admin/renewals?${usp.toString()}`;
  };
  const first = (page - 1) * pageSize + 1;
  return (
    <nav aria-label="Pages" className="mt-4 flex flex-wrap items-center justify-between gap-3 text-[0.875rem]">
      <span className="text-slate-500">
        Showing <span className="num">{first.toLocaleString("en-NZ")}</span> to <span className="num">{(first + shown - 1).toLocaleString("en-NZ")}</span> of{" "}
        <span className="num">{total.toLocaleString("en-NZ")}</span>
      </span>
      <span className="flex items-center gap-2">
        {page > 1 ? (
          <Link href={href(page - 1)} className="btn-secondary min-h-[36px]">Previous</Link>
        ) : (
          <span className="btn-secondary pointer-events-none min-h-[36px] opacity-40" aria-hidden="true">Previous</span>
        )}
        <span className="px-1 text-slate-500">
          Page <span className="num">{page}</span> of <span className="num">{pages}</span>
        </span>
        {page < pages ? (
          <Link href={href(page + 1)} className="btn-secondary min-h-[36px]">Next</Link>
        ) : (
          <span className="btn-secondary pointer-events-none min-h-[36px] opacity-40" aria-hidden="true">Next</span>
        )}
      </span>
    </nav>
  );
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
  page,
  pageSize,
}: {
  renewals: any[];
  canManage: boolean;
  currentParams: { [key: string]: string | undefined };
  sortField: string;
  sortDir: "asc" | "desc";
  advisers: { id: string; name: string }[];
  underwriters: { id: string; name: string }[];
  monthOptions: { key: string; label: string; count: number; total?: number }[];
  salesTeams: string[];
  totalInvoice: number;
  totalCount: number;
  page: number;
  pageSize: number;
}) {
  // Target GWP is a view-time projection, not stored data: Invoice Total scaled by whatever number is typed in
  // (1 = same as Actual GWP, 1.1 = 10% above). Empty or invalid counts as 1x.
  const [multiplierInput, setMultiplierInput] = useState("");
  const parsedMultiplier = parseFloat(multiplierInput);
  const multiplier = Number.isFinite(parsedMultiplier) ? parsedMultiplier : 1;

  const filtersApplied = Object.keys(currentParams).some(
    (k) => !!currentParams[k] && !["sort", "sortField", "sortDir", "page"].includes(k)
  );

  const figures = [
    { label: filtersApplied ? "Matching policies" : "Policies", value: totalCount.toLocaleString("en-NZ") },
    { label: "Invoice total", value: formatCurrency(totalInvoice) },
    { label: multiplier !== 1 ? `Target GWP at ${multiplier}×` : "Target GWP", value: formatCurrency(totalInvoice * multiplier), accent: multiplier !== 1 },
    { label: "Actual GWP", value: formatCurrency(totalInvoice) },
  ];

  // The export uses exactly the filters on screen (and the Target GWP multiplier, when one is set).
  const exportHref = (() => {
    const usp = new URLSearchParams({ scope: "all" });
    Object.entries(currentParams).forEach(([k, v]) => v && !["sort", "sortField", "sortDir", "page"].includes(k) && usp.set(k, v));
    if (multiplier !== 1) usp.set("multiplier", String(multiplier));
    return `/api/renewals/export?${usp.toString()}`;
  })();

  const hrefForMonth = (key?: string) => {
    const usp = new URLSearchParams();
    Object.entries({ ...currentParams, month: key, page: undefined }).forEach(([k, v]) => v && usp.set(k, v));
    const s = usp.toString();
    return `/admin/renewals${s ? `?${s}` : ""}`;
  };

  return (
    <>
      <header className="page-head">
        <div>
          <h1 className="page-title">Renewals</h1>
          <p className="page-sub">
            {`${totalCount.toLocaleString("en-NZ")} ${totalCount === 1 ? "policy" : "policies"}${filtersApplied ? " match these filters" : ""}.`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <TargetGwpMultiplierInput value={multiplierInput} onChange={setMultiplierInput} />
          <a
            href={exportHref}
            download
            className="btn-secondary"
            title={filtersApplied ? "Download the renewals matching these filters" : "Download every renewal"}
          >
            <DownloadIcon size={16} />
            Export to Excel
          </a>
          {canManage && <AddRenewalForm />}
        </div>
      </header>

      {/* Totals always cover every renewal matching the filters, not just the rows shown. */}
      <section aria-label="Totals" className="mb-6 grid grid-cols-2 border-y border-slate-200 dark:border-slate-800 lg:grid-cols-4">
        {figures.map((f, i) => (
          <div
            key={f.label}
            className={`border-slate-200 px-1 py-4 dark:border-slate-800 sm:px-5 ${i % 2 === 1 ? "border-l" : ""} ${i === 2 ? "lg:border-l" : ""} ${i >= 2 ? "border-t lg:border-t-0" : ""}`}
          >
            <span className="block text-[0.8125rem] text-slate-500 dark:text-slate-400">{f.label}</span>
            <span className={`figure mt-1 block text-[1.625rem] leading-none ${f.accent ? "!text-brand-700 dark:!text-brand-300" : ""}`}>{f.value}</span>
          </div>
        ))}
      </section>

      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-1.5 dark:border-slate-800 dark:bg-slate-900">
        <MonthRuler months={monthOptions} size="sm" activeKey={currentParams.month} hrefFor={(k) => hrefForMonth(k)} allHref={hrefForMonth(undefined)} />
      </div>

      <div className="mb-4">
        <FilterBar advisers={advisers} underwriters={underwriters} salesTeams={salesTeams} current={currentParams} />
      </div>

      <RenewalsTable
        renewals={renewals}
        canManage={canManage}
        currentParams={currentParams}
        sortField={sortField}
        sortDir={sortDir}
        targetGwpMultiplier={multiplier}
      />

      <Pager page={page} pageSize={pageSize} total={totalCount} shown={renewals.length} params={currentParams} />
    </>
  );
}
