import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getCurrentSession, getDemoSessionForRole } from "@/server/auth/guards";

type AdminLayoutProps = {
  children: ReactNode;
};

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const session = (await getCurrentSession()) ?? getDemoSessionForRole("admin");

  if (!session) {
    redirect("/");
  }

  if (session.role !== "admin") {
    redirect("/portfolio");
  }

  return children;
}
