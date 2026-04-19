-- Estado "partial": factura emitida con cobros pero importe pendiente.
-- Ejecuta en Supabase → SQL Editor si no usas migraciones por CLI.
-- Si ya tienes un CHECK distinto, ajusta el nombre del constraint o edítalo en Table Editor.

alter table public.invoices
  drop constraint if exists invoices_status_check;

alter table public.invoices
  add constraint invoices_status_check
  check (
    status in (
      'draft',
      'issued',
      'paid',
      'cancelled',
      'overdue',
      'partial'
    )
  );
