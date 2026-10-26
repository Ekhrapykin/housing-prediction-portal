import { Calculator, ChartColumn, Columns3, FlaskConical, History, LayoutDashboard, Table2, type LucideIcon } from "lucide-react";

type Link = { href: string; label: string; icon: LucideIcon };

/** The portal's apps and their sections; the nav, sub-nav and home page all render from this. */
export const APPS = {
  estimator: {
    href: "/estimator",
    label: "Estimator",
    title: "Price Estimator",
    icon: Calculator,
    description: "Enter a house's features, get a predicted price with a per-feature breakdown, keep a history and compare properties side by side.",
    sections: [
      { href: "/estimator", label: "Estimate", icon: Calculator },
      { href: "/estimator/history", label: "History", icon: History },
      { href: "/estimator/compare", label: "Compare", icon: Columns3 },
    ],
  },
  market: {
    href: "/market",
    label: "Market",
    title: "Market Explorer",
    icon: ChartColumn,
    description: "Filter the housing market, see segment averages and price vs size, browse every property, and run what-if scenarios.",
    sections: [
      { href: "/market", label: "Dashboard", icon: LayoutDashboard },
      { href: "/market/properties", label: "Properties", icon: Table2 },
      { href: "/market/what-if", label: "What-if", icon: FlaskConical },
    ],
  },
} satisfies Record<string, Link & { title: string; description: string; sections: Link[] }>;

export type AppId = keyof typeof APPS;
