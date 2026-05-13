-- Catálogo: producto físico / digital vs servicio (misma tabla `products`).
alter table public.products
  add column if not exists kind text not null default 'product';

alter table public.products
  drop constraint if exists products_kind_check;

alter table public.products
  add constraint products_kind_check check (kind in ('product', 'service'));

update public.products set kind = 'product' where kind is null or kind not in ('product', 'service');
