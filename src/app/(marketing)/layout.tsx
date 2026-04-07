import type { ReactNode } from "react";
import { MarketingChrome } from "@/components/shells/marketing-chrome";
import { getCurrentSession } from "@/server/auth/guards";
import { getWalletAuthMode } from "@/server/auth/runtime";

type MarketingLayoutProps = {
  children: ReactNode;
};

export default async function MarketingLayout({
  children,
}: MarketingLayoutProps) {
  const [session, authMode] = await Promise.all([
    getCurrentSession(),
    Promise.resolve(getWalletAuthMode()),
  ]);

  return (
    <MarketingChrome authMode={authMode} session={session}>
      {children}
    </MarketingChrome>
  );
}
