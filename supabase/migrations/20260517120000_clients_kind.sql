-- Tipo de cliente: empresa o particular (misma tabla `clients`).

alter table public.clients
  add column if not exists kind text not null default 'company';

alter table public.clients
  drop constraint if exists clients_kind_check;

alter table public.clients
  add constraint clients_kind_check check (kind in ('company', 'individual'));

update public.clients
set kind = 'company'
where kind is null or kind not in ('company', 'individual');

comment on column public.clients.kind is 'company = empresa (CIF, razón social); individual = particular (DNI/NIE, nombre).';
