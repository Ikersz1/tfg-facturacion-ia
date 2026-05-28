-- Preferencia por usuario: enviar email automático al emitir (webhook n8n).

alter table public.user_fiscal_profile
  add column if not exists n8n_auto_email_on_issue boolean not null default false;

comment on column public.user_fiscal_profile.n8n_auto_email_on_issue is
  'Si true, al emitir factura se llama al webhook n8n (email al cliente).';
