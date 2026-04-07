import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getCurrentSession, getDemoSessionForRole } from "@/server/auth/guards";

type OperatorLayoutProps = {
  children: ReactNode;
};

export default async function OperatorLayout({
  children,
}: OperatorLayoutProps) {
  const session =
    (await getCurrentSession()) ?? getDemoSessionForRole("operator");

  if (!session) {
    redirect("/");
  }

  if (session.role !== "operator") {
    redirect("/portfolio");
  }

  return children;
}
