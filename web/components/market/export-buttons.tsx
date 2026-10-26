import { buttonVariants } from "@/components/ui/button";
import { exportUrl } from "@/lib/clients/market";
import type { MarketFilters } from "@/lib/data/search-params";

/** Plain links: the browser handles the download (Content-Disposition: attachment). */
export function ExportButtons({ filters }: { filters: MarketFilters }) {
  return (
    <div className="flex gap-2">
      <a href={exportUrl("csv", filters)} download className={buttonVariants({ variant: "outline" })}>
        Export CSV
      </a>
      <a href={exportUrl("pdf", filters)} download className={buttonVariants({ variant: "outline" })}>
        Export PDF
      </a>
    </div>
  );
}
