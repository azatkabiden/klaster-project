import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getCurrentSession, getDemoSessionForRole } from "@/server/auth/guards";

type PortfolioLayoutProps = {
  children: ReactNode;
};

export default async function PortfolioLayout({
  children,
}: PortfolioLayoutProps) {
  const session =
    (await getCurrentSession()) ?? getDemoSessionForRole("investor");

  if (!session) {
    redirect("/");
  }

  return children;
}
