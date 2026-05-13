-- Datos por usuario autenticado (auth.uid): columna user_id + RLS.
-- Requisito: tablas public.clients, products, invoices, … ya existen (si no, ejecuta antes 20250101000000_initial_schema.sql).
-- Requisito: existe al menos un usuario en auth.users (registro previo).
-- Las filas sin user_id se asignan al usuario más antiguo (útil en desarrollo / un solo dueño).

alter table public.clients add column if not exists user_id uuid references auth.users (id) on delete cascade;
alter table public.products add column if not exists user_id uuid references auth.users (id) on delete cascade;
alter table public.invoices add column if not exists user_id uuid references auth.users (id) on delete cascade;

do $$
declare
  owner uuid;
begin
  select id into owner from auth.users order by created_at asc limit 1;
  if owner is null then
    raise exception 'No hay usuarios en auth.users: crea un usuario antes de aplicar esta migración.';
  end if;

  update public.clients set user_id = owner where user_id is null;
  update public.products set user_id = owner where user_id is null;

  update public.invoices i
  set user_id = c.user_id
  from public.clients c
  where i.client_id = c.id and i.user_id is null and c.user_id is not null;

  update public.invoices set user_id = owner where user_id is null;
end;
$$;

alter table public.clients alter column user_id set not null;
alter table public.products alter column user_id set not null;
alter table public.invoices alter column user_id set not null;

-- En INSERT: prioriza auth.uid(); si en el servidor llega null, conserva user_id enviado por la app (misma sesión).
create or replace function public.tfg_set_owner_user_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.user_id := coalesce(auth.uid(), new.user_id);
  end if;
  return new;
end;
$$;

drop trigger if exists tfg_clients_set_owner on public.clients;
create trigger tfg_clients_set_owner
  before insert on public.clients
  for each row execute function public.tfg_set_owner_user_id();

drop trigger if exists tfg_products_set_owner on public.products;
create trigger tfg_products_set_owner
  before insert on public.products
  for each row execute function public.tfg_set_owner_user_id();

drop trigger if exists tfg_invoices_set_owner on public.invoices;
create trigger tfg_invoices_set_owner
  before insert on public.invoices
  for each row execute function public.tfg_set_owner_user_id();

-- RLS
alter table public.clients enable row level security;
alter table public.products enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_lines enable row level security;
alter table public.payments enable row level security;
alter table public.invoice_events enable row level security;

drop policy if exists tfg_clients_isolation on public.clients;
create policy tfg_clients_isolation on public.clients
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists tfg_products_isolation on public.products;
create policy tfg_products_isolation on public.products
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists tfg_invoices_select on public.invoices;
drop policy if exists tfg_invoices_insert on public.invoices;
drop policy if exists tfg_invoices_update on public.invoices;
drop policy if exists tfg_invoices_delete on public.invoices;
drop policy if exists tfg_invoices_isolation on public.invoices;

create policy tfg_invoices_select on public.invoices
  for select to authenticated
  using (user_id = auth.uid());

create policy tfg_invoices_insert on public.invoices
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.clients c
      where c.id = invoices.client_id and c.user_id = auth.uid()
    )
  );

create policy tfg_invoices_update on public.invoices
  for update to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.clients c
      where c.id = invoices.client_id and c.user_id = auth.uid()
    )
  );

create policy tfg_invoices_delete on public.invoices
  for delete to authenticated
  using (user_id = auth.uid());

drop policy if exists tfg_invoice_lines_isolation on public.invoice_lines;
create policy tfg_invoice_lines_isolation on public.invoice_lines
  for all to authenticated
  using (
    exists (
      select 1 from public.invoices i
      where i.id = invoice_lines.invoice_id and i.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.invoices i
      where i.id = invoice_lines.invoice_id and i.user_id = auth.uid()
    )
  );

drop policy if exists tfg_payments_isolation on public.payments;
create policy tfg_payments_isolation on public.payments
  for all to authenticated
  using (
    exists (
      select 1 from public.invoices i
      where i.id = payments.invoice_id and i.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.invoices i
      where i.id = payments.invoice_id and i.user_id = auth.uid()
    )
  );

drop policy if exists tfg_invoice_events_isolation on public.invoice_events;
create policy tfg_invoice_events_isolation on public.invoice_events
  for all to authenticated
  using (
    exists (
      select 1 from public.invoices i
      where i.id = invoice_events.invoice_id and i.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.invoices i
      where i.id = invoice_events.invoice_id and i.user_id = auth.uid()
    )
  );

-- Si al emitir factura usas RPC alloc_next_invoice_number y falla por permisos, en el SQL Editor:
--   grant execute on function public.alloc_next_invoice_number to authenticated;
-- y asegúrate de que la función sea security definer o valide al usuario.
