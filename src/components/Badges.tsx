import { STATUS_LABELS, STATUS_BADGE_STYLES } from "@/lib/statusFlow";
import { plainStatusLabel } from "@/lib/plainWords";

/** `plainFor` shows the plain-English wording for that role (advisers and underwriters); omit for the standard wording. */
export function StatusBadge({ status, plainFor }: { status: string; plainFor?: string }) {
  return (
    <span className={`badge badge-dot ${STATUS_BADGE_STYLES[status] || STATUS_BADGE_STYLES.UNASSIGNED}`}>
      {plainFor ? plainStatusLabel(status, plainFor) : STATUS_LABELS[status] || status}
    </span>
  );
}

const COMPANY_LABELS: Record<string, string> = {
  CACTUS: "Cactus",
  BLANKET: "Blanket",
};

/** Portfolio: a small coloured mark and the name (each portfolio keeps its own muted colour). */
export function CompanyBadge({ company }: { company: string }) {
  const color = company === "CACTUS" ? "var(--cactus)" : company === "BLANKET" ? "var(--blanket)" : "var(--muted)";
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[0.75rem] font-medium" style={{ color }}>
      <span aria-hidden="true" className="h-2 w-2 rounded-[2px]" style={{ background: color }} />
      {COMPANY_LABELS[company] || company}
    </span>
  );
}

export function BookTypeBadge({ bookType }: { bookType: string }) {
  return (
    <span className="whitespace-nowrap text-[0.75rem] text-slate-500 dark:text-slate-400">
      {bookType === "CONTRACT_WORKS" ? "Contract Works" : "Renewals"}
    </span>
  );
}
