"use client";

import Link from "next/link";
import { useEffect } from "react";
import { SystemStateFrame } from "@/components/klaster/system-state-frame";
import { Button } from "@/components/ui/button";

type GlobalErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalErrorPage({
  error,
  reset,
}: GlobalErrorPageProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <SystemStateFrame
          description="The root app shell failed before the current route could mount. The migration keeps this fallback branded so the product never drops to a generic framework error screen."
          eyebrow="Global error"
          meta={
            error.digest
              ? `Error digest: ${error.digest}`
              : "Root shell failure"
          }
          title="KlasterAI could not boot the current shell."
        >
          <div className="space-y-4">
            <p className="text-sm leading-6 text-muted-foreground">
              {error.message || "Unexpected root layout failure."}
            </p>
            <div className="flex flex-wrap gap-3">
              <Button onClick={reset} type="button">
                Retry app shell
              </Button>
              <Button asChild type="button" variant="secondary">
                <Link href="/">Return home</Link>
              </Button>
            </div>
          </div>
        </SystemStateFrame>
      </body>
    </html>
  );
}
