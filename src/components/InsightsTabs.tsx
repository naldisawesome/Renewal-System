import Link from "next/link";

const TABS = [
  { key: "forecast", label: "Forecast", href: "/admin/dashboard" },
  { key: "stages", label: "Time at each step", href: "/admin/reports?view=stages" },
  { key: "outcomes", label: "Outcomes", href: "/admin/reports?view=outcomes" },
] as const;

/** One Insights page for managers: the sales forecast, where renewals slow down, and how they end. */
export default function InsightsTabs({ active }: { active: (typeof TABS)[number]["key"] }) {
  return (
    <nav aria-label="Insights" className="mb-6 inline-flex rounded-lg bg-slate-200/70 p-0.5 dark:bg-slate-800">
      {TABS.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          aria-current={active === t.key ? "page" : undefined}
          className={`rounded-md px-3.5 py-1.5 text-[0.8125rem] no-underline transition-colors ${
            active === t.key
              ? "bg-white font-medium text-slate-900 shadow-card dark:bg-slate-950 dark:text-slate-50"
              : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
          }`}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
