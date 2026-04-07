"use client";

import Link from "next/link";
import { useEffect } from "react";
import { SystemStateFrame } from "@/components/klaster/system-state-frame";
import { Button } from "@/components/ui/button";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <SystemStateFrame
      description="The route failed while preserving the existing domain logic boundary. Review the route again or fall back to a stable product surface."
      eyebrow="500 / route error"
      meta={
        error.digest
          ? `Error digest: ${error.digest}`
          : "Runtime failure captured by the app shell."
      }
      title="This screen failed to render completely."
    >
      <div className="space-y-4">
        <p className="text-sm leading-6 text-muted-foreground">
          {error.message || "Unexpected route failure."}
        </p>
        <div className="flex flex-wrap gap-3">
          <Button onClick={reset} type="button">
            Retry route
          </Button>
          <Button asChild type="button" variant="secondary">
            <Link href="/marketplace">Open marketplace</Link>
          </Button>
        </div>
      </div>
    </SystemStateFrame>
  );
}
