"use client";

/** The Target GWP multiplier (e.g. 1.1 = 10% above invoice). Its label sits inside the field until a number is typed. */
export default function TargetGwpMultiplierInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <label className="relative block w-44">
      <span className="sr-only">Target GWP multiplier</span>
      <input
        id="targetGwpMultiplier"
        placeholder="Target GWP ×"
        type="number"
        inputMode="decimal"
        min={0}
        step="any"
        className="input-sm h-[38px] pr-3 text-right"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {value && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[0.75rem] text-slate-500">Target ×</span>}
    </label>
  );
}
