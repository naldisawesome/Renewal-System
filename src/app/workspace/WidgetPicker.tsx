"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Spinner from "@/components/Spinner";
import { SettingsIcon } from "@/components/icons";
import { WIDGETS, type WidgetId } from "@/lib/widgets";

/** "Customise" menu for the tiles at the top of My renewals. Saves to the person's own account. */
export default function WidgetPicker({ selected }: { selected: WidgetId[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<WidgetId[]>(selected);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(id: WidgetId) {
    setDraft((d) => (d.includes(id) ? d.filter((x) => x !== id) : [...d, id]));
  }

  async function save(widgets: WidgetId[] | null) {
    setSaving(true);
    setError(null);
    const res = await fetch("/api/account/widgets", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ widgets }) });
    setSaving(false);
    if (!res.ok) {
      setError("Could not save. Try again.");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setDraft(selected);
          setError(null);
          setOpen((o) => !o);
        }}
        aria-expanded={open}
        className="btn-ghost min-h-[32px] px-3 py-1.5 text-[0.8125rem]"
      >
        <SettingsIcon size={14} />
        Customise
      </button>
      {open && (
        <div className="rs-pop absolute right-0 top-full z-30 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-3 shadow-pop dark:border-slate-800 dark:bg-slate-900" role="group" aria-label="Choose what to show">
          <p className="mb-2 text-[0.8125rem] font-medium text-slate-600 dark:text-slate-300">Show on this page</p>
          <ul className="space-y-1.5">
            {WIDGETS.map((w) => (
              <li key={w.id}>
                <label className="flex cursor-pointer items-center gap-2 text-[0.875rem] text-slate-800 dark:text-slate-100">
                  <input type="checkbox" checked={draft.includes(w.id)} onChange={() => toggle(w.id)} />
                  {w.label}
                </label>
              </li>
            ))}
          </ul>
          {error && <p className="mt-2 text-[0.75rem] text-[#a33a2c] dark:text-[#eda499]">{error}</p>}
          <div className="mt-3 flex items-center gap-2">
            <button type="button" onClick={() => save(draft)} disabled={saving || draft.length === 0} className="btn-primary min-h-[32px] flex-1 px-3 py-1.5 text-[0.8125rem]">
              {saving && <Spinner />}
              Save
            </button>
            <button type="button" onClick={() => save(null)} disabled={saving} className="btn-ghost min-h-[32px] px-3 py-1.5 text-[0.8125rem]">
              Reset
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
