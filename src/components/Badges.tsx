import { STATUS_LABELS, STATUS_BADGE_STYLES } from "@/lib/statusFlow";

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`badge ${STATUS_BADGE_STYLES[status] || "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"}`}
    >
      {STATUS_LABELS[status] || status}
    </span>
  );
}

const COMPANY_STYLES: Record<string, string> = {
  CACTUS: "bg-emerald-100 text-emerald-700",
  BLANKET: "bg-indigo-100 text-indigo-700",
};

const COMPANY_LABELS: Record<string, string> = {
  CACTUS: "Cactus",
  BLANKET: "Blanket",
};

export function CompanyBadge({ company }: { company: string }) {
  return (
    <span className={`badge ${COMPANY_STYLES[company] || "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"}`}>
      {COMPANY_LABELS[company] || company}
    </span>
  );
}

export function BookTypeBadge({ bookType }: { bookType: string }) {
  return (
    <span className="badge bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
      {bookType === "CONTRACT_WORKS" ? "Contract Works" : "Renewals"}
    </span>
  );
}
