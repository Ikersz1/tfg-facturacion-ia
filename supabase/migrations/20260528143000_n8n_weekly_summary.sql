-- Flujo 3: resumen semanal al emisor vía n8n.

alter table public.user_fiscal_profile
  add column if not exists n8n_weekly_summary_enabled boolean not null default false;

comment on column public.user_fiscal_profile.n8n_weekly_summary_enabled is
  'Si true, n8n puede obtener el resumen semanal del emisor (endpoint weekly-summary).';

create table if not exists public.n8n_weekly_summaries_sent (
  id        uuid        primary key default gen_random_uuid(),
  user_id   uuid        not null references auth.users(id) on delete cascade,
  week_key  text        not null,
  sent_at   timestamptz not null default now(),
  unique (user_id, week_key)
);

alter table public.n8n_weekly_summaries_sent enable row level security;

create policy "tenant_select_own" on public.n8n_weekly_summaries_sent
  for select using (user_id = auth.uid());

create index if not exists idx_n8n_weekly_summaries_user_week
  on public.n8n_weekly_summaries_sent (user_id, week_key);
