"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { APPS, type AppId } from "@/components/apps";
import { cn } from "@/lib/utils";

/** Takes an app id rather than links: icon components can't be passed from a server layout. */
export function SubNav({ app }: { app: AppId }) {
  const pathname = usePathname();
  const { label, sections } = APPS[app];
  return (
    <nav aria-label={label} className="mb-6 flex gap-1 overflow-x-auto border-b">
      {sections.map((l) => {
        const active = pathname === l.href;
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "-mb-px flex items-center gap-2 whitespace-nowrap border-b-2 border-transparent px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground",
              active && "border-primary text-primary",
            )}
          >
            <l.icon className="size-4" aria-hidden />
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
