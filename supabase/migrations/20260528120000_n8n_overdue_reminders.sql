-- Flujo 2: recordatorios de facturas vencidas vía n8n.

-- Toggle 1: avisar al emisor (a mí) la primera vez que una factura aparece vencida
alter table public.user_fiscal_profile
  add column if not exists n8n_notify_issuer_on_overdue boolean not null default false;

-- Toggle 2: enviar recordatorio automático al cliente moroso (configurable)
alter table public.user_fiscal_profile
  add column if not exists n8n_auto_reminder_client boolean not null default false;

-- Días desde el vencimiento hasta enviar el primer/siguiente recordatorio al cliente (mínimo 1)
alter table public.user_fiscal_profile
  add column if not exists n8n_reminder_grace_days integer not null default 3;

comment on column public.user_fiscal_profile.n8n_notify_issuer_on_overdue is
  'Si true, la primera vez que una factura aparece vencida se incluye una alerta para el emisor en el endpoint de recordatorios n8n.';
comment on column public.user_fiscal_profile.n8n_auto_reminder_client is
  'Si true, tras n8n_reminder_grace_days días de vencimiento se incluye al moroso en el endpoint de recordatorios n8n.';
comment on column public.user_fiscal_profile.n8n_reminder_grace_days is
  'Días desde el vencimiento hasta enviar el primer recordatorio al cliente moroso (mínimo 1, máximo 30).';

-- Tabla de trazabilidad: qué recordatorios se han enviado y cuándo.
-- El endpoint marca los recordatorios aquí ANTES de responder a n8n (patrón optimista).
create table if not exists public.n8n_overdue_reminders (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references auth.users(id) on delete cascade,
  invoice_id    uuid        not null references public.invoices(id) on delete cascade,
  reminder_type text        not null check (reminder_type in ('issuer_alert', 'client_reminder')),
  sent_at       timestamptz not null default now()
);

alter table public.n8n_overdue_reminders enable row level security;

-- El emisor puede leer su propio historial
create policy "tenant_select_own" on public.n8n_overdue_reminders
  for select using (user_id = auth.uid());

create index if not exists idx_n8n_overdue_reminders_inv_type
  on public.n8n_overdue_reminders (invoice_id, reminder_type, sent_at desc);
