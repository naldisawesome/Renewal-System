"use client";

import { useState } from "react";

const currency = (v: number) => v.toLocaleString("en-NZ", { style: "currency", currency: "NZD", maximumFractionDigits: 0 });
const short = (v: number) => (v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}m` : v >= 1000 ? `$${Math.round(v / 1000)}k` : `$${Math.round(v)}`);

/** Nice round axis maximum and ticks for a value. */
function scale(max: number) {
  if (max <= 0) return { top: 1, ticks: [0] };
  const step0 = max / 4;
  const mag = 10 ** Math.floor(Math.log10(step0));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= step0) ?? 10 * mag;
  const top = Math.ceil(max / step) * step;
  return { top, ticks: Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step) };
}

/**
 * Forecast value per renewal month, as columns (each month is a separate amount). Hovering or focusing a month
 * shows its exact value and policy count. Drawn as plain SVG: no charting library to download.
 */
export default function TrendChart({ data, height = 240 }: { data: { label: string; total: number; count: number }[]; height?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  if (data.length === 0) {
    return <p className="py-16 text-center text-[0.875rem] text-slate-500">No dated policies to chart yet.</p>;
  }

  const W = 720, H = height, L = 52, R = 8, T = 16, B = 28;
  const { top, ticks } = scale(Math.max(...data.map((d) => d.total)));
  const band = (W - L - R) / data.length;
  const bw = Math.min(44, band * 0.62);
  const y = (v: number) => T + (H - T - B) * (1 - v / top);
  // Until someone hovers, show the current month (or the last month, if this month has no renewals).
  const nowLabel = new Date().toLocaleDateString("en-NZ", { month: "short", year: "numeric", timeZone: "UTC" });
  const nowIndex = data.findIndex((d) => d.label === nowLabel);
  const active = hover ?? (nowIndex >= 0 ? nowIndex : data.length - 1);
  const a = data[active];

  return (
    <div>
      <div className="mb-3 flex items-baseline gap-3" aria-live="polite">
        <span className="figure text-[1.375rem]">{currency(a.total)}</span>
        <span className="text-[0.8125rem] text-slate-500">
          {a.label}, {a.count} {a.count === 1 ? "policy" : "policies"}
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label="Forecasted sales by renewal month">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} className="stroke-slate-200 dark:stroke-slate-800" strokeWidth={1} />
            <text x={L - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-slate-500 text-[11px]">
              {short(t)}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const x = L + band * i + (band - bw) / 2;
          const h = Math.max(1, y(0) - y(d.total));
          const on = i === active;
          return (
            <g
              key={d.label}
              tabIndex={0}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              className="cursor-default outline-none"
            >
              <title>{`${d.label}: ${currency(d.total)} (${d.count} ${d.count === 1 ? "policy" : "policies"})`}</title>
              <rect x={L + band * i} y={T} width={band} height={H - T - B} fill="transparent" />
              <rect
                x={x}
                y={y(0) - h}
                width={bw}
                height={h}
                rx={3}
                className={`rs-grow-y ${on ? "fill-brand-600 dark:fill-brand-300" : "fill-slate-300 dark:fill-slate-700"}`}
                style={{ transformBox: "fill-box", animationDelay: `${i * 35}ms` }}
              />
              <text x={L + band * i + band / 2} y={H - 8} textAnchor="middle" className={`text-[11px] ${on ? "fill-slate-900 dark:fill-slate-100" : "fill-slate-500"}`}>
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
