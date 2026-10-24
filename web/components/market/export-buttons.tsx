import { buttonVariants } from "@/components/ui/button";

/** Plain links: the browser handles the download (Content-Disposition: attachment). */
export function ExportButtons({ query }: { query: string }) {
  const q = query ? `?${query}` : "";
  return (
    <div className="flex gap-2">
      <a href={`/api/market/export.csv${q}`} download className={buttonVariants({ variant: "outline" })}>
        Export CSV
      </a>
      <a href={`/api/market/export.pdf${q}`} download className={buttonVariants({ variant: "outline" })}>
        Export PDF
      </a>
    </div>
  );
}
