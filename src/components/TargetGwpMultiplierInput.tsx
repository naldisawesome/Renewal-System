"use client";

export default function TargetGwpMultiplierInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="w-44">
      {/* Label lives as placeholder text inside the box itself - it's
          replaced by whatever the admin types, and reappears the moment
          the box is cleared, instead of taking up a separate row above it. */}
      <input
        id="targetGwpMultiplier"
        aria-label="Target GWP multiplier"
        placeholder="Target GWP multiplier"
        type="number"
        inputMode="decimal"
        min={0}
        step="any"
        className="input text-right"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
