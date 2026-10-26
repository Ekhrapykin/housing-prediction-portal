"use client";

import { CartesianGrid, Line, LineChart, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { featureValue, money } from "@/lib/format";
import type { FeatureName, FeatureStat, WhatIfPoint } from "@/lib/types";

export function WhatIfChart({
  feature, data, baseValue, stat, from, to,
}: {
  feature: FeatureName;
  data: WhatIfPoint[];
  baseValue: number;
  stat: FeatureStat;
  from: number;
  to: number;
}) {
  return (
    <div className="h-80 w-full" aria-hidden>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ right: 16 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" dataKey="value" domain={[from, to]} tickFormatter={(v: number) => featureValue(feature, v)} fontSize={12} allowDataOverflow />
          <YAxis tickFormatter={(v: number) => `$${Math.round(v / 1000)}k`} domain={["auto", "auto"]} fontSize={12} />
          <Tooltip labelFormatter={(v) => featureValue(feature, Number(v))} formatter={(v) => money(Number(v))} />
          {from < stat.min && (
            <ReferenceArea x1={from} x2={stat.min} fill="var(--muted-foreground)" fillOpacity={0.12} label={{ value: "extrapolation", fontSize: 11 }} />
          )}
          {to > stat.max && (
            <ReferenceArea x1={stat.max} x2={to} fill="var(--muted-foreground)" fillOpacity={0.12} label={{ value: "extrapolation", fontSize: 11 }} />
          )}
          {baseValue >= from && baseValue <= to && (
            <ReferenceLine x={baseValue} stroke="var(--chart-2)" strokeDasharray="4 4" label={{ value: "base", fontSize: 11, position: "top" }} />
          )}
          <Line type="monotone" dataKey="value" hide />
          <Line type="monotone" dataKey="price" name="Price" stroke="var(--chart-1)" strokeWidth={2} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
