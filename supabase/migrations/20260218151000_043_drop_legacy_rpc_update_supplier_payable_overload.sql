-- Remove legacy overload to avoid PostgREST ambiguity when calling
-- rpc_update_supplier_payable after adding invoice_reference.

drop function if exists public.rpc_update_supplier_payable(
  uuid,
  uuid,
  numeric,
  date,
  text,
  text,
  public.payment_method
);
