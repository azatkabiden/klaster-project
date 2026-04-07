import type { ReactNode } from "react";
import { PlatformChrome } from "@/components/shells/platform-chrome";
import { getCurrentSession } from "@/server/auth/guards";
import { getWalletAuthMode } from "@/server/auth/runtime";

type PlatformLayoutProps = {
  children: ReactNode;
};

export default async function PlatformLayout({
  children,
}: PlatformLayoutProps) {
  const [session, authMode] = await Promise.all([
    getCurrentSession(),
    Promise.resolve(getWalletAuthMode()),
  ]);

  return (
    <PlatformChrome authMode={authMode} session={session}>
      {children}
    </PlatformChrome>
  );
}
