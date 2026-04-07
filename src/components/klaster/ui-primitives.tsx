import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type StatusBadgeVariant = "verified" | "pending" | "secondary" | "destructive";

export function statusVariant(status: string): StatusBadgeVariant {
  const normalized = status.trim().toLowerCase();

  if (normalized === "verified" || normalized === "approved") {
    return "verified";
  }

  if (
    normalized === "needs info" ||
    normalized === "needs_info" ||
    normalized === "pending review" ||
    normalized === "pending_review"
  ) {
    return "pending";
  }

  if (normalized === "paused" || normalized === "rejected") {
    return "destructive";
  }

  return "secondary";
}

export function MetricTile({
  accent = false,
  label,
  sub,
  value,
}: {
  accent?: boolean;
  label: string;
  sub?: string;
  value: string;
}) {
  return (
    <div className="rounded border border-border bg-card p-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 font-mono text-xl font-bold text-foreground",
          accent && "text-teal",
        )}
      >
        {value}
      </p>
      {sub ? (
        <p className="mt-1 font-mono text-[10px] text-muted-foreground">
          {sub}
        </p>
      ) : null}
    </div>
  );
}

export function PageHeader({
  action,
  description,
  eyebrow,
  source,
  title,
}: {
  action?: ReactNode;
  description?: string;
  eyebrow: string;
  source?: string;
  title: string;
}) {
  return (
    <div className="rounded border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <Badge className="mb-2" variant="verified">
            {eyebrow}
          </Badge>
          <h1 className="max-w-4xl text-balance text-xl font-bold leading-snug text-foreground">
            {title}
          </h1>
          {description ? (
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          ) : null}
          {source ? (
            <div className="mt-3 flex items-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Data source
              </span>
              <span className="font-mono text-[10px] text-teal">{source}</span>
            </div>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </div>
  );
}

export function DetailHeader({
  badges,
  description,
  sourceText,
  title,
}: {
  badges?: ReactNode;
  description?: string;
  sourceText?: string;
  title: string;
}) {
  return (
    <div className="rounded border border-border bg-card p-5">
      {badges ? (
        <div className="mb-2 flex flex-wrap items-center gap-1.5">{badges}</div>
      ) : null}
      <h1 className="font-mono text-xl font-bold text-foreground">{title}</h1>
      {description ? (
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      ) : null}
      {sourceText ? (
        <div className="mt-3 flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Data source
          </span>
          <span className="font-mono text-[10px] text-teal">{sourceText}</span>
        </div>
      ) : null}
    </div>
  );
}

export function DataRow({
  label,
  mono = false,
  value,
}: {
  label: string;
  mono?: boolean;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/50 py-1.5 last:border-0">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span
        className={cn(
          "max-w-[60%] truncate text-right text-[11px] text-foreground",
          mono && "font-mono text-teal",
        )}
      >
        {value}
      </span>
    </div>
  );
}

export function HashDisplay({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </span>
      <span className="truncate font-mono text-[11px] text-teal">{value}</span>
    </div>
  );
}

export function EmptyState({
  action,
  description,
  title,
}: {
  action?: ReactNode;
  description?: string;
  title: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded border border-dashed border-border bg-surface-2 px-6 py-12 text-center">
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        {title}
      </p>
      {description ? (
        <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function ErrorCard({
  action,
  description,
  detail,
  title,
}: {
  action?: ReactNode;
  description?: string;
  detail?: string;
  title: string;
}) {
  return (
    <div className="rounded border border-destructive/30 bg-amber-dim p-5">
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-amber">
        {title}
      </p>
      {description ? (
        <p className="mt-1 text-sm leading-relaxed text-foreground/80">
          {description}
        </p>
      ) : null}
      {detail ? (
        <p className="mt-2 font-mono text-[10px] text-muted-foreground">
          Read failure: {detail}
        </p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
