"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { estimator } from "@/lib/clients/browser";

export function useCreateEstimate() {
  return useMutation(estimator.mutations.create(useQueryClient()));
}

export function useDeleteEstimate() {
  return useMutation(estimator.mutations.delete(useQueryClient()));
}
