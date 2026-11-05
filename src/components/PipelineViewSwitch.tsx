"use client";

import Link from "next/link";

export const VIEW_COOKIE = "rs-pipeline-view";

/** Board / Calendar switch shown at the top of both pages. The choice is remembered on this browser. */
export default function PipelineViewSwitch({ active }: { active: "board" | "calendar" }) {
  const remember = (v: string) => {
    try { document.cookie = `${VIEW_COOKIE}=${v}; path=/; max-age=31536000; samesite=lax`; } catch {}
  };
  const tabs: { key: "board" | "calendar"; label: string; href: string }[] = [
    { key: "board", label: "Board", href: "/workspace/board?view=board" },
    { key: "calendar", label: "Calendar", href: "/workspace/calendar" },
  ];
  return (
    <div role="group" aria-label="Choose a view" className="no-print inline-flex rounded-lg border border-slate-300 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-900">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          onClick={() => remember(t.key)}
          aria-current={active === t.key ? "page" : undefined}
          className={`inline-flex min-h-[34px] items-center rounded-md px-4 text-[0.875rem] no-underline transition-colors ${
            active === t.key
              ? "bg-brand-600 font-medium text-white dark:bg-brand-300 dark:text-slate-950"
              : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          }`}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
