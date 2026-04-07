import { ArrowRight, Filter, Search, ShieldCheck, Waves } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { HealthSparkline } from "@/components/vaults/health-chart";
import {
  formatDateTimeLabel,
  formatPercent,
  formatUsdcAmount,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  getMarketplacePageData,
  type MarketplaceStateFilter,
  type PublicVaultDataState,
  type PublicVaultListing,
} from "@/server/vaults/public";

type MarketplacePageProps = {
  searchParams?: Promise<{
    q?: string;
    state?: string;
  }>;
};

const stateOptions: Array<{
  label: string;
  value: MarketplaceStateFilter;
}> = [
  { label: "All public vaults", value: "all" },
  { label: "Open for purchase", value: "live" },
  { label: "Paused", value: "paused" },
  { label: "Sold out", value: "sold_out" },
];

function getListingBadge(listing: PublicVaultListing) {
  if (listing.availability === "paused") {
    return {
      className: "border-destructive/20 bg-destructive/12 text-destructive",
      label: "Paused",
    };
  }

  if (listing.availability === "sold_out") {
    return {
      className: "border-border bg-surface-3 text-foreground",
      label: "Sold out",
    };
  }

  return {
    className: "",
    label: "Verified",
  };
}

function renderHardwareSummary(listing: PublicVaultListing) {
  return Object.entries(listing.hardwareSummary)
    .slice(0, 3)
    .map(([key, value]) => (
      <div
        key={key}
        className="rounded-md border border-border-subtle bg-background/40 px-3 py-2"
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {key}
        </p>
        <p className="mt-1 text-sm text-foreground">{String(value)}</p>
      </div>
    ));
}

function ListingRow({ listing }: { listing: PublicVaultListing }) {
  const badge = getListingBadge(listing);
  const originLabel =
    listing.assetOrigin === "klaster_managed"
      ? "Klaster-managed"
      : "Operator-listed";

  return (
    <Card
      className="overflow-hidden bg-surface/92"
      data-testid={`marketplace-listing-${listing.slug}`}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,hsl(var(--secondary)),hsl(var(--primary)),transparent)]" />
      <CardContent className="p-0">
        <div className="grid gap-5 p-5 xl:grid-cols-[minmax(0,1.45fr)_15rem_16rem] xl:items-start">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                className={cn(
                  badge.className,
                  listing.availability === "live" ? "" : "border",
                )}
                variant={
                  listing.availability === "live" ? "verified" : "secondary"
                }
              >
                {badge.label}
              </Badge>
              <Badge variant="secondary">{originLabel}</Badge>
              <Badge variant="secondary">{listing.nodeCategory}</Badge>
              <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                {listing.dataSource === "live" ? "Live mirror" : "Seeded demo"}
              </span>
            </div>
            <div className="space-y-2">
              <CardTitle className="text-2xl">{listing.nodeLabel}</CardTitle>
              <CardDescription className="max-w-2xl line-clamp-2">
                {listing.verificationSummary.notes}
              </CardDescription>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {renderHardwareSummary(listing)}
            </div>
            <div className="flex flex-wrap gap-2">
              {listing.yieldSources.map((source) => (
                <span
                  key={`${listing.id}-${source.providerSlug}`}
                  className="rounded-full border border-border-subtle px-3 py-1 text-xs text-muted-foreground"
                >
                  {source.providerSlug} {source.allocationPct}%
                </span>
              ))}
            </div>
          </div>

          <div className="grid gap-3 rounded-lg border border-border-subtle bg-surface-2/72 p-4 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Share price</span>
              <span className="font-semibold tabular-nums text-foreground">
                {formatUsdcAmount(listing.pricePerShareUsdc)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Public tranche</span>
              <span className="font-semibold tabular-nums text-foreground">
                {listing.publicShareSupply.toLocaleString()} shares
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Remaining</span>
              <span className="font-semibold tabular-nums text-foreground">
                {listing.remainingShares.toLocaleString()} shares
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Valuation</span>
              <span className="font-semibold tabular-nums text-foreground">
                {formatUsdcAmount(listing.valuationUsdc)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Raised</span>
              <span className="font-semibold tabular-nums text-foreground">
                {formatUsdcAmount(listing.campaignRaisedUsdc)}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="space-y-3 rounded-lg border border-border-subtle bg-surface-2/72 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Health signal
                  </p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
                    {listing.latestHealth
                      ? formatPercent(listing.latestHealth.healthScore)
                      : "Pending"}
                  </p>
                </div>
                <div className="rounded-full border border-border-subtle px-3 py-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  30-day view
                </div>
              </div>
              <HealthSparkline points={listing.healthSeries} />
              <p className="text-xs leading-5 text-muted-foreground">
                {listing.latestHealth
                  ? `Latest sample ${formatDateTimeLabel(listing.latestHealth.sampledAt)}.`
                  : "Health feed not indexed yet."}
              </p>
            </div>
            <div className="rounded-lg border border-border-subtle bg-surface-2/72 p-4 text-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Revenue split
              </p>
              <div className="mt-3 grid gap-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">
                    Net to investors
                  </span>
                  <span className="font-semibold tabular-nums text-foreground">
                    {formatUsdcAmount(
                      listing.feeSummary.investorNetRevenueUsdc,
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Platform fee</span>
                  <span className="font-semibold tabular-nums text-foreground">
                    {formatUsdcAmount(
                      listing.feeSummary.platformFeesCollectedUsdc,
                    )}
                  </span>
                </div>
              </div>
              <p className="mt-3 text-xs leading-5 text-muted-foreground">
                {listing.routingSummary.explanation}
              </p>
            </div>
            <Button asChild className="w-full" variant="primary">
              <Link
                data-testid={`marketplace-open-vault-${listing.slug}`}
                href={`/vaults/${listing.slug}`}
              >
                Open vault
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function getSourcePostureCopy(state: PublicVaultDataState) {
  if (state === "seeded_demo") {
    return "Seeded marketplace mirror.";
  }

  if (state === "live_error") {
    return "Live marketplace read failed.";
  }

  return "Live server-rendered mirror.";
}

function EmptyState({
  errorMessage,
  filtersActive,
  state,
}: {
  errorMessage: string | null;
  filtersActive: boolean;
  state: PublicVaultDataState;
}) {
  if (state === "live_error") {
    return (
      <Card className="bg-surface/88">
        <CardContent className="flex flex-col items-start gap-4 p-8">
          <div className="flex items-center gap-3 text-warning">
            <Waves className="size-5" />
            <p className="text-sm font-semibold text-foreground">
              Live marketplace data is temporarily unavailable.
            </p>
          </div>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            The live read path is configured, but this request could not load
            approved vaults. The page is intentionally not falling back to demo
            offerings in this state.
          </p>
          {errorMessage ? (
            <p className="text-xs leading-5 text-muted-foreground">
              Read failure: {errorMessage}
            </p>
          ) : null}
          <Button asChild variant="secondary">
            <Link href="/marketplace">Retry live read</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (state === "live_empty") {
    return (
      <Card className="bg-surface/88">
        <CardContent className="flex flex-col items-start gap-4 p-8">
          <div className="flex items-center gap-3 text-secondary">
            <Waves className="size-5" />
            <p className="text-sm font-semibold text-foreground">
              No approved vaults are currently listed.
            </p>
          </div>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            Live marketplace reads succeeded, but there are no public verified
            or paused vaults to show right now.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-surface/88">
      <CardContent className="flex flex-col items-start gap-4 p-8">
        <div className="flex items-center gap-3 text-secondary">
          <Waves className="size-5" />
          <p className="text-sm font-semibold text-foreground">
            No vaults match the current filters.
          </p>
        </div>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          {filtersActive
            ? "Clear the search or broaden the state filter to return to the full public market scan."
            : "There are no public results to display right now."}
        </p>
        <Button asChild variant="secondary">
          <Link href="/marketplace">Reset filters</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export default async function MarketplacePage({
  searchParams,
}: MarketplacePageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const data = await getMarketplacePageData({
    query: resolvedSearchParams?.q,
    state: resolvedSearchParams?.state,
  });

  return (
    <section className="space-y-6">
      <header className="relative overflow-hidden rounded-lg border border-border bg-surface/90 shadow-sm">
        <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,hsl(var(--secondary)),hsl(var(--primary)),transparent)]" />
        <div className="grid gap-6 px-6 py-7 sm:px-8 lg:grid-cols-[minmax(0,1fr)_16rem] lg:px-10">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="verified">Verified marketplace</Badge>
            </div>
            <div className="space-y-3">
              <h1 className="max-w-4xl text-balance font-display text-[var(--text-h2)] leading-[var(--leading-heading)] tracking-[var(--tracking-heading)] text-foreground">
                Compare public compute pools through one disciplined scan lane.
              </h1>
              <p className="max-w-3xl text-[length:var(--text-body-lg)] leading-[var(--leading-body)] text-muted-foreground">
                Review approval posture, health visibility, fee-aware revenue
                posture, and remaining supply before opening the detail view.
              </p>
            </div>
          </div>
          <div className="rounded-lg border border-border-subtle bg-surface-2/76 p-5 text-sm">
            <div className="flex items-center gap-3 text-secondary">
              <ShieldCheck className="size-5" />
              <p className="text-xs font-semibold uppercase tracking-[0.18em]">
                Data source
              </p>
            </div>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {getSourcePostureCopy(data.state)}
            </p>
          </div>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Public vaults",
            value: data.summary.totalListings.toString(),
          },
          {
            label: "Capital open",
            value: formatUsdcAmount(data.summary.capitalOpenUsdc),
          },
          {
            label: "Average health",
            value: data.summary.averageHealthScore
              ? formatPercent(data.summary.averageHealthScore)
              : "Pending",
          },
          {
            label: "Net revenue",
            value: formatUsdcAmount(data.summary.investorNetRevenueUsdc),
          },
        ].map((item) => (
          <Card key={item.label} className="bg-surface/88">
            <CardHeader>
              <CardDescription className="text-xs font-semibold uppercase tracking-[0.16em]">
                {item.label}
              </CardDescription>
              <CardTitle className="text-3xl tabular-nums">
                {item.value}
              </CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card className="bg-surface/90">
        <CardContent className="p-5">
          <form
            className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_15rem_auto]"
            method="get"
          >
            <label className="space-y-2">
              <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Search className="size-4 text-secondary" />
                Search vaults
              </span>
              <input
                className="terminal-input"
                defaultValue={data.filters.query}
                name="q"
                placeholder="GPU, region, runtime, category..."
                type="search"
              />
            </label>
            <label className="space-y-2">
              <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Filter className="size-4 text-secondary" />
                State
              </span>
              <select
                className="terminal-select"
                defaultValue={data.filters.state}
                name="state"
              >
                {stateOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-end">
              <Button
                className="w-full lg:w-auto"
                type="submit"
                variant="secondary"
              >
                Apply filters
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {data.listings.length ? (
        <div className="space-y-4">
          {data.listings.map((listing) => (
            <ListingRow key={listing.id} listing={listing} />
          ))}
        </div>
      ) : (
        <EmptyState
          errorMessage={data.errorMessage}
          filtersActive={Boolean(
            data.filters.query || data.filters.state !== "all",
          )}
          state={data.state}
        />
      )}
    </section>
  );
}
