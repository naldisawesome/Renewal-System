"use client";

import { useState } from "react";
import { useFeature } from "@/components/FeatureProvider";

/**
 * The main column of a renewal: Activity (notes and changes, what people open the page for) and Policy details,
 * one at a time, so the page stays about one screen tall.
 */
export default function DetailTabs({ activity, details, noteCount }: { activity: React.ReactNode; details: React.ReactNode; noteCount: number }) {
  const notesOn = useFeature("notes");
  const [tab, setTab] = useState<"activity" | "details">(notesOn ? "activity" : "details");
  const tabs = [
    ...(notesOn ? [{ key: "activity" as const, label: "Activity", count: noteCount }] : []),
    { key: "details" as const, label: "Policy details", count: 0 },
  ];
  return (
    <div>
      <div role="tablist" aria-label="Renewal sections" className="mb-5 flex gap-6 border-b border-slate-200 dark:border-slate-800">
        {tabs.map((t) => (
          <button
            key={t.key}
            role="tab"
            type="button"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`-mb-px border-b-2 pb-2.5 text-[0.875rem] transition-colors ${
              tab === t.key ? "border-brand-600 font-medium text-slate-900 dark:border-brand-300 dark:text-slate-50" : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
            }`}
          >
            {t.label}
            {t.count > 0 && <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 py-px text-[0.6875rem] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">{t.count}</span>}
          </button>
        ))}
      </div>
      {/* Both stay mounted so a half-written note or an open edit form survives switching tabs. */}
      <div role="tabpanel" hidden={tab !== "activity"}>{activity}</div>
      <div role="tabpanel" hidden={tab !== "details"}>{details}</div>
    </div>
  );
}
