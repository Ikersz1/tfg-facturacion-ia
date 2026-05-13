-- =============================================================================
-- VACIAR datos de facturación (irreversible). Ejecutar en Supabase → SQL Editor.
-- Borra: eventos, cobros, líneas, facturas, clientes, productos y contadores de nº.
-- NO borra usuarios de Authentication (auth.users).
-- =============================================================================

delete from public.invoice_events;
delete from public.payments;
delete from public.invoice_lines;
delete from public.invoices;
delete from public.products;
delete from public.clients;

truncate table public.invoice_number_counters;
