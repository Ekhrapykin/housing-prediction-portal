"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { HouseFields } from "@/components/house-fields";
import { EstimateResult } from "@/components/estimator/estimate-result";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateEstimate } from "@/hooks/use-estimates";
import { errorMessage } from "@/lib/api";
import { queries } from "@/lib/data/queries";
import { EXAMPLE, estimateSchema, type EstimateFormValues } from "@/lib/house-schema";
import type { Estimate } from "@/lib/types";

export function EstimateForm() {
  const form = useForm<EstimateFormValues>({ resolver: zodResolver(estimateSchema) });
  const create = useCreateEstimate();
  const info = useQuery(queries.modelInfo());
  const [estimate, setEstimate] = useState<Estimate | null>(null);

  const onSubmit = form.handleSubmit((values) => {
    const { label, ...features } = values;
    create.mutate(
      { ...features, label: label?.trim() || null },
      {
        onSuccess: (e) => {
          setEstimate(e);
          toast.success("Estimate saved to history");
        },
        onError: (e) => toast.error(errorMessage(e)),
      },
    );
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardContent>
          <form onSubmit={onSubmit} noValidate className="space-y-4">
            <div className="grid gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
              <HouseFields form={form} stats={info.data?.feature_stats} idPrefix="est" />
              <div className="space-y-1.5">
                <Label htmlFor="est-label">Label (optional)</Label>
                <Input
                  id="est-label"
                  placeholder="e.g. Maple St"
                  aria-invalid={form.formState.errors.label ? true : undefined}
                  aria-describedby="est-label-error"
                  {...form.register("label")}
                />
                <p className="min-h-4" />
                <p id="est-label-error" aria-live="polite" className="text-xs text-destructive">
                  {form.formState.errors.label?.message}
                </p>
              </div>
            </div>
            {info.isError && (
              <p className="text-xs text-muted-foreground">Typical ranges are unavailable right now: {info.error.message}</p>
            )}
            <div className="flex gap-2">
              <Button type="submit" disabled={create.isPending}>
                {create.isPending && <Loader2 className="animate-spin" aria-hidden />}
                {create.isPending ? "Estimating…" : "Estimate price"}
              </Button>
              <Button type="button" variant="outline" onClick={() => form.reset({ ...EXAMPLE, label: form.getValues("label") })}>
                Fill example
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      {estimate && <EstimateResult estimate={estimate} />}
    </div>
  );
}
