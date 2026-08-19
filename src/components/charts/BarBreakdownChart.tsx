"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from "recharts";

const COLORS = ["#2563eb", "#0ea5e9", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#64748b"];

function formatCurrency(value: number) {
  return value.toLocaleString("en-NZ", { style: "currency", currency: "NZD", maximumFractionDigits: 0 });
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload;
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md shadow-sm px-3 py-2 text-sm">
      <p className="font-medium text-slate-900 dark:text-slate-100">{point.label}</p>
      <p className="text-brand-600">{formatCurrency(point.total)}</p>
      <p className="text-slate-400 dark:text-slate-500 text-xs">
        {point.count} polic{point.count === 1 ? "y" : "ies"}
      </p>
    </div>
  );
}

export default function BarBreakdownChart({
  data,
  height = 260,
}: {
  data: { label: string; total: number; count: number }[];
  height?: number;
}) {
  if (data.length === 0) {
    return <p className="text-sm text-slate-400 dark:text-slate-500 py-12 text-center">Nothing to show yet.</p>;
  }

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 12, fill: "#64748b" }}
            tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
          />
          <YAxis type="category" dataKey="label" tick={{ fontSize: 12, fill: "#64748b" }} width={110} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f8fafc" }} />
          <Bar dataKey="total" radius={[0, 4, 4, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
