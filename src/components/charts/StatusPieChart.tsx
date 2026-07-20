"use client";

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { STATUS_CHART_COLORS } from "@/lib/statusFlow";

function formatCurrency(value: number) {
  return value.toLocaleString("en-NZ", { style: "currency", currency: "NZD", maximumFractionDigits: 0 });
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload;
  const color = STATUS_CHART_COLORS[point.status] || "#64748b";
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md shadow-sm px-3 py-2 text-sm">
      <p className="font-medium text-slate-900 dark:text-slate-100">{point.label}</p>
      <p style={{ color }}>{formatCurrency(point.total)}</p>
      <p className="text-slate-400 dark:text-slate-500 text-xs">
        {point.count} polic{point.count === 1 ? "y" : "ies"}
      </p>
    </div>
  );
}

function renderLegend({ payload }: any) {
  return (
    <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 mt-2">
      {payload.map((entry: any, i: number) => (
        <li key={i} className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
          <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
          {entry.payload.label}
        </li>
      ))}
    </ul>
  );
}

export default function StatusPieChart({
  data,
  height = 280,
}: {
  data: { label: string; status: string; total: number; count: number }[];
  height?: number;
}) {
  const shown = data.filter((d) => d.count > 0);

  if (shown.length === 0) {
    return <p className="text-sm text-slate-400 dark:text-slate-500 py-12 text-center">Nothing to show yet.</p>;
  }

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <PieChart margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
          <Pie
            data={shown}
            dataKey="total"
            nameKey="label"
            innerRadius="55%"
            outerRadius="85%"
            paddingAngle={2}
            strokeWidth={0}
          >
            {shown.map((d) => (
              <Cell key={d.status} fill={STATUS_CHART_COLORS[d.status] || "#64748b"} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend content={renderLegend} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
