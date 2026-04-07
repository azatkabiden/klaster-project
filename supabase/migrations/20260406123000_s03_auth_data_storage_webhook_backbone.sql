create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  wallet_address text not null unique,
  role text not null check (role in ('investor', 'operator', 'admin')),
  display_name text,
  region_code text,
  created_at timestamptz not null default now()
);

create index if not exists profiles_wallet_address_idx
  on public.profiles (wallet_address);

create table if not exists public.vaults (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  operator_profile_id uuid not null references public.profiles (id) on delete cascade,
  onchain_vault_address text unique,
  token_mint_address text unique,
  status text not null check (
    status in ('draft', 'pending_review', 'needs_info', 'verified', 'rejected', 'paused')
  ),
  node_label text not null,
  node_category text not null,
  hardware_summary jsonb not null,
  valuation_usdc numeric(20, 6) not null,
  total_shares bigint not null check (total_shares > 0),
  public_share_supply bigint not null check (public_share_supply > 0),
  share_price_usdc numeric(20, 6) not null check (share_price_usdc > 0),
  public_metadata_uri text,
  public_metadata_hash text,
  proof_bundle_hash text not null default '',
  verification_summary jsonb,
  verified_at timestamptz,
  paused_at timestamptz,
  created_at timestamptz not null default now(),
  constraint vaults_public_share_supply_lte_total
    check (public_share_supply <= total_shares),
  constraint vaults_proof_bundle_hash_required_after_draft
    check (
      status = 'draft'
      or char_length(trim(proof_bundle_hash)) > 0
    )
);

create index if not exists vaults_status_idx
  on public.vaults (status);

create index if not exists vaults_operator_profile_id_idx
  on public.vaults (operator_profile_id);

create index if not exists vaults_created_at_desc_idx
  on public.vaults (created_at desc);

create table if not exists public.vault_documents (
  id uuid primary key default gen_random_uuid(),
  vault_id uuid not null references public.vaults (id) on delete cascade,
  document_type text not null,
  storage_path text not null unique,
  sha256 text not null,
  visibility text not null default 'private' check (visibility = 'private'),
  created_at timestamptz not null default now()
);

create index if not exists vault_documents_vault_id_idx
  on public.vault_documents (vault_id);

create table if not exists public.verification_reviews (
  id uuid primary key default gen_random_uuid(),
  vault_id uuid not null references public.vaults (id) on delete cascade,
  reviewer_profile_id uuid not null references public.profiles (id) on delete restrict,
  decision text not null check (decision in ('pending', 'needs_info', 'approved', 'rejected')),
  notes text not null,
  created_at timestamptz not null default now()
);

create index if not exists verification_reviews_vault_id_idx
  on public.verification_reviews (vault_id);

create index if not exists verification_reviews_created_at_desc_idx
  on public.verification_reviews (created_at desc);

create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  vault_id uuid not null references public.vaults (id) on delete cascade,
  buyer_profile_id uuid not null references public.profiles (id) on delete restrict,
  signature text not null unique,
  shares bigint not null check (shares > 0),
  usdc_amount numeric(20, 6) not null check (usdc_amount > 0),
  created_at timestamptz not null default now()
);

create index if not exists purchases_vault_id_idx
  on public.purchases (vault_id);

create index if not exists purchases_buyer_profile_id_idx
  on public.purchases (buyer_profile_id);

create table if not exists public.revenue_deposits (
  id uuid primary key default gen_random_uuid(),
  vault_id uuid not null references public.vaults (id) on delete cascade,
  signature text not null unique,
  amount_usdc numeric(20, 6) not null check (amount_usdc > 0),
  revenue_index_after numeric(30, 12) not null,
  created_at timestamptz not null default now()
);

create index if not exists revenue_deposits_vault_id_idx
  on public.revenue_deposits (vault_id);

create index if not exists revenue_deposits_created_at_desc_idx
  on public.revenue_deposits (created_at desc);

create table if not exists public.claims (
  id uuid primary key default gen_random_uuid(),
  vault_id uuid not null references public.vaults (id) on delete cascade,
  claimant_profile_id uuid not null references public.profiles (id) on delete restrict,
  signature text not null unique,
  amount_usdc numeric(20, 6) not null check (amount_usdc > 0),
  revenue_index_claimed numeric(30, 12) not null,
  created_at timestamptz not null default now()
);

create index if not exists claims_vault_id_idx
  on public.claims (vault_id);

create index if not exists claims_claimant_profile_id_idx
  on public.claims (claimant_profile_id);

create table if not exists public.health_snapshots (
  id uuid primary key default gen_random_uuid(),
  vault_id uuid not null references public.vaults (id) on delete cascade,
  sampled_at timestamptz not null,
  uptime_pct numeric(5, 2) not null check (uptime_pct >= 0 and uptime_pct <= 100),
  utilization_pct numeric(5, 2) not null check (utilization_pct >= 0 and utilization_pct <= 100),
  health_score numeric(5, 2) not null check (health_score >= 0 and health_score <= 100),
  source text not null check (source in ('mock', 'node_logs'))
);

create index if not exists health_snapshots_vault_sampled_at_desc_idx
  on public.health_snapshots (vault_id, sampled_at desc);

create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text not null,
  event_type text not null,
  payload jsonb not null,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint webhook_events_provider_event_unique
    unique (provider, provider_event_id)
);

create index if not exists webhook_events_processed_at_idx
  on public.webhook_events (processed_at);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'vault-proof-documents',
  'vault-proof-documents',
  false,
  26214400,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
)
on conflict (id) do nothing;
