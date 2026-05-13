-- Esquema base (proyecto vacío en Supabase).
-- Ejecuta ESTE archivo antes que los demás en `supabase/migrations/` si no existen las tablas.
-- Orden recomendado: 1) este SQL  2) 20260402120000_invoice_status_partial.sql (opcional si el CHECK ya coincide)
--    3) 20260513140000_tenant_user_id_rls.sql

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  tax_id text,
  email text,
  phone text,
  address text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  sku text,
  unit_price numeric(14, 4) not null default 0,
  tax_rate numeric(7, 4) not null default 21,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete restrict,
  series text not null default 'A',
  year integer not null,
  number integer,
  status text not null default 'draft',
  issue_date date,
  due_date date,
  subtotal numeric(14, 4) not null default 0,
  tax_amount numeric(14, 4) not null default 0,
  total numeric(14, 4) not null default 0,
  created_at timestamptz not null default now(),
  constraint invoices_status_check check (
    status in ('draft', 'issued', 'paid', 'cancelled', 'overdue', 'partial')
  )
);

create index if not exists invoices_client_id_idx on public.invoices (client_id);
create index if not exists invoices_created_at_idx on public.invoices (created_at desc);

create table if not exists public.invoice_lines (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  line_number integer not null,
  product_id uuid references public.products (id) on delete set null,
  description text not null,
  quantity numeric(14, 4) not null,
  unit_price numeric(14, 4) not null,
  tax_rate numeric(7, 4) not null,
  line_net numeric(14, 4) not null,
  line_tax numeric(14, 4) not null,
  line_total numeric(14, 4) not null
);

create index if not exists invoice_lines_invoice_id_idx on public.invoice_lines (invoice_id);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  amount numeric(14, 4) not null,
  paid_at timestamptz not null default now(),
  method text,
  notes text
);

create index if not exists payments_invoice_id_idx on public.payments (invoice_id);

create table if not exists public.invoice_events (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists invoice_events_invoice_id_idx on public.invoice_events (invoice_id);

-- Numeración correlativa por serie + año (usa la app al emitir).
create table if not exists public.invoice_number_counters (
  series text not null,
  year integer not null,
  last_number bigint not null,
  primary key (series, year)
);

alter table public.invoice_number_counters enable row level security;

-- Si ya existía otra versión (p. ej. otro tipo de retorno), hay que borrarla antes.
drop function if exists public.alloc_next_invoice_number(text, integer);

create or replace function public.alloc_next_invoice_number(p_series text, p_year integer)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next bigint;
begin
  insert into public.invoice_number_counters (series, year, last_number)
  values (p_series, p_year, 1)
  on conflict (series, year)
  do update set last_number = public.invoice_number_counters.last_number + 1
  returning last_number into v_next;

  return v_next;
end;
$$;

grant execute on function public.alloc_next_invoice_number(text, integer) to authenticated;
grant execute on function public.alloc_next_invoice_number(text, integer) to service_role;

-- Permisos API (PostgREST) para sesión autenticada; la tabla de contadores solo vía RPC.
grant select, insert, update, delete on table public.clients to authenticated, service_role;
grant select, insert, update, delete on table public.products to authenticated, service_role;
grant select, insert, update, delete on table public.invoices to authenticated, service_role;
grant select, insert, update, delete on table public.invoice_lines to authenticated, service_role;
grant select, insert, update, delete on table public.payments to authenticated, service_role;
grant select, insert, update, delete on table public.invoice_events to authenticated, service_role;
