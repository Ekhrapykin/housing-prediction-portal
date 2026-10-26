import Link from "next/link";
import { APPS } from "@/components/apps";
import { PageHeader } from "@/components/page-header";

export default function Home() {
  return (
    <>
      <PageHeader title="Housing Prediction Portal" description="Price estimates from the regression model and analysis of the housing market, in one place." />
      <div className="grid gap-4 sm:grid-cols-2">
        {Object.values(APPS).map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="group flex flex-col gap-4 rounded-xl border-l-4 border-primary bg-card p-5 ring-1 ring-foreground/10 outline-none transition-colors hover:bg-accent/40 focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-lg bg-accent text-primary" aria-hidden>
                <a.icon className="size-5" />
              </span>
              <h2 className="text-lg font-semibold tracking-tight group-hover:text-primary">{a.title}</h2>
            </div>
            <p className="text-sm text-muted-foreground">{a.description}</p>
            <ul className="mt-auto flex flex-wrap gap-x-4 gap-y-1 text-sm text-foreground/80">
              {a.sections.map((s) => (
                <li key={s.href} className="flex items-center gap-1.5">
                  <s.icon className="size-3.5 text-primary" aria-hidden />
                  {s.label}
                </li>
              ))}
            </ul>
          </Link>
        ))}
      </div>
    </>
  );
}
