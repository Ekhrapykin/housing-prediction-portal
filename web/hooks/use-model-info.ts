"use client";

import { useQuery } from "@tanstack/react-query";
import { queries } from "@/lib/data/queries";

export const useModelInfo = () => useQuery(queries.modelInfo());
