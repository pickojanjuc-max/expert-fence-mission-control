-- Per-tenant markup: bulk default per calculator + per-SKU override
-- Created 2026-04-23.
--
-- Today MARKUP is hardcoded to 1.4 (40%) everywhere. This migration lets each
-- tenant pick their own markup per calculator AND override it on individual
-- SKUs. Effective resolution at read time:
--   row.markup_pct  →  user_calculator_settings.default_markup_pct  →  40 (fallback)
--
-- Markup is stored as a percent (40 = 40%) — matches what the user types.

-- ── products.markup_pct ───────────────────────────────────────────────────
-- Nullable. NULL means "use the user's default for this calculator".
alter table public.products
  add column if not exists markup_pct numeric;

-- Optional: keep accidental garbage out. 0% sell = giving stock away, but
-- some users genuinely want freight-pass-through SKUs at 0%, so allow 0.
-- Cap at 1000% to catch typos like "4000" instead of "40".
alter table public.products
  drop constraint if exists products_markup_pct_range;
alter table public.products
  add constraint products_markup_pct_range
  check (markup_pct is null or (markup_pct >= 0 and markup_pct <= 1000));

-- ── user_calculator_settings ──────────────────────────────────────────────
-- One row per (user, calculator). Currently only stores the default markup,
-- but designed to absorb future per-calculator settings (custom labels,
-- rounding rules, GST handling, etc.) without another migration.
create table if not exists public.user_calculator_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  calculator_type text not null,
  default_markup_pct numeric not null default 40
    check (default_markup_pct >= 0 and default_markup_pct <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, calculator_type)
);

create index if not exists user_calculator_settings_user_idx
  on public.user_calculator_settings(user_id);

-- ── RLS: users can only see + edit their own settings ─────────────────────
alter table public.user_calculator_settings enable row level security;

drop policy if exists user_calc_settings_select_own
  on public.user_calculator_settings;
create policy user_calc_settings_select_own
  on public.user_calculator_settings
  for select
  using (auth.uid() = user_id);

drop policy if exists user_calc_settings_insert_own
  on public.user_calculator_settings;
create policy user_calc_settings_insert_own
  on public.user_calculator_settings
  for insert
  with check (auth.uid() = user_id);

drop policy if exists user_calc_settings_update_own
  on public.user_calculator_settings;
create policy user_calc_settings_update_own
  on public.user_calculator_settings
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists user_calc_settings_delete_own
  on public.user_calculator_settings;
create policy user_calc_settings_delete_own
  on public.user_calculator_settings
  for delete
  using (auth.uid() = user_id);

-- ── updated_at trigger (reuses public.set_updated_at from earlier migration) ──
drop trigger if exists user_calculator_settings_updated_at
  on public.user_calculator_settings;
create trigger user_calculator_settings_updated_at
  before update on public.user_calculator_settings
  for each row execute function public.set_updated_at();
