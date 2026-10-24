"use client";

import { Bar, BarChart, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { signedMoney } from "@/lib/format";

const UP = "#16a34a";
const DOWN = "#dc2626";

export function ContributionChart({ data }: { data: { name: string; value: number }[] }) {
  return (
    <div className="h-72 w-full" aria-hidden>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
          <XAxis type="number" tickFormatter={(v: number) => signedMoney(v)} fontSize={12} />
          <YAxis type="category" dataKey="name" width={140} fontSize={12} />
          <Tooltip formatter={(v) => signedMoney(Number(v))} />
          <ReferenceLine x={0} stroke="currentColor" />
          <Bar dataKey="value" name="vs average house">
            {data.map((d) => (
              <Cell key={d.name} fill={d.value >= 0 ? UP : DOWN} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
