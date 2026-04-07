import { AdminReviewQueuePageView } from "@/components/workspace/admin-review-page";
import { getCurrentSession, getDemoSessionForRole } from "@/server/auth/guards";
import { getAdminReviewQueuePageData } from "@/server/vaults/authenticated";

export default async function AdminVerificationsPage() {
  const session = (await getCurrentSession()) ?? getDemoSessionForRole("admin");
  const data = await getAdminReviewQueuePageData(session);

  return <AdminReviewQueuePageView data={data} />;
}
