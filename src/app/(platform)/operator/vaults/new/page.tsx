import { OperatorDraftPageView } from "@/components/workspace/operator-page";
import { getCurrentSession, getDemoSessionForRole } from "@/server/auth/guards";
import { getOperatorDraftPageData } from "@/server/vaults/authenticated";

export default async function NewOperatorVaultPage() {
  const session =
    (await getCurrentSession()) ?? getDemoSessionForRole("operator");
  const data = await getOperatorDraftPageData(session);

  return <OperatorDraftPageView data={data} />;
}
