-- RPC to set safety stock per branch/product

create or replace function public.rpc_set_safety_stock(
  p_org_id uuid,
  p_branch_id uuid,
  p_product_id uuid,
  p_safety_stock numeric
)
returns void
language plpgsql
as $$
begin
  insert into public.stock_items (
    org_id,
    branch_id,
    product_id,
    quantity_on_hand,
    safety_stock
  ) values (
    p_org_id,
    p_branch_id,
    p_product_id,
    0,
    p_safety_stock
  )
  on conflict (org_id, branch_id, product_id) do update set
    safety_stock = excluded.safety_stock;

  perform public.rpc_log_audit_event(
    p_org_id,
    'stock_safety_set',
    'stock_item',
    null,
    p_branch_id,
    jsonb_build_object(
      'product_id', p_product_id,
      'safety_stock', p_safety_stock
    ),
    null
  );
end;
$$;
