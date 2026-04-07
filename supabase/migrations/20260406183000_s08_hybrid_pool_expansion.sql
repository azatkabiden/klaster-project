alter table public.vaults
  add column if not exists asset_origin text not null default 'operator_listed'
    check (asset_origin in ('operator_listed', 'klaster_managed')),
  add column if not exists campaign_target_usdc numeric(20, 6) not null default 0,
  add column if not exists campaign_raised_usdc numeric(20, 6) not null default 0,
  add column if not exists platform_fee_bps integer not null default 0
    check (platform_fee_bps >= 0 and platform_fee_bps < 10000),
  add column if not exists yield_source_summary jsonb,
  add column if not exists routing_summary jsonb;

alter table public.vaults
  drop constraint if exists vaults_campaign_raised_lte_target,
  add constraint vaults_campaign_raised_lte_target
    check (
      campaign_target_usdc = 0
      or campaign_raised_usdc <= campaign_target_usdc
    );

create index if not exists vaults_asset_origin_idx
  on public.vaults (asset_origin);

alter table public.revenue_deposits
  rename column amount_usdc to gross_amount_usdc;

alter table public.revenue_deposits
  add column if not exists platform_fee_amount_usdc numeric(20, 6) not null default 0,
  add column if not exists net_amount_usdc numeric(20, 6) not null default 0;

update public.revenue_deposits
set net_amount_usdc = gross_amount_usdc
where net_amount_usdc = 0;

alter table public.health_snapshots
  add column if not exists cluster_status text not null default 'idle'
    check (cluster_status in ('idle', 'routing', 'renting', 'training', 'degraded'));

create table if not exists public.vault_yield_sources (
  id uuid primary key default gen_random_uuid(),
  vault_id uuid not null references public.vaults (id) on delete cascade,
  provider_slug text not null,
  label text not null,
  allocation_pct numeric(5, 2) not null check (allocation_pct >= 0 and allocation_pct <= 100),
  status text not null check (status in ('active', 'standby', 'inactive')),
  created_at timestamptz not null default now()
);

create index if not exists vault_yield_sources_vault_id_idx
  on public.vault_yield_sources (vault_id);

create table if not exists public.vault_task_stream_events (
  id uuid primary key default gen_random_uuid(),
  vault_id uuid not null references public.vaults (id) on delete cascade,
  logged_at timestamptz not null,
  status text not null check (status in ('idle', 'routing', 'renting', 'training', 'degraded')),
  message text not null,
  reward_delta_usdc numeric(20, 6),
  source text not null check (source in ('seeded_demo', 'provider_ingest'))
);

create index if not exists vault_task_stream_events_vault_logged_at_desc_idx
  on public.vault_task_stream_events (vault_id, logged_at desc);
