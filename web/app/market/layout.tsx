import { SubNav } from "@/components/sub-nav";

export default function MarketLayout({ children }: LayoutProps<"/market">) {
  return (
    <>
      <SubNav app="market" />
      {children}
    </>
  );
}
