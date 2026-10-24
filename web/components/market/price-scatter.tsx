"use client";

import { CartesianGrid, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { money, number } from "@/lib/format";
import type { Property } from "@/lib/types";

export function PriceScatter({ data }: { data: Property[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Price vs square footage</CardTitle>
      </CardHeader>
      <CardContent className="h-72" aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" dataKey="square_footage" name="Sq ft" fontSize={12} domain={["auto", "auto"]} />
            <YAxis type="number" dataKey="price" name="Price" tickFormatter={(v: number) => `$${Math.round(v / 1000)}k`} fontSize={12} domain={["auto", "auto"]} />
            <Tooltip cursor={{ strokeDasharray: "3 3" }} formatter={(v, name) => (name === "Price" ? money(Number(v)) : number(Number(v)))} />
            <Scatter data={data} fill="var(--chart-1)" />
          </ScatterChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
