"use client";

import { useQuery } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { ErrorState } from "@/components/error-state";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDeleteEstimate } from "@/hooks/use-estimates";
import { errorMessage } from "@/lib/api";
import { queries } from "@/lib/data/queries";
import { date, money, number } from "@/lib/format";

export function HistoryTable() {
  const { data, isPending, isError, error, refetch } = useQuery(queries.estimates());
  const del = useDeleteEstimate();
  const [selected, setSelected] = useState<number[]>([]);

  if (isPending) return <Skeleton className="h-64 w-full" />;
  if (isError) return <ErrorState title="Couldn't load history" message={error.message} onRetry={() => refetch()} />;
  if (data.length === 0)
    return (
      <p className="text-muted-foreground">
        No estimates yet.{" "}
        <Link href="/estimator" className="text-primary underline underline-offset-4">
          Make one
        </Link>
        .
      </p>
    );

  const toggle = (id: number) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const canCompare = selected.length >= 2 && selected.length <= 4;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        {canCompare ? (
          <Link href={`/estimator/compare?ids=${selected.join(",")}`} className={buttonVariants()}>
            Compare ({selected.length})
          </Link>
        ) : (
          <Button disabled>Compare ({selected.length})</Button>
        )}
        {!canCompare && <span className="text-xs text-muted-foreground">Select 2–4 rows.</span>}
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <span className="sr-only">Select</span>
              </TableHead>
              <TableHead>Label</TableHead>
              <TableHead className="text-right">Sq ft</TableHead>
              <TableHead className="hidden text-right sm:table-cell">Beds</TableHead>
              <TableHead className="hidden text-right md:table-cell">Year</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="hidden md:table-cell">Created</TableHead>
              <TableHead className="w-10">
                <span className="sr-only">Delete</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((e) => {
              const name = e.label ?? `Estimate #${e.id}`;
              return (
                <TableRow key={e.id}>
                  <TableCell>
                    <Checkbox checked={selected.includes(e.id)} onCheckedChange={() => toggle(e.id)} aria-label={`Select ${name}`} />
                  </TableCell>
                  <TableCell className="font-medium">{name}</TableCell>
                  <TableCell className="text-right tabular-nums">{number(e.features.square_footage)}</TableCell>
                  <TableCell className="hidden text-right tabular-nums sm:table-cell">{e.features.bedrooms}</TableCell>
                  <TableCell className="hidden text-right tabular-nums md:table-cell">{e.features.year_built}</TableCell>
                  <TableCell className="text-right tabular-nums">{money(e.price)}</TableCell>
                  <TableCell className="hidden whitespace-nowrap text-muted-foreground md:table-cell">{date(e.created_at)}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Delete ${name}`}
                      disabled={del.isPending}
                      onClick={() =>
                        del.mutate(e.id, {
                          onSuccess: () => setSelected((s) => s.filter((x) => x !== e.id)),
                          onError: (err) => toast.error(errorMessage(err)),
                        })
                      }
                    >
                      <Trash2 />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
