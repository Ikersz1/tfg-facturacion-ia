-- Perfil fiscal del emisor (usuario) para PDF / Verifacti y columnas de seguimiento Verifacti en facturas.

create table if not exists public.user_fiscal_profile (
  user_id uuid primary key references auth.users (id) on delete cascade,
  legal_name text not null,
  tax_id text not null,
  address text not null,
  updated_at timestamptz not null default now()
);

comment on table public.user_fiscal_profile is 'Datos del emisor en facturas (razón social, NIF, domicilio fiscal).';

alter table public.invoices
  add column if not exists verifacti_uuid text,
  add column if not exists verifacti_qr_base64 text,
  add column if not exists verifacti_huella text,
  add column if not exists verifacti_registro_estado text,
  add column if not exists verifacti_last_error text,
  add column if not exists verifacti_updated_at timestamptz;

comment on column public.invoices.verifacti_uuid is 'UUID de registro devuelto por Verifacti al crear factura.';
comment on column public.invoices.verifacti_qr_base64 is 'Imagen QR en Base64 (Verifactu).';

alter table public.user_fiscal_profile enable row level security;

drop policy if exists tfg_user_fiscal_profile_select on public.user_fiscal_profile;
create policy tfg_user_fiscal_profile_select on public.user_fiscal_profile
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists tfg_user_fiscal_profile_insert on public.user_fiscal_profile;
create policy tfg_user_fiscal_profile_insert on public.user_fiscal_profile
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists tfg_user_fiscal_profile_update on public.user_fiscal_profile;
create policy tfg_user_fiscal_profile_update on public.user_fiscal_profile
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists tfg_user_fiscal_profile_delete on public.user_fiscal_profile;
create policy tfg_user_fiscal_profile_delete on public.user_fiscal_profile
  for delete to authenticated
  using (user_id = auth.uid());

grant select, insert, update, delete on table public.user_fiscal_profile to authenticated, service_role;
