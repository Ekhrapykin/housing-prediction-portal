"use client";

import {
  columnFilteringFeature,
  createColumnHelper,
  createFilteredRowModel,
  filterFn_includesString,
  globalFilteringFeature,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Sort } from "@/lib/data/endpoints";
import { money, number } from "@/lib/format";
import type { Page, Property } from "@/lib/types";

// Module scope: v9 needs stable features/columns. Sorting and paging happen on the server (`?sort=`, `?page=`);
// the table only filters the rows of the current page.
const features = tableFeatures({
  columnFilteringFeature,
  globalFilteringFeature,
  filteredRowModel: createFilteredRowModel(),
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

function PageLink({ href, disabled, children }: { href: string; disabled: boolean; children: React.ReactNode }) {
  if (disabled)
    return (
      <Button variant="outline" size="sm" disabled>
        {children}
      </Button>
    );
  return (
    <Link href={href} scroll={false} prefetch={false} className={buttonVariants({ variant: "outline", size: "sm" })}>
      {children}
    </Link>
  );
}

/** `filters` are the market filters from the URL; links keep them and change only `page` / `sort`. */
export function PropertiesTable({ data, sort, filters }: { data: Page<Property>; sort: Sort | null; filters: URLSearchParams }) {
  const table = useTable({
    features,
    columns,
    data: data.items,
    globalFilterFn: "includesString",
    getColumnCanGlobalFilter: () => true,
  });

  const page = data.page + 1; // the backend is 0-based, the URL is 1-based
  const lastPage = Math.max(Math.ceil(data.total / data.size), 1);
  const first = data.page * data.size + 1;
  const last = data.page * data.size + data.items.length;
  const href = (patch: { page?: number; sort?: Sort }) => {
    const q = new URLSearchParams(filters);
    const s = patch.sort ?? sort;
    if (s) q.set("sort", `${s.key},${s.dir}`);
    if (patch.page && patch.page > 1) q.set("page", String(patch.page));
    return `?${q}`;
  };

  return (
    <div className="space-y-4">
      <Input
        aria-label="Filter this page"
        placeholder="Filter this page…"
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
                  const key = header.column.id as Sort["key"];
                  const dir = sort?.key === key ? sort.dir : null;
                  const Icon = dir === "asc" ? ArrowUp : dir === "desc" ? ArrowDown : ChevronsUpDown;
                  return (
                    <TableHead key={header.id} aria-sort={dir ? ARIA_SORT[dir] : "none"} className={HIDDEN[key]}>
                      <Link
                        href={href({ sort: { key, dir: dir === "asc" ? "desc" : "asc" } })}
                        scroll={false}
                        prefetch={false}
                        className="inline-flex items-center gap-1 rounded-sm font-medium hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                      >
                        <table.FlexRender header={header} />
                        <Icon className="size-3.5 opacity-60" aria-hidden />
                      </Link>
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
          {data.total === 0 ? "No properties" : `Showing ${first}–${last} of ${data.total}`} · Page {page} of {lastPage}
        </span>
        <div className="flex gap-2">
          <PageLink href={href({ page: page - 1 })} disabled={page <= 1}>
            Previous
          </PageLink>
          <PageLink href={href({ page: page + 1 })} disabled={page >= lastPage}>
            Next
          </PageLink>
        </div>
      </div>
    </div>
  );
}
