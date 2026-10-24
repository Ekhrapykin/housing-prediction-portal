"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { money, priceTicks } from "@/lib/format";
import type { SegmentKey, SegmentRow } from "@/lib/types";

export function SegmentChart({ data, by }: { data: SegmentRow[]; by: SegmentKey }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Average price by {by.replace("_", " ").toLowerCase()}</CardTitle>
      </CardHeader>
      <CardContent className="h-72" aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="segment" fontSize={12} />
            <YAxis ticks={priceTicks(Math.max(0, ...data.map((d) => d.avg_price)))} tickFormatter={(v: number) => `$${Math.round(v / 1000)}k`} fontSize={12} />
            <Tooltip formatter={(v, name) => (name === "Avg price" ? money(Number(v)) : v)} />
            <Bar dataKey="avg_price" name="Avg price" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
