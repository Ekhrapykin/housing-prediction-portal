"use client";

import { House } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { APPS } from "@/components/apps";
import { cn } from "@/lib/utils";

export function Nav() {
  const pathname = usePathname();
  return (
    <header className="border-b-2 border-chart-2 bg-ink text-ink-foreground">
      <nav aria-label="Main" className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-2.5 sm:gap-8">
        <Link href="/" className="flex items-center gap-2.5 whitespace-nowrap rounded-md font-semibold tracking-tight outline-none focus-visible:ring-2 focus-visible:ring-white/70">
          <span className="grid size-8 place-items-center rounded-md bg-white/10" aria-hidden>
            <House className="size-4.5" />
          </span>
          <span className="sr-only sm:not-sr-only">Housing Prediction Portal</span>
        </Link>
        <ul className="flex gap-1">
          {Object.values(APPS).map((a) => {
            const active = pathname === a.href || pathname.startsWith(a.href + "/");
            return (
              <li key={a.href}>
                <Link
                  href={a.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-white/75 outline-none transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white/70",
                    active && "bg-white/15 text-white",
                  )}
                >
                  <a.icon className="size-4" aria-hidden />
                  {a.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
