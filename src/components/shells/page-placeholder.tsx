import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

type PlaceholderPanel = {
  title: string;
  description: string;
  icon: LucideIcon;
};

type PagePlaceholderProps = {
  eyebrow: string;
  title: string;
  description: string;
  routeLabel: string;
  statusLabel: string;
  panels: readonly PlaceholderPanel[];
  asideTitle: string;
  asideBody: string;
  actions?: ReactNode;
};

export function PagePlaceholder({
  eyebrow,
  title,
  description,
  routeLabel,
  statusLabel,
  panels,
  asideTitle,
  asideBody,
  actions,
}: PagePlaceholderProps) {
  return (
    <section className="space-y-6">
      <Card className="overflow-hidden bg-surface/90">
        <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,hsl(var(--secondary)),hsl(var(--primary)),transparent)]" />
        <CardHeader className="gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="pending">{eyebrow}</Badge>
              <span className="rounded-full border border-border-subtle px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                {routeLabel}
              </span>
            </div>
            <div className="space-y-3">
              <CardTitle className="max-w-3xl text-balance font-display text-[var(--text-h2)] leading-[var(--leading-heading)] tracking-[var(--tracking-heading)]">
                {title}
              </CardTitle>
              <CardDescription className="max-w-2xl text-[length:var(--text-body-lg)] leading-[var(--leading-body)] text-muted-foreground">
                {description}
              </CardDescription>
            </div>
          </div>
          <div className="flex w-full max-w-sm flex-col gap-3 rounded-lg border border-border bg-surface-2/80 p-5 shadow-sm">
            <Badge variant="verified">{statusLabel}</Badge>
            <p className="text-sm leading-6 text-muted-foreground">
              Structural route ownership, token wiring, and shell composition
              are complete for this surface.
            </p>
            {actions ? (
              <div className="flex flex-wrap gap-3">{actions}</div>
            ) : null}
          </div>
        </CardHeader>
      </Card>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {panels.map(
            ({
              title: panelTitle,
              description: panelDescription,
              icon: Icon,
            }) => (
              <Card key={panelTitle}>
                <CardHeader className="gap-4">
                  <div className="flex size-12 items-center justify-center rounded-md border border-border bg-surface-2 text-secondary shadow-sm">
                    <Icon className="size-5" />
                  </div>
                  <div className="space-y-2">
                    <CardTitle className="text-lg">{panelTitle}</CardTitle>
                    <CardDescription className="text-sm leading-6 text-muted-foreground">
                      {panelDescription}
                    </CardDescription>
                  </div>
                </CardHeader>
              </Card>
            ),
          )}
        </div>
        <Card className="bg-surface-2/90">
          <CardHeader className="space-y-4">
            <Badge variant="secondary">{asideTitle}</Badge>
            <div className="space-y-3">
              <CardTitle className="text-xl">{asideTitle}</CardTitle>
              <CardDescription className="text-sm leading-6 text-muted-foreground">
                {asideBody}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <Separator />
            <div className="flex items-start gap-3">
              <ArrowRight className="mt-0.5 size-4 shrink-0 text-secondary" />
              <p>
                Shared cards, badges, buttons, separators, tabs, and typography
                tokens are already available for the follow-on slices.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <ArrowRight className="mt-0.5 size-4 shrink-0 text-secondary" />
              <p>
                Solana client integration remains isolated behind provider and
                config boundaries so S02 can add the official packages without
                route churn.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
