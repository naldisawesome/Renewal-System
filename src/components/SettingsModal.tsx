"use client";

import { useTheme } from "./ThemeProvider";

const THEME_OPTIONS: { value: "light" | "dark" | "system"; label: string; icon: React.ReactNode }[] = [
  {
    value: "light",
    label: "Light",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
      </svg>
    ),
  },
  {
    value: "dark",
    label: "Dark",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    ),
  },
  {
    value: "system",
    label: "System",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="4" width="20" height="14" rx="2" />
        <path d="M8 21h8M12 17v4" />
      </svg>
    ),
  },
];

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
        checked ? "bg-brand-600" : "bg-slate-300 dark:bg-slate-600"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

export default function SettingsModal({ onClose }: { onClose: () => void }) {
  const { theme, setTheme, reduceMotion, setReduceMotion } = useTheme();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative card w-full max-w-md p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="font-medium text-slate-900 dark:text-slate-100">Settings</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg leading-none"
          >
            ✕
          </button>
        </div>

        <div>
          <p className="label mb-2">Appearance</p>
          <div className="grid grid-cols-3 gap-2">
            {THEME_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setTheme(opt.value)}
                className={`flex flex-col items-center gap-1.5 rounded-md border px-3 py-2.5 text-xs font-medium transition-colors ${
                  theme === opt.value
                    ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-100"
                    : "border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                {opt.icon}
                {opt.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-2">
            &quot;System&quot; follows your device&apos;s light/dark setting automatically.
          </p>
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-700 pt-4">
          <div>
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">Reduce motion</p>
            <p className="text-xs text-slate-400">Turns off animations and transitions across the app.</p>
          </div>
          <Toggle checked={reduceMotion} onChange={setReduceMotion} />
        </div>

        <button onClick={onClose} className="btn-secondary w-full text-sm">
          Done
        </button>
      </div>
    </div>
  );
}
