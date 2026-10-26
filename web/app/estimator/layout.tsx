import { SubNav } from "@/components/sub-nav";

export default function EstimatorLayout({ children }: LayoutProps<"/estimator">) {
  return (
    <>
      <SubNav app="estimator" />
      {children}
    </>
  );
}
