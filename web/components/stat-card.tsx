import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function StatCard({ label, value, icon: Icon }: { label: string; value: string; icon: LucideIcon }) {
  return (
    <Card size="sm">
      <CardContent>
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Icon className="size-4 text-primary" aria-hidden />
          {label}
        </p>
        <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}
