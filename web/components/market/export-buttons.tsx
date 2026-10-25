import { buttonVariants } from "@/components/ui/button";
import { exportUrl } from "@/lib/data/endpoints";

/** Plain links: the browser handles the download (Content-Disposition: attachment). */
export function ExportButtons({ filters }: { filters: Parameters<typeof exportUrl>[1] }) {
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
