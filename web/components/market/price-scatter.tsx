"use client";

import { CartesianGrid, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { money, number } from "@/lib/format";
import type { Property } from "@/lib/types";

/** `total` is the number of matching properties; `data` may be a capped sample of them. */
export function PriceScatter({ data, total }: { data: Property[]; total: number }) {
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
      {total > data.length && <p className="px-4 text-xs text-muted-foreground">Showing the first {data.length} of {total} properties.</p>}
      <table className="sr-only">
        <caption>Price vs square footage</caption>
        <thead>
          <tr>
            <th scope="col">Property</th>
            <th scope="col">Square footage</th>
            <th scope="col">Price</th>
          </tr>
        </thead>
        <tbody>
          {data.map((p) => (
            <tr key={p.id}>
              <th scope="row">#{p.id}</th>
              <td>{number(p.square_footage)}</td>
              <td>{money(p.price)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
