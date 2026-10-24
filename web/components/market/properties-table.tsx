"use client";

import {
  columnFilteringFeature,
  createColumnHelper,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  filterFn_includesString,
  globalFilteringFeature,
  rowPaginationFeature,
  rowSortingFeature,
  sortFn_basic,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { money, number } from "@/lib/format";
import type { Property } from "@/lib/types";

// Module scope: v9 needs stable features/columns.
const features = tableFeatures({
  rowSortingFeature,
  columnFilteringFeature,
  globalFilteringFeature,
  rowPaginationFeature,
  sortedRowModel: createSortedRowModel(),
  filteredRowModel: createFilteredRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  sortFns: { basic: sortFn_basic },
  filterFns: { includesString: filterFn_includesString },
});

const h = createColumnHelper<typeof features, Property>();
const columns = h.columns([
  h.accessor("id", { header: "ID" }),
  h.accessor("square_footage", { header: "Sq ft", cell: (c) => number(c.getValue()) }),
  h.accessor("bedrooms", { header: "Beds" }),
  h.accessor("bathrooms", { header: "Baths" }),
  h.accessor("year_built", { header: "Year" }),
  h.accessor("lot_size", { header: "Lot (sq ft)", cell: (c) => number(c.getValue()) }),
  h.accessor("distance_to_city_center", { header: "Distance (km)" }),
  h.accessor("school_rating", { header: "School" }),
  h.accessor("price", { header: "Price", cell: (c) => money(c.getValue()) }),
]);

// Less important columns collapse below md / sm.
const HIDDEN: Record<string, string> = {
  id: "hidden md:table-cell",
  bathrooms: "hidden sm:table-cell",
  lot_size: "hidden md:table-cell",
  distance_to_city_center: "hidden md:table-cell",
  year_built: "hidden sm:table-cell",
};

const ARIA_SORT = { asc: "ascending", desc: "descending" } as const;

export function PropertiesTable({ data }: { data: Property[] }) {
  const table = useTable({
    features,
    columns,
    data,
    initialState: { pagination: { pageIndex: 0, pageSize: 15 } },
    globalFilterFn: "includesString",
    getColumnCanGlobalFilter: () => true,
  });
  const { pageIndex } = table.state.pagination;

  return (
    <div className="space-y-4">
      <Input
        aria-label="Filter properties"
        placeholder="Filter all columns…"
        className="max-w-xs"
        value={(table.state.globalFilter as string | undefined) ?? ""}
        onChange={(e) => table.setGlobalFilter(e.target.value)}
      />
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((group) => (
              <TableRow key={group.id}>
                {group.headers.map((header) => {
                  const sorted = header.column.getIsSorted();
                  const Icon = sorted === "asc" ? ArrowUp : sorted === "desc" ? ArrowDown : ChevronsUpDown;
                  return (
                    <TableHead key={header.id} aria-sort={sorted ? ARIA_SORT[sorted] : "none"} className={HIDDEN[header.column.id]}>
                      <button
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
                        className="inline-flex items-center gap-1 rounded-sm font-medium hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                      >
                        <table.FlexRender header={header} />
                        <Icon className="size-3.5 opacity-60" aria-hidden />
                      </button>
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getAllCells().map((cell) => (
                  <TableCell key={cell.id} className={`tabular-nums ${HIDDEN[cell.column.id] ?? ""}`}>
                    <table.FlexRender cell={cell} />
                  </TableCell>
                ))}
              </TableRow>
            ))}
            {table.getRowModel().rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={columns.length} className="py-8 text-center text-muted-foreground">
                  No matching properties.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          Page {pageIndex + 1} of {Math.max(table.getPageCount(), 1)} · {table.getPrePaginatedRowModel().rows.length} rows
        </span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
            Previous
          </Button>
          <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
