import { SubNav } from "@/components/sub-nav";

const LINKS = [
  { href: "/estimator", label: "Estimate" },
  { href: "/estimator/history", label: "History" },
  { href: "/estimator/compare", label: "Compare" },
];

export default function EstimatorLayout({ children }: LayoutProps<"/estimator">) {
  return (
    <>
      <SubNav links={LINKS} label="Estimator" />
      {children}
    </>
  );
}
