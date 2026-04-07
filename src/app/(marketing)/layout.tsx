import type { ReactNode } from "react";
import { MarketingChrome } from "@/components/shells/marketing-chrome";

type MarketingLayoutProps = {
  children: ReactNode;
};

export default async function MarketingLayout({
  children,
}: MarketingLayoutProps) {
  return <MarketingChrome>{children}</MarketingChrome>;
}
