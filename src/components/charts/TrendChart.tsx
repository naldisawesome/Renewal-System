"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

function formatCurrency(value: number) {
  return value.toLocaleString("en-NZ", { style: "currency", currency: "NZD", maximumFractionDigits: 0 });
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload;
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md shadow-sm px-3 py-2 text-sm">
      <p className="font-medium text-slate-900 dark:text-slate-100">{label}</p>
      <p className="text-brand-600">{formatCurrency(point.total)}</p>
      <p className="text-slate-400 dark:text-slate-500 text-xs">
        {point.count} polic{point.count === 1 ? "y" : "ies"}
      </p>
    </div>
  );
}

export default function TrendChart({ data }: { data: { label: string; total: number; count: number }[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-slate-400 dark:text-slate-500 py-16 text-center">No dated policies to chart yet.</p>;
  }

  return (
    <div style={{ width: "100%", height: 280 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#64748b" }} />
          <YAxis
            tick={{ fontSize: 12, fill: "#64748b" }}
            tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
            width={50}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="total"
            stroke="#2563eb"
            strokeWidth={2}
            dot={{ r: 3, fill: "#2563eb" }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
