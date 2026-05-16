-- Plantilla visual del PDF de factura (por usuario emisor).

alter table public.user_fiscal_profile
  add column if not exists invoice_pdf_template text not null default 'classic';

alter table public.user_fiscal_profile
  drop constraint if exists user_fiscal_profile_invoice_pdf_template_check;

alter table public.user_fiscal_profile
  add constraint user_fiscal_profile_invoice_pdf_template_check
  check (invoice_pdf_template in ('classic', 'compact'));

comment on column public.user_fiscal_profile.invoice_pdf_template is
  'Diseño del PDF: classic (tabla estándar) o compact (márgenes reducidos, cabecera densa).';
