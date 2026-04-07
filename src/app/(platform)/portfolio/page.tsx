import { PortfolioPageView } from "@/components/workspace/portfolio-page";
import { getCurrentSession, getDemoSessionForRole } from "@/server/auth/guards";
import { getPortfolioPageData } from "@/server/vaults/authenticated";

export default async function PortfolioPage() {
  const session =
    (await getCurrentSession()) ?? getDemoSessionForRole("investor");
  const data = await getPortfolioPageData(session);

  return <PortfolioPageView data={data} />;
}
