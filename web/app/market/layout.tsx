import { SubNav } from "@/components/sub-nav";

const LINKS = [
  { href: "/market", label: "Dashboard" },
  { href: "/market/properties", label: "Properties" },
  { href: "/market/what-if", label: "What-if" },
];

export default function MarketLayout({ children }: LayoutProps<"/market">) {
  return (
    <>
      <SubNav links={LINKS} label="Market" />
      {children}
    </>
  );
}
