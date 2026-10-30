import { STATUS_LABELS, STATUS_RANK } from "@/lib/statusFlow";

const STEPS = ["ASSIGNED", "IN_PROGRESS", "QUOTED", "CONTACTED", "OUTCOME"] as const;
const OUTCOME_COLOR: Record<string, string> = { RENEWED: "#1d7465", CANCELLED: "#b5483a", LAPSED: "#b8752f" };

/**
 * Where this renewal is in the workflow: Assigned, In Progress, Quoted, Contacted, then the outcome
 * (Renewed, Cancelled or Lapsed). Completed steps are filled, the current one is marked.
 */
export default function StageTrack({ status }: { status: string }) {
  const rank = STATUS_RANK[status] ?? 0;
  const outcome = rank === 5 ? status : null;
  return (
    <ol className="grid grid-cols-5 gap-1.5" aria-label="Workflow progress">
      {STEPS.map((step, i) => {
        const stepRank = i + 1;
        const done = rank > stepRank || (rank === 5 && stepRank === 5);
        const current = rank === stepRank && step !== "OUTCOME";
        const label = step === "OUTCOME" ? (outcome ? STATUS_LABELS[outcome] : "Outcome") : STATUS_LABELS[step];
        const color = step === "OUTCOME" && outcome ? OUTCOME_COLOR[outcome] : undefined;
        return (
          <li key={step} aria-current={current ? "step" : undefined}>
            <span
              className={`block h-1 rounded-full ${done ? "bg-slate-800 dark:bg-slate-200" : current ? "bg-brand-600 dark:bg-brand-300" : "bg-slate-200 dark:bg-slate-800"}`}
              style={color ? { background: color } : undefined}
            />
            <span
              className={`mt-2 block truncate text-[0.75rem] ${
                current ? "font-medium text-brand-700 dark:text-brand-300" : done ? "text-slate-700 dark:text-slate-300" : "text-slate-400 dark:text-slate-500"
              }`}
              style={color ? { color } : undefined}
            >
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
