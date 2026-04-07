import { OperatorVaultDetailPageView } from "@/components/workspace/operator-page";
import { getCurrentSession, getDemoSessionForRole } from "@/server/auth/guards";
import { getOperatorVaultDetailPageData } from "@/server/vaults/authenticated";

type OperatorVaultDetailPageProps = {
  params: Promise<{
    vaultId: string;
  }>;
};

export default async function OperatorVaultDetailPage({
  params,
}: OperatorVaultDetailPageProps) {
  const { vaultId } = await params;
  const session =
    (await getCurrentSession()) ?? getDemoSessionForRole("operator");
  const data = await getOperatorVaultDetailPageData(session, vaultId);

  return <OperatorVaultDetailPageView data={data} />;
}
