import { formatDateLabel, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PublicVaultHealthPoint } from "@/server/vaults/public";

type HealthSparklineProps = {
  className?: string;
  points: PublicVaultHealthPoint[];
};

type HealthDetailChartProps = {
  points: PublicVaultHealthPoint[];
};

function getPolylinePoints(
  points: PublicVaultHealthPoint[],
  width: number,
  height: number,
) {
  if (!points.length) {
    return "";
  }

  const values = points.map((point) => point.healthScore);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 1);

  return points
    .map((point, index) => {
      const x = (index / Math.max(points.length - 1, 1)) * width;
      const y = height - ((point.healthScore - min) / range) * height;

      return `${x},${y}`;
    })
    .join(" ");
}

export function HealthSparkline({ className, points }: HealthSparklineProps) {
  if (!points.length) {
    return (
      <div
        className={cn(
          "flex h-16 items-center justify-center rounded-md border border-dashed border-border-subtle bg-surface-2 text-xs text-muted-foreground",
          className,
        )}
      >
        Health feed pending
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-md border border-border-subtle bg-surface-2/80 p-2",
        className,
      )}
    >
      <svg
        aria-hidden="true"
        className="h-14 w-full"
        preserveAspectRatio="none"
        viewBox="0 0 100 36"
      >
        <path
          d="M 0 35.5 H 100"
          fill="none"
          stroke="hsl(var(--chart-grid))"
          strokeDasharray="2 4"
          strokeWidth="1"
        />
        <polyline
          fill="none"
          points={getPolylinePoints(points, 100, 32)}
          stroke="hsl(var(--secondary))"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.25"
        />
      </svg>
    </div>
  );
}

export function HealthDetailChart({ points }: HealthDetailChartProps) {
  const recentPoints = points.slice(-6);

  if (!points.length) {
    return (
      <div className="rounded-md border border-dashed border-border-subtle bg-surface-2/70 p-6 text-sm text-muted-foreground">
        No indexed health samples are available yet for this vault.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border-subtle bg-surface-2/70 p-4">
        <svg
          aria-hidden="true"
          className="h-48 w-full"
          preserveAspectRatio="none"
          viewBox="0 0 100 60"
        >
          {[15, 30, 45].map((y) => (
            <path
              key={y}
              d={`M 0 ${y} H 100`}
              fill="none"
              stroke="hsl(var(--chart-grid))"
              strokeDasharray="3 5"
              strokeWidth="1"
            />
          ))}
          <polyline
            fill="none"
            points={getPolylinePoints(points, 100, 56)}
            stroke="hsl(var(--secondary))"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.75"
          />
        </svg>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {recentPoints.map((point) => (
          <div
            key={point.sampledAt}
            className="rounded-md border border-border-subtle bg-surface-2/70 p-3"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {formatDateLabel(point.sampledAt)}
            </p>
            <p className="mt-2 text-lg font-semibold tabular-nums text-foreground">
              {formatPercent(point.healthScore)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Uptime {formatPercent(point.uptimePct)} • Utilization{" "}
              {formatPercent(point.utilizationPct)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
