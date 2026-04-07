import {
  BarChart3,
  FileCheck2,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { HealthDetailChart } from "@/components/vaults/health-chart";
import { PurchasePanel } from "@/components/vaults/purchase-panel";
import {
  formatDateTimeLabel,
  formatPercent,
  formatUsdcAmount,
  truncateAddress,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  getPublicVaultDetailPageData,
  type PublicVaultDataState,
} from "@/server/vaults/public";

type VaultDetailPageProps = {
  params: Promise<{
    vaultId: string;
  }>;
};

function getStateBadge(status: "paused" | "verified", remainingShares: number) {
  if (status === "paused") {
    return {
      label: "Paused",
      variant: "destructive" as const,
    };
  }

  if (remainingShares <= 0) {
    return {
      label: "Sold out",
      variant: "secondary" as const,
    };
  }

  return {
    label: "Verified",
    variant: "verified" as const,
  };
}

function getSourcePostureCopy(state: PublicVaultDataState) {
  if (state === "seeded_demo") {
    return "Seeded vault mirror.";
  }

  return "Live server-rendered mirror.";
}

export default async function VaultDetailPage({
  params,
}: VaultDetailPageProps) {
  const { vaultId } = await params;
  const data = await getPublicVaultDetailPageData(vaultId);

  if (data.state === "live_error") {
    return (
      <section className="space-y-6">
        <Card className="bg-surface/92">
          <CardHeader>
            <div className="flex items-center gap-3 text-warning">
              <TriangleAlert className="size-5" />
              <CardTitle>Vault detail is temporarily unavailable</CardTitle>
            </div>
            <CardDescription>
              The live vault read path is configured, but this request could not
              resolve the current vault state.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.errorMessage ? (
              <p className="text-sm leading-6 text-muted-foreground">
                Read failure: {data.errorMessage}
              </p>
            ) : null}
            <Button asChild variant="secondary">
              <Link href="/marketplace">Return to marketplace</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    );
  }

  const vault = data.vault;

  if (!vault) {
    notFound();
  }

  const stateBadge = getStateBadge(vault.status, vault.remainingShares);
  const originLabel =
    vault.assetOrigin === "klaster_managed"
      ? "Klaster-managed"
      : "Operator-listed";

  return (
    <section className="space-y-6">
      <header className="relative overflow-hidden rounded-lg border border-border bg-surface/90 shadow-sm">
        <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,hsl(var(--secondary)),hsl(var(--primary)),transparent)]" />
        <div className="grid gap-6 px-6 py-7 sm:px-8 lg:grid-cols-[minmax(0,1fr)_16rem] lg:px-10">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={stateBadge.variant}>{stateBadge.label}</Badge>
              <Badge variant="secondary">{originLabel}</Badge>
              <Badge variant="secondary">{vault.nodeCategory}</Badge>
            </div>
            <div className="space-y-3">
              <h1 className="max-w-4xl text-balance font-display text-[var(--text-h2)] leading-[var(--leading-heading)] tracking-[var(--tracking-heading)] text-foreground">
                {vault.nodeLabel}
              </h1>
              <p className="max-w-3xl text-[length:var(--text-body-lg)] leading-[var(--leading-body)] text-muted-foreground">
                {vault.description}
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

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: "Share price",
                value: formatUsdcAmount(vault.pricePerShareUsdc),
              },
              {
                label: "Public tranche",
                value: `${vault.publicShareSupply.toLocaleString()} shares`,
              },
              {
                label: "Remaining",
                value: `${vault.remainingShares.toLocaleString()} shares`,
              },
              {
                label: "Net revenue",
                value: formatUsdcAmount(
                  vault.feeSummary.investorNetRevenueUsdc,
                ),
              },
            ].map((metric) => (
              <Card key={metric.label} className="bg-surface/88">
                <CardHeader>
                  <CardDescription className="text-xs font-semibold uppercase tracking-[0.16em]">
                    {metric.label}
                  </CardDescription>
                  <CardTitle className="text-2xl tabular-nums">
                    {metric.value}
                  </CardTitle>
                </CardHeader>
              </Card>
            ))}
          </div>

          <Card className="bg-surface/92">
            <CardHeader>
              <div className="flex items-center gap-3 text-secondary">
                <FileCheck2 className="size-5" />
                <CardTitle>Verification summary</CardTitle>
              </div>
              <CardDescription>
                Verification appears before the purchase rail.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
              <div className="space-y-4">
                <p className="text-sm leading-7 text-foreground">
                  {vault.verificationSummary.notes}
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-md border border-border-subtle bg-surface-2/70 p-4 text-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Proof bundle hash
                    </p>
                    <p className="mt-2 font-mono text-sm text-foreground">
                      {truncateAddress(vault.proofBundleHash, 8)}
                    </p>
                  </div>
                  <div className="rounded-md border border-border-subtle bg-surface-2/70 p-4 text-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Metadata hash
                    </p>
                    <p className="mt-2 font-mono text-sm text-foreground">
                      {vault.metadataHash
                        ? truncateAddress(vault.metadataHash, 8)
                        : "Pending"}
                    </p>
                  </div>
                </div>
              </div>
              <div className="rounded-lg border border-border-subtle bg-surface-2/70 p-5 text-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Review trail
                </p>
                <dl className="mt-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">Reviewed</dt>
                    <dd className="font-semibold text-foreground">
                      {vault.verificationSummary.reviewedAt
                        ? formatDateTimeLabel(
                            vault.verificationSummary.reviewedAt,
                          )
                        : "Pending"}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">Reviewed by</dt>
                    <dd className="font-mono text-xs text-foreground">
                      {vault.verificationSummary.reviewedBy
                        ? truncateAddress(
                            vault.verificationSummary.reviewedBy,
                            6,
                          )
                        : "Internal reviewer"}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">Vault address</dt>
                    <dd className="font-mono text-xs text-foreground">
                      {vault.onchainVaultAddress
                        ? truncateAddress(vault.onchainVaultAddress, 6)
                        : "Pending live runtime"}
                    </dd>
                  </div>
                </dl>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-surface/92">
            <CardHeader>
              <div className="flex items-center gap-3 text-secondary">
                <BarChart3 className="size-5" />
                <CardTitle>30-day health posture</CardTitle>
              </div>
              <CardDescription>
                Health stays paired with plain-language interpretation because
                it is off-chain v1 data.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
                <HealthDetailChart points={vault.healthSeries} />
                <div className="space-y-3 rounded-lg border border-border-subtle bg-surface-2/70 p-5 text-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Health summary
                  </p>
                  <p className="leading-6 text-foreground">
                    {vault.healthSummary}
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">
                        Average health
                      </span>
                      <span className="font-semibold tabular-nums text-foreground">
                        {vault.averageHealthScore
                          ? formatPercent(vault.averageHealthScore)
                          : "Pending"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">
                        Average uptime
                      </span>
                      <span className="font-semibold tabular-nums text-foreground">
                        {vault.averageUptimePct
                          ? formatPercent(vault.averageUptimePct)
                          : "Pending"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Low sample</span>
                      <span className="font-semibold tabular-nums text-foreground">
                        {vault.lowHealthScore
                          ? formatPercent(vault.lowHealthScore)
                          : "Pending"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-surface/92">
            <CardHeader>
              <CardTitle>Economics and supply</CardTitle>
              <CardDescription>
                Public tranche capacity, sold shares, and revenue posture stay
                separate from the health narrative.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-lg border border-border-subtle bg-surface-2/70 p-5 text-sm">
                <dl className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">Total shares</dt>
                    <dd className="font-semibold tabular-nums text-foreground">
                      {vault.totalShares.toLocaleString()}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">Public tranche</dt>
                    <dd className="font-semibold tabular-nums text-foreground">
                      {vault.publicShareSupply.toLocaleString()}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">Shares sold</dt>
                    <dd className="font-semibold tabular-nums text-foreground">
                      {vault.sharesSold.toLocaleString()}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">Valuation</dt>
                    <dd className="font-semibold tabular-nums text-foreground">
                      {formatUsdcAmount(vault.valuationUsdc)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">Campaign raised</dt>
                    <dd className="font-semibold tabular-nums text-foreground">
                      {formatUsdcAmount(vault.campaignRaisedUsdc)}
                    </dd>
                  </div>
                </dl>
              </div>
              <div className="rounded-lg border border-border-subtle bg-surface-2/70 p-5 text-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Revenue and disclosure
                </p>
                <p className="mt-3 leading-6 text-foreground">
                  {vault.priceFloorDisclosure}
                </p>
                <dl className="mt-4 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">Gross revenue</dt>
                    <dd className="font-semibold tabular-nums text-foreground">
                      {formatUsdcAmount(vault.feeSummary.grossRevenueUsdc)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">Platform fee</dt>
                    <dd className="font-semibold tabular-nums text-foreground">
                      {formatUsdcAmount(
                        vault.feeSummary.platformFeesCollectedUsdc,
                      )}
                    </dd>
                  </div>
                </dl>
                <p className="mt-4 text-muted-foreground">
                  Latest deposit{" "}
                  {vault.latestDepositAt
                    ? formatDateTimeLabel(vault.latestDepositAt)
                    : "has not been indexed yet"}
                  .
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-surface/92">
            <CardHeader>
              <CardTitle>Ownership and routing</CardTitle>
              <CardDescription>
                Ownership visibility and routing posture stay readable before
                the purchase rail.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
              <div className="space-y-4">
                <div className="grid grid-cols-5 gap-2">
                  {Array.from({ length: vault.ownershipGrid.totalCells }).map(
                    (_, index) => (
                      <div
                        key={`ownership-cell-${index + 1}`}
                        className={cn(
                          "aspect-square rounded-sm border border-border-subtle",
                          index < vault.ownershipGrid.activeCells
                            ? "bg-[linear-gradient(135deg,hsl(var(--secondary)/0.65),hsl(var(--primary)/0.72))]"
                            : "bg-surface-2/70",
                        )}
                      />
                    ),
                  )}
                </div>
                <p className="text-sm leading-6 text-muted-foreground">
                  {vault.ownershipGrid.activeCells} of{" "}
                  {vault.ownershipGrid.totalCells} cells are lit to show current
                  participation in this pool.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {vault.yieldSources.map((source) => (
                    <div
                      key={`${source.providerSlug}-${source.label}`}
                      className="rounded-md border border-border-subtle bg-surface-2/70 p-4 text-sm"
                    >
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        {source.providerSlug}
                      </p>
                      <p className="mt-2 font-semibold text-foreground">
                        {source.label}
                      </p>
                      <p className="mt-2 text-muted-foreground">
                        {source.allocationPct}% allocation · {source.status}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-lg border border-border-subtle bg-surface-2/70 p-5 text-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Smart auto-routing
                </p>
                <p className="mt-3 leading-6 text-foreground">
                  {vault.routingSummary.explanation}
                </p>
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Mode</span>
                    <span className="font-semibold text-foreground">
                      {vault.routingSummary.mode === "smart_auto_routing"
                        ? "Smart auto-routing"
                        : "Manual lane"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">
                      Active provider
                    </span>
                    <span className="font-semibold text-foreground">
                      {vault.routingSummary.activeProvider ?? "Seeded demo"}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-surface/92">
            <CardHeader>
              <CardTitle>Live task stream</CardTitle>
              <CardDescription>
                Seeded telemetry shows the routing story without claiming live
                provider ingestion.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {vault.taskStream.map((event) => (
                <div
                  key={event.id}
                  className="rounded-md border border-border-subtle bg-background/55 px-4 py-3 font-mono text-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 text-foreground">
                    <span>{formatDateTimeLabel(event.loggedAt)}</span>
                    <span className="uppercase tracking-[0.16em] text-secondary">
                      {event.status}
                    </span>
                  </div>
                  <p className="mt-2 leading-6 text-muted-foreground">
                    {event.message}
                  </p>
                  {event.rewardDeltaUsdc !== null ? (
                    <p className="mt-2 text-secondary">
                      Reward mirrored: +
                      {formatUsdcAmount(event.rewardDeltaUsdc)}
                    </p>
                  ) : null}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-surface/92">
            <CardHeader>
              <div className="flex items-center gap-3 text-warning">
                <TriangleAlert className="size-5" />
                <CardTitle>Risk framing</CardTitle>
              </div>
              <CardDescription>
                Constrained v1 rules remain visible on the public detail page
                rather than hidden behind a transaction flow.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-6 text-muted-foreground">
              <p>
                Health score is disclosed as off-chain v1 data. It helps users
                inspect current operating posture, but it is not an onchain
                oracle.
              </p>
              <p>
                Primary sale proceeds remain separate from claimable revenue.
                Revenue claims depend on later operator deposits, not on initial
                share purchases.
              </p>
              <p>
                Vault shares remain non-transferable in this release, and public
                availability changes such as paused or sold-out states must stay
                visible.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 xl:sticky xl:top-6 xl:self-start">
          <PurchasePanel
            availability={vault.availability}
            nodeLabel={vault.nodeLabel}
            pricePerShareUsdc={vault.pricePerShareUsdc}
            purchaseConfig={vault.purchaseConfig}
          />
        </div>
      </div>
    </section>
  );
}
