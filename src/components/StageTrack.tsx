import { STATUS_LABELS } from "@/lib/statusFlow";
import { CheckIcon } from "./icons";

const STEPS = ["UNASSIGNED", "ASSIGNED", "QUOTED", "CONTACTED", "OUTCOME"] as const;
const INDEX: Record<string, number> = { UNASSIGNED: 0, ASSIGNED: 1, IN_PROGRESS: 1, QUOTED: 2, CONTACTED: 3, RENEWED: 4, CANCELLED: 4, LAPSED: 4 };

/**
 * Where a renewal is on its way from "Not assigned" to an outcome. Steps behind it are ticked, the current one is
 * marked, and the line fills up to it (drawing itself once, so a change of step is seen as movement).
 */
export default function StageTrack({ status }: { status: string }) {
  const at = INDEX[status] ?? 0;
  const closed = at === 4;
  const lost = status === "CANCELLED" || status === "LAPSED";
  const fill = lost ? "bg-[color:var(--late)]" : closed ? "bg-[color:var(--ok)]" : "bg-brand-500 dark:bg-brand-300";
  return (
    <ol className="relative grid grid-cols-5" aria-label={`Progress: ${STATUS_LABELS[status] ?? status}`}>
      {/* The line runs between the centres of the first and last dots. */}
      <span aria-hidden="true" className="absolute left-[10%] right-[10%] top-[11px] h-[2px] rounded-full bg-slate-200 dark:bg-slate-700">
        <span key={status} className={`rs-draw block h-full rounded-full ${fill}`} style={{ width: `${(at / 4) * 100}%` }} />
      </span>
      {STEPS.map((step, i) => {
        const done = i < at || (closed && i === 4);
        const current = i === at && !closed;
        const label = step === "OUTCOME" ? (closed ? STATUS_LABELS[status] : "Outcome") : STATUS_LABELS[step];
        return (
          <li key={step} className="relative flex flex-col items-center gap-2 text-center" aria-current={i === at ? "step" : undefined}>
            <span
              key={current ? status : step}
              className={`relative z-[1] flex h-6 w-6 items-center justify-center rounded-full border-2 ${
                done
                  ? `${fill} border-transparent text-white dark:text-slate-950`
                  : current
                  ? "rs-land border-brand-500 bg-white ring-4 ring-brand-100 dark:border-brand-300 dark:bg-slate-900 dark:ring-brand-900/60"
                  : "border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-900"
              }`}
            >
              {done ? <CheckIcon size={13} /> : current ? <span className="h-2 w-2 rounded-full bg-brand-500 dark:bg-brand-300" /> : null}
            </span>
            <span className={`text-[0.75rem] leading-tight ${i === at ? "font-medium text-slate-900 dark:text-slate-50" : done ? "text-slate-600 dark:text-slate-300" : "text-slate-400 dark:text-slate-500"}`}>
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
