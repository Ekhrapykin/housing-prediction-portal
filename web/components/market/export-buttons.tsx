import { buttonVariants } from "@/components/ui/button";
import { market } from "@/lib/clients/browser";

/** Plain links: the browser handles the download (Content-Disposition: attachment). */
export function ExportButtons({ filters }: { filters: Parameters<typeof market.exportUrl>[1] }) {
  return (
    <div className="flex gap-2">
      <a href={market.exportUrl("csv", filters)} download className={buttonVariants({ variant: "outline" })}>
        Export CSV
      </a>
      <a href={market.exportUrl("pdf", filters)} download className={buttonVariants({ variant: "outline" })}>
        Export PDF
      </a>
    </div>
  );
}
