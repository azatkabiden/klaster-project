import Link from "next/link";
import { SystemStateFrame } from "@/components/klaster/system-state-frame";
import { Button } from "@/components/ui/button";

export default function Forbidden() {
  return (
    <SystemStateFrame
      description="This route is reserved for a different role. The app keeps investor, operator, and admin workspaces separate even when the same wallet can access multiple flows."
      eyebrow="403 / forbidden"
      meta="Role-aware access remains enforced by the existing auth and guard boundaries."
      title="This workspace is not available for the current session."
    >
      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/portfolio">Open portfolio</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/marketplace">Open marketplace</Link>
        </Button>
      </div>
    </SystemStateFrame>
  );
}
