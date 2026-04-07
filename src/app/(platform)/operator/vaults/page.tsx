import { OperatorWorkspacePageView } from "@/components/workspace/operator-page";
import { getCurrentSession, getDemoSessionForRole } from "@/server/auth/guards";
import { getOperatorWorkspacePageData } from "@/server/vaults/authenticated";

export default async function OperatorVaultsPage() {
  const session =
    (await getCurrentSession()) ?? getDemoSessionForRole("operator");
  const data = await getOperatorWorkspacePageData(session);

  return <OperatorWorkspacePageView data={data} />;
}
