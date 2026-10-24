import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";

const APPS = [
  {
    href: "/estimator",
    title: "Price Estimator",
    description: "Enter a house's features, get a predicted price with a per-feature breakdown, keep a history and compare properties side by side.",
  },
  {
    href: "/market",
    title: "Market Explorer",
    description: "Filter the housing market, see segment averages and price vs size, browse every property, and run what-if scenarios.",
  },
];

export default function Home() {
  return (
    <>
      <PageHeader title="Housing Prediction Portal" description="Pick an app to get started." />
      <div className="grid gap-4 sm:grid-cols-2">
        {APPS.map((a) => (
          <Link key={a.href} href={a.href} className="group rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
            <Card className="h-full transition-shadow group-hover:shadow-md">
              <CardHeader>
                <CardTitle className="text-lg">{a.title}</CardTitle>
                <CardDescription>{a.description}</CardDescription>
              </CardHeader>
              <CardContent className="text-sm font-medium text-primary">Open →</CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
