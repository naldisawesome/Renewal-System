"use client";

import AddRenewalForm from "./AddRenewalForm";
import FilterBar from "./FilterBar";
import RememberFilters from "./RememberFilters";
import RenewalsTable from "./RenewalsTable";
import ReassignDialog from "./ReassignDialog";
import Runway, { type RunwayStop } from "@/components/Runway";
import { DownloadIcon } from "@/components/icons";
import Link from "next/link";
import { Feature } from "@/components/FeatureProvider";

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
  runway,
  people = [],
}: {
  renewals: any[];
  canManage: boolean;
  currentParams: { [key: string]: string | undefined };
  sortField: string;
  sortDir: "asc" | "desc";
  advisers: { id: string; name: string; open?: number }[];
  underwriters: { id: string; name: string; open?: number }[];
  monthOptions: { key: string; label: string; count: number; total?: number }[];
  salesTeams: string[];
  totalInvoice: number;
  totalCount: number;
  page: number;
  pageSize: number;
  runway: RunwayStop[];
  people?: { id: string; name: string; role: string; active: boolean; open: number }[];
}) {
  const filtersApplied = Object.keys(currentParams).some(
    (k) => !!currentParams[k] && !["sort", "sortField", "sortDir", "page"].includes(k)
  );

  // The export uses exactly the filters on screen.
  const exportHref = (() => {
    const usp = new URLSearchParams({ scope: "all" });
    Object.entries(currentParams).forEach(([k, v]) => v && !["sort", "sortField", "sortDir", "page"].includes(k) && usp.set(k, v));
    return `/api/renewals/export?${usp.toString()}`;
  })();

  const hrefForDue = (key?: string) => {
    const usp = new URLSearchParams();
    Object.entries({ ...currentParams, due: key, page: undefined }).forEach(([k, v]) => v && usp.set(k, v));
    const s = usp.toString();
    return `/admin/renewals${s ? `?${s}` : ""}`;
  };

  return (
    <>
      <RememberFilters current={currentParams} />
      <header className="page-head">
        <div>
          <h1 className="page-title">Renewals</h1>
          <p className="page-sub">
            {`${totalCount.toLocaleString("en-NZ")} ${totalCount === 1 ? "policy" : "policies"}${filtersApplied ? " match these filters" : ""}, ${formatCurrency(totalInvoice)} in invoices.`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canManage && <Feature name="allocate"><ReassignDialog people={people} /></Feature>}
          <Feature name="export"><a
            href={exportHref}
            download
            className="btn-secondary"
            title={filtersApplied ? "Download the renewals matching these filters" : "Download every renewal"}
          >
            <DownloadIcon size={16} />
            Export to Excel
          </a></Feature>
          {canManage && <AddRenewalForm />}
        </div>
      </header>

      <div className="mb-4">
        <Runway stops={runway} activeKey={currentParams.due} hrefFor={hrefForDue} />
      </div>

      <div className="mb-4">
        <FilterBar monthOptions={monthOptions} advisers={advisers} underwriters={underwriters} salesTeams={salesTeams} current={currentParams} canShare={canManage} />
      </div>

      <RenewalsTable
        renewals={renewals}
        canManage={canManage}
        currentParams={currentParams}
        sortField={sortField}
        sortDir={sortDir}
        advisers={advisers}
        underwriters={underwriters}
      />

      <Pager page={page} pageSize={pageSize} total={totalCount} shown={renewals.length} params={currentParams} />
    </>
  );
}
