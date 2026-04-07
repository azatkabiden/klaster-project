import { AdminReviewDetailPageView } from "@/components/workspace/admin-review-page";
import { getCurrentSession, getDemoSessionForRole } from "@/server/auth/guards";
import { getAdminReviewDetailPageData } from "@/server/vaults/authenticated";

type AdminVerificationDetailPageProps = {
  params: Promise<{
    vaultId: string;
  }>;
};

export default async function AdminVerificationDetailPage({
  params,
}: AdminVerificationDetailPageProps) {
  const { vaultId } = await params;
  const session = (await getCurrentSession()) ?? getDemoSessionForRole("admin");
  const data = await getAdminReviewDetailPageData(vaultId, session);

  return <AdminReviewDetailPageView data={data} />;
}
