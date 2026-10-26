"use client";

import { useQuery } from "@tanstack/react-query";
import { ContributionChart } from "@/components/estimator/contribution-chart";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { estimator } from "@/lib/clients/browser";
import { FIELDS } from "@/lib/house-schema";
import { featureValue, money, signedMoney } from "@/lib/format";
import type { Estimate } from "@/lib/types";

export function EstimateResult({ estimate }: { estimate: Estimate }) {
  const info = useQuery(estimator.queries.modelInfo()).data;
  const rows = FIELDS.map((f) => {
    const value = estimate.features[f.name];
    const mean = info?.feature_stats[f.name].mean;
    const contribution = info && mean !== undefined ? info.coefficients[f.name] * (value - mean) : undefined;
    return { name: f.name, label: f.label, value, mean, contribution };
  });
  const chart = rows.flatMap((r) => (r.contribution === undefined ? [] : [{ name: r.label, value: r.contribution }]));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{estimate.label ? `Estimate for ${estimate.label}` : "Estimated price"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <p aria-live="polite" className="text-4xl font-bold tabular-nums">
            {money(estimate.price)}
          </p>
          {estimate.warnings.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-2" aria-label="Warnings">
              {estimate.warnings.map((w) => (
                <li key={w}>
                  <Badge variant="destructive">{w}</Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Feature</TableHead>
                  <TableHead className="text-right">Your value</TableHead>
                  <TableHead className="hidden text-right sm:table-cell">Average</TableHead>
                  <TableHead className="text-right">Contribution</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.name}>
                    <TableCell>{r.label}</TableCell>
                    <TableCell className="text-right tabular-nums">{featureValue(r.name, r.value)}</TableCell>
                    <TableCell className="hidden text-right tabular-nums sm:table-cell">{r.mean === undefined ? "–" : featureValue(r.name, r.mean)}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.contribution === undefined ? "–" : signedMoney(r.contribution)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p className="mt-2 text-xs text-muted-foreground">Contribution = coefficient × (your value − average house value).</p>
          </div>
          {chart.length > 0 && <ContributionChart data={chart} />}
        </div>
      </CardContent>
    </Card>
  );
}
