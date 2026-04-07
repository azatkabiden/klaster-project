import type { Metadata } from "next";
import { HomePage } from "@/components/marketing/home-page";

export const metadata: Metadata = {
  description:
    "KlasterAI is a devnet-first marketplace for verified compute vaults with explicit proof-of-asset, constrained issuance, and readable revenue rules.",
};

export default function MarketingHomeRoute() {
  return <HomePage />;
}
