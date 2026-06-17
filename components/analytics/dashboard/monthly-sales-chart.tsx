"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { MonthlyPoint } from "@/hooks/use-sales";

interface Props {
  data:  MonthlyPoint[];
  mode?: "quantity" | "revenue";
}

export function MonthlySalesChart({ data, mode = "quantity" }: Props) {
  const fmtRevenue = (v: number) =>
    v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v}`;

  const formatter =
    mode === "revenue"
      ? (v: number) => fmtRevenue(v)
      : (v: number) => String(v);

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={formatter}
        />
        <Tooltip
          formatter={(v: unknown) => formatter(v as number)}
          contentStyle={{
            background:   "hsl(var(--card))",
            border:       "1px solid hsl(var(--border))",
            borderRadius: 8,
            fontSize:     13,
            color:        "hsl(var(--card-foreground))",
          }}
          labelStyle={{ color: "hsl(var(--card-foreground))" }}
          itemStyle={{ color: "hsl(var(--card-foreground))" }}
        />
        <Legend wrapperStyle={{ fontSize: 13 }} />
        {mode === "revenue" ? (
          <Bar dataKey="revenue" name="Revenue" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
        ) : (
          <Bar dataKey="quantity" name="Units Sold" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
        )}
      </BarChart>
    </ResponsiveContainer>
  );
}
