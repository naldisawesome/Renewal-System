import { PROGRESS_STEPS, STATUS_RANK } from "@/lib/statusFlow";

function daysSince(date: Date) {
  const ms = Date.now() - date.getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

function formatDate(date: Date) {
  return date.toLocaleDateString("en-NZ");
}

/**
 * Chevron-style progress bar for a renewal's status.
 *
 * `currentStatus` is the renewal's live RenewalStatus. `statusSince` is when
 * it entered that status (used for the date/day-count under the active
 * step) - pass the renewal's `updatedAt`, since that's touched every time
 * the status changes.
 */
export default function RenewalProgress({
  currentStatus,
  statusSince,
}: {
  currentStatus: string;
  statusSince: Date;
}) {
  const rank = STATUS_RANK[currentStatus] ?? 0;
  const isCancelled = currentStatus === "CANCELLED";
  const isLapsed = currentStatus === "LAPSED";
  const finalOutcomeLabel = isCancelled ? "Cancelled" : isLapsed ? "Lapsed" : "Renewed";

  if (currentStatus === "UNASSIGNED") {
    return (
      <div className="text-sm text-slate-500 dark:text-slate-400">
        Awaiting adviser assignment before the workflow starts.
      </div>
    );
  }

  return (
    <div>
      <div className="flex w-full">
        {PROGRESS_STEPS.map((step, i) => {
          const stepRank = i + 1;
          const isLast = i === PROGRESS_STEPS.length - 1;
          const label = isLast ? finalOutcomeLabel : step.label;

          let colorClasses = "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500";

          if (stepRank < rank) {
            // Completed step.
            colorClasses = "bg-green-600 text-white";
          } else if (stepRank === rank) {
            // Current step - colour depends on whether it's a normal step
            // in progress, or a final outcome (renewed vs cancelled/lapsed).
            if (isLast && isCancelled) colorClasses = "bg-red-600 text-white";
            else if (isLast && isLapsed) colorClasses = "bg-orange-500 text-white";
            else if (isLast) colorClasses = "bg-green-600 text-white";
            else colorClasses = "bg-amber-500 text-white";
          }

          return (
            <div key={step.key} className="relative flex-1 min-w-0">
              <div
                className={`flex items-center justify-center h-10 text-xs font-medium px-3 ${colorClasses}`}
                style={{
                  clipPath:
                    i === 0
                      ? "polygon(0 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 0 100%)"
                      : isLast
                        ? "polygon(0 0, 100% 0, 100% 100%, 0 100%, 14px 50%)"
                        : "polygon(0 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 0 100%, 14px 50%)",
                  marginLeft: i === 0 ? 0 : -1,
                }}
                title={label}
              >
                <span className="truncate">{label}</span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex w-full mt-1.5">
        {PROGRESS_STEPS.map((step, i) => {
          const stepRank = i + 1;
          const show = stepRank === rank;
          const days = daysSince(statusSince);
          return (
            <div key={step.key} className="flex-1 min-w-0 text-center">
              {show && (
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {formatDate(statusSince)} · {days} day{days === 1 ? "" : "s"}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
