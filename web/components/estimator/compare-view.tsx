"use client";

import Link from "next/link";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ErrorState } from "@/components/error-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEstimatesByIds } from "@/hooks/use-estimates";
import { FIELDS } from "@/lib/house-schema";
import { featureValue, money, priceTicks } from "@/lib/format";
import type { Estimate } from "@/lib/types";
import { cn } from "@/lib/utils";

export function CompareView({ ids }: { ids: number[] }) {
  const { data, isPending, isError, error, refetch } = useEstimatesByIds(ids);

  if (ids.length < 2)
    return (
      <p className="text-muted-foreground">
        Pick 2–4 estimates in the{" "}
        <Link href="/estimator/history" className="text-primary underline underline-offset-4">
          history
        </Link>{" "}
        to compare them.
      </p>
    );
  if (isPending) return <Skeleton className="h-64 w-full" />;
  if (isError) return <ErrorState title="Couldn't load estimates" message={error.message} onRetry={() => refetch()} />;
  if (data.length === 0) return <p className="text-muted-foreground">None of those estimates exist any more.</p>;

  const name = (e: Estimate) => e.label ?? `#${e.id}`;
  const best = (pick: (e: Estimate) => number, dir: "min" | "max") => Math[dir](...data.map(pick));
  const bestPrice = best((e) => e.price, "min");
  const bestSchool = best((e) => e.features.school_rating, "max");
  const hl = "bg-green-100 font-semibold text-green-900 dark:bg-green-900/30 dark:text-green-200";

  return (
    <div className="space-y-6">
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Feature</TableHead>
              {data.map((e) => (
                <TableHead key={e.id} className="text-right">
                  {name(e)}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {FIELDS.map((f) => (
              <TableRow key={f.name}>
                <TableCell className="font-medium">{f.label}</TableCell>
                {data.map((e) => (
                  <TableCell
                    key={e.id}
                    className={cn("text-right tabular-nums", f.name === "school_rating" && e.features.school_rating === bestSchool && hl)}
                  >
                    {featureValue(f.name, e.features[f.name])}
                  </TableCell>
                ))}
              </TableRow>
            ))}
            <TableRow>
              <TableCell className="font-medium">Price</TableCell>
              {data.map((e) => (
                <TableCell key={e.id} className={cn("text-right tabular-nums", e.price === bestPrice && hl)}>
                  {money(e.price)}
                </TableCell>
              ))}
            </TableRow>
          </TableBody>
        </Table>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Price comparison</CardTitle>
        </CardHeader>
        <CardContent className="h-72" aria-hidden>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.map((e) => ({ name: name(e), price: e.price }))}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="name" fontSize={12} />
              <YAxis ticks={priceTicks(Math.max(...data.map((e) => e.price)))} tickFormatter={(v: number) => `$${Math.round(v / 1000)}k`} fontSize={12} />
              <Tooltip formatter={(v) => money(Number(v))} />
              <Bar dataKey="price" name="Price" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
