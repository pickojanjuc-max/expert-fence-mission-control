-- Embed architecture: per-tenant embed token + SKU mapping
-- Created 2026-04-19. Lets third-party stores (starting with expertfence.com.au itself)
-- embed the calculator and have BOM SKUs resolved to their own product IDs.

-- ── embed_tokens ──────────────────────────────────────────────────────────
-- One row per subscribing business. The `token` is the public identifier
-- pasted into the embed snippet (data-key="..."). Looked up on every embed load.
create table if not exists public.embed_tokens (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  name text not null,
  platform text not null check (platform in ('woocommerce','shopify')),
  store_url text,
  calc_types text[] not null default '{}',     -- which calculators they've purchased: 'aluminium','glass','wire',...
  status text not null default 'active' check (status in ('active','suspended','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists embed_tokens_token_idx on public.embed_tokens(token);
create index if not exists embed_tokens_status_idx on public.embed_tokens(status);

-- ── sku_mappings ──────────────────────────────────────────────────────────
-- Maps calculator BOM SKUs → store product IDs for each tenant.
-- (token_id, calc_sku) is unique — one mapping per SKU per tenant.
create table if not exists public.sku_mappings (
  id uuid primary key default gen_random_uuid(),
  token_id uuid not null references public.embed_tokens(id) on delete cascade,
  calc_sku text not null,
  store_product_id text not null,
  store_sku text,
  product_name text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (token_id, calc_sku)
);

create index if not exists sku_mappings_token_id_idx on public.sku_mappings(token_id);
create index if not exists sku_mappings_lookup_idx on public.sku_mappings(token_id, calc_sku);

-- ── RLS ───────────────────────────────────────────────────────────────────
-- Both tables are admin-managed for now. Service role bypasses RLS automatically;
-- anon/authenticated users have no direct access. The /embed/[token] Next.js
-- route will read these via the server-side admin client.
alter table public.embed_tokens enable row level security;
alter table public.sku_mappings enable row level security;

-- ── updated_at trigger ────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists embed_tokens_updated_at on public.embed_tokens;
create trigger embed_tokens_updated_at
  before update on public.embed_tokens
  for each row execute function public.set_updated_at();

drop trigger if exists sku_mappings_updated_at on public.sku_mappings;
create trigger sku_mappings_updated_at
  before update on public.sku_mappings
  for each row execute function public.set_updated_at();
