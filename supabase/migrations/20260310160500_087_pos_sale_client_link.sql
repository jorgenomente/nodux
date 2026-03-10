alter table public.sales
add column if not exists client_id uuid references public.clients(id) on delete set null;

create index if not exists sales_org_id_client_id_created_at_idx
  on public.sales (org_id, client_id, created_at desc)
  where client_id is not null;

drop function if exists public.rpc_create_sale(
  uuid,
  uuid,
  public.payment_method,
  jsonb,
  uuid,
  boolean,
  boolean,
  numeric,
  jsonb,
  uuid,
  boolean,
  numeric,
  uuid
);

create or replace function public.rpc_create_sale(
  p_org_id uuid,
  p_branch_id uuid,
  p_payment_method public.payment_method,
  p_items jsonb,
  p_special_order_id uuid default null,
  p_close_special_order boolean default false,
  p_apply_cash_discount boolean default false,
  p_cash_discount_pct numeric default null,
  p_payments jsonb default null,
  p_payment_device_id uuid default null,
  p_apply_employee_discount boolean default false,
  p_employee_discount_pct numeric default null,
  p_employee_account_id uuid default null,
  p_client_id uuid default null
)
returns table (sale_id uuid, total numeric, created_at timestamptz)
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_sale_id uuid := gen_random_uuid();
  v_total numeric(12,2) := 0;
  v_subtotal numeric(12,2) := 0;
  v_discount_amount numeric(12,2) := 0;
  v_discount_pct numeric(5,2) := 0;
  v_created_at timestamptz := now();
  v_allow_negative boolean := true;
  v_cash_discount_enabled boolean := true;
  v_cash_discount_default_pct numeric(5,2) := 10;
  v_employee_discount_enabled boolean := true;
  v_employee_discount_default_pct numeric(5,2) := 10;
  v_employee_discount_combinable boolean := false;
  v_pos_enabled boolean := false;
  v_cash_discount_applied boolean := false;
  v_employee_discount_applied boolean := false;
  v_cash_discount_amount numeric(12,2) := 0;
  v_cash_discount_pct numeric(5,2) := 0;
  v_employee_discount_amount numeric(12,2) := 0;
  v_employee_discount_pct numeric(5,2) := 0;
  v_employee_name_snapshot text := null;
  v_item jsonb;
  v_product_id uuid;
  v_qty numeric(14,3);
  v_price numeric(12,2);
  v_name text;
  v_line_total numeric(12,2);
  v_current numeric(14,3);
  v_remaining numeric(14,3);
  v_batch record;
  v_items_count int := 0;
  v_remaining_items bigint;
  v_item_rows record;
  v_to_apply numeric(14,3);
  v_order_status public.special_order_status;
  v_payment jsonb;
  v_payment_method public.payment_method;
  v_payment_amount numeric(12,2);
  v_payments_sum numeric(12,2) := 0;
  v_payments_count int := 0;
  v_has_cash_payment boolean := false;
  v_single_payment_method public.payment_method := null;
  v_summary_payment_method public.payment_method := null;
  v_payment_rows jsonb := '[]'::jsonb;
  v_payment_device_id uuid;
  v_single_payment_device_id uuid := null;
  v_effective_payment_method public.payment_method;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if not public.is_org_admin_or_superadmin(p_org_id) then
    if not exists (
      select 1
      from public.org_users ou
      where ou.org_id = p_org_id
        and ou.user_id = auth.uid()
        and ou.is_active = true
        and ou.role = 'staff'
    ) then
      raise exception 'not authorized';
    end if;

    if not exists (
      select 1
      from public.branch_memberships bm
      where bm.org_id = p_org_id
        and bm.user_id = auth.uid()
        and bm.branch_id = p_branch_id
        and bm.is_active = true
    ) then
      raise exception 'branch not allowed';
    end if;

    select coalesce(
      (select sma.is_enabled
       from public.staff_module_access sma
       where sma.org_id = p_org_id
         and sma.branch_id = p_branch_id
         and sma.role = 'staff'
         and sma.module_key = 'pos'
       limit 1),
      (select sma.is_enabled
       from public.staff_module_access sma
       where sma.org_id = p_org_id
         and sma.branch_id is null
         and sma.role = 'staff'
         and sma.module_key = 'pos'
       limit 1),
      false
    ) into v_pos_enabled;

    if not v_pos_enabled then
      raise exception 'pos module disabled';
    end if;
  end if;

  if p_client_id is not null and not exists (
    select 1
    from public.clients c
    where c.id = p_client_id
      and c.org_id = p_org_id
      and c.is_active = true
  ) then
    raise exception 'invalid client';
  end if;

  v_effective_payment_method := p_payment_method;

  if v_effective_payment_method::text = 'mixed' and (p_payments is null or jsonb_typeof(p_payments) <> 'array' or jsonb_array_length(p_payments) = 0) then
    raise exception 'mixed payment requires payments detail';
  end if;

  if p_cash_discount_pct is not null and not coalesce(p_apply_cash_discount, false) then
    raise exception 'cash discount pct requires apply_cash_discount';
  end if;

  if p_employee_discount_pct is not null and not coalesce(p_apply_employee_discount, false) then
    raise exception 'employee discount pct requires apply_employee_discount';
  end if;

  if p_employee_account_id is not null and not coalesce(p_apply_employee_discount, false) then
    raise exception 'employee account requires apply_employee_discount';
  end if;

  if p_payments is null then
    if v_effective_payment_method::text in ('card', 'mercadopago') and p_payment_device_id is null then
      raise exception 'payment_device_id required for card and mercadopago';
    end if;

    if p_payment_device_id is not null and v_effective_payment_method::text not in ('card', 'mercadopago') then
      raise exception 'payment_device_id only allowed for card and mercadopago';
    end if;

    if p_payment_device_id is not null and not exists (
      select 1
      from public.pos_payment_devices ppd
      where ppd.id = p_payment_device_id
        and ppd.org_id = p_org_id
        and ppd.branch_id = p_branch_id
        and ppd.is_active = true
    ) then
      raise exception 'invalid payment device';
    end if;

    v_single_payment_device_id := p_payment_device_id;
  end if;

  select
    allow_negative_stock,
    cash_discount_enabled,
    cash_discount_default_pct,
    employee_discount_enabled,
    employee_discount_default_pct,
    employee_discount_combinable_with_cash_discount
  into
    v_allow_negative,
    v_cash_discount_enabled,
    v_cash_discount_default_pct,
    v_employee_discount_enabled,
    v_employee_discount_default_pct,
    v_employee_discount_combinable
  from public.org_preferences
  where org_id = p_org_id;

  if v_allow_negative is null then
    v_allow_negative := true;
  end if;

  if v_cash_discount_enabled is null then
    v_cash_discount_enabled := true;
  end if;

  if v_cash_discount_default_pct is null then
    v_cash_discount_default_pct := 10;
  end if;

  if v_employee_discount_enabled is null then
    v_employee_discount_enabled := true;
  end if;

  if v_employee_discount_default_pct is null then
    v_employee_discount_default_pct := 10;
  end if;

  if v_employee_discount_combinable is null then
    v_employee_discount_combinable := false;
  end if;

  if coalesce(p_apply_cash_discount, false) then
    if not v_cash_discount_enabled then
      raise exception 'cash discount disabled';
    end if;

    if v_effective_payment_method::text = 'mixed' then
      if not exists (
        select 1
        from jsonb_array_elements(p_payments) elem
        where elem ->> 'payment_method' = 'cash'
      ) then
        raise exception 'cash discount requires cash payment';
      end if;
    elsif v_effective_payment_method::text <> 'cash' then
      raise exception 'cash discount requires cash payment';
    end if;

    v_cash_discount_pct := coalesce(p_cash_discount_pct, v_cash_discount_default_pct);
    if v_cash_discount_pct < 0 or v_cash_discount_pct > 100 then
      raise exception 'cash discount pct out of range';
    end if;
  end if;

  if coalesce(p_apply_employee_discount, false) then
    if not v_employee_discount_enabled then
      raise exception 'employee discount disabled';
    end if;

    if p_employee_account_id is null then
      raise exception 'employee account required';
    end if;

    if not exists (
      select 1
      from public.employee_accounts ea
      where ea.id = p_employee_account_id
        and ea.org_id = p_org_id
        and ea.branch_id = p_branch_id
        and ea.is_active = true
    ) then
      raise exception 'invalid employee account';
    end if;

    if coalesce(p_apply_cash_discount, false) and not v_employee_discount_combinable then
      raise exception 'employee discount cannot be combined with cash discount';
    end if;

    select ea.name
      into v_employee_name_snapshot
    from public.employee_accounts ea
    where ea.id = p_employee_account_id;

    v_employee_discount_pct := coalesce(
      p_employee_discount_pct,
      v_employee_discount_default_pct
    );
    if v_employee_discount_pct < 0 or v_employee_discount_pct > 100 then
      raise exception 'employee discount pct out of range';
    end if;
  end if;

  insert into public.sales (
    id,
    org_id,
    branch_id,
    client_id,
    created_by,
    payment_method,
    subtotal_amount,
    discount_amount,
    discount_pct,
    total_amount,
    employee_account_id,
    employee_name_snapshot,
    cash_discount_amount,
    cash_discount_pct,
    employee_discount_applied,
    employee_discount_amount,
    employee_discount_pct,
    created_at
  )
  values (
    v_sale_id,
    p_org_id,
    p_branch_id,
    p_client_id,
    auth.uid(),
    case when v_effective_payment_method::text = 'mixed' then 'other'::public.payment_method else v_effective_payment_method end,
    0,
    0,
    0,
    0,
    p_employee_account_id,
    v_employee_name_snapshot,
    0,
    0,
    coalesce(p_apply_employee_discount, false),
    0,
    0,
    v_created_at
  );

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_items_count := v_items_count + 1;
    v_product_id := (v_item ->> 'product_id')::uuid;
    v_qty := (v_item ->> 'quantity')::numeric;

    select p.unit_price, p.name
      into v_price, v_name
    from public.products p
    where p.id = v_product_id
      and p.org_id = p_org_id;

    if v_price is null then
      raise exception 'product not found %', v_product_id;
    end if;

    select quantity_on_hand
      into v_current
    from public.stock_items
    where org_id = p_org_id
      and branch_id = p_branch_id
      and product_id = v_product_id
    for update;

    if v_current is null then
      v_current := 0;
    end if;

    if not v_allow_negative and v_current < v_qty then
      raise exception 'insufficient stock for product %', v_product_id;
    end if;

    v_line_total := round((v_price * v_qty)::numeric, 2);
    v_subtotal := v_subtotal + v_line_total;

    insert into public.sale_items (
      org_id,
      sale_id,
      product_id,
      product_name_snapshot,
      unit_price_snapshot,
      quantity,
      line_total
    )
    values (
      p_org_id,
      v_sale_id,
      v_product_id,
      v_name,
      v_price,
      v_qty,
      v_line_total
    );

    v_remaining := v_qty;

    for v_batch in
      select
        eb.id,
        eb.quantity
      from public.expiration_batches eb
      where eb.org_id = p_org_id
        and eb.branch_id = p_branch_id
        and eb.product_id = v_product_id
        and eb.quantity > 0
      order by eb.expires_on asc, eb.created_at asc
      for update
    loop
      exit when v_remaining <= 0;

      v_to_apply := least(v_batch.quantity, v_remaining);

      update public.expiration_batches
      set quantity = quantity - v_to_apply
      where id = v_batch.id;

      v_remaining := v_remaining - v_to_apply;
    end loop;

    update public.stock_items
    set quantity_on_hand = quantity_on_hand - v_qty,
        updated_at = now()
    where org_id = p_org_id
      and branch_id = p_branch_id
      and product_id = v_product_id;

    if not found then
      insert into public.stock_items (
        org_id,
        branch_id,
        product_id,
        quantity_on_hand,
        updated_at
      )
      values (
        p_org_id,
        p_branch_id,
        v_product_id,
        -v_qty,
        now()
      );
    end if;

    insert into public.stock_movements (
      org_id,
      branch_id,
      product_id,
      movement_type,
      quantity_delta,
      source_type,
      source_id
    )
    values (
      p_org_id,
      p_branch_id,
      v_product_id,
      'sale',
      -v_qty,
      'sale',
      v_sale_id
    );
  end loop;

  if v_items_count = 0 then
    raise exception 'sale requires at least one item';
  end if;

  v_discount_amount := 0;
  v_discount_pct := 0;

  if coalesce(p_apply_cash_discount, false) then
    v_cash_discount_amount := round((v_subtotal * (v_cash_discount_pct / 100))::numeric, 2);
    v_cash_discount_applied := v_cash_discount_amount > 0;
  end if;

  if coalesce(p_apply_employee_discount, false) then
    v_employee_discount_amount := round((((v_subtotal - v_cash_discount_amount) * (v_employee_discount_pct / 100)))::numeric, 2);
    v_employee_discount_applied := v_employee_discount_amount > 0;
  end if;

  v_discount_amount := v_cash_discount_amount + v_employee_discount_amount;
  if v_subtotal > 0 and v_discount_amount > 0 then
    v_discount_pct := round(((v_discount_amount / v_subtotal) * 100)::numeric, 2);
  end if;
  v_total := greatest(round((v_subtotal - v_discount_amount)::numeric, 2), 0);

  if p_payments is not null then
    for v_payment in select * from jsonb_array_elements(p_payments)
    loop
      v_payment_method := (v_payment ->> 'payment_method')::public.payment_method;
      v_payment_amount := round(((v_payment ->> 'amount')::numeric)::numeric, 2);
      v_payment_device_id := nullif(v_payment ->> 'payment_device_id', '')::uuid;

      if v_payment_method::text = 'mixed' then
        raise exception 'payments entries cannot use mixed method';
      end if;

      if v_payment_amount is null or v_payment_amount <= 0 then
        raise exception 'payment amount must be greater than zero';
      end if;

      if v_payment_method::text in ('card', 'mercadopago') then
        if v_payment_device_id is null then
          raise exception 'payment_device_id required for card and mercadopago';
        end if;

        if not exists (
          select 1
          from public.pos_payment_devices ppd
          where ppd.id = v_payment_device_id
            and ppd.org_id = p_org_id
            and ppd.branch_id = p_branch_id
            and ppd.is_active = true
        ) then
          raise exception 'invalid payment device';
        end if;
      elsif v_payment_device_id is not null then
        raise exception 'payment_device_id only allowed for card and mercadopago';
      end if;

      v_payments_sum := v_payments_sum + v_payment_amount;
      v_payments_count := v_payments_count + 1;
      if v_payment_method::text = 'cash' then
        v_has_cash_payment := true;
      end if;
      if v_payments_count = 1 then
        v_single_payment_method := v_payment_method;
      elsif v_single_payment_method is distinct from v_payment_method then
        v_single_payment_method := null;
      end if;

      v_payment_rows := v_payment_rows || jsonb_build_array(
        jsonb_build_object(
          'payment_method', v_payment_method,
          'amount', v_payment_amount,
          'payment_device_id', v_payment_device_id
        )
      );
    end loop;

    if round(v_payments_sum::numeric, 2) <> v_total then
      raise exception 'payments total must equal sale total';
    end if;

    if coalesce(p_apply_cash_discount, false) and not v_has_cash_payment then
      raise exception 'cash discount requires cash payment';
    end if;

    if v_payments_count = 1 and v_single_payment_method is not null then
      v_summary_payment_method := v_single_payment_method;
    else
      v_summary_payment_method := 'mixed'::public.payment_method;
    end if;
  else
    v_summary_payment_method := v_effective_payment_method;
    v_payment_rows := jsonb_build_array(
      jsonb_build_object(
        'payment_method', v_effective_payment_method,
        'amount', v_total,
        'payment_device_id', v_single_payment_device_id
      )
    );
  end if;

  update public.sales
  set
    payment_method = case when v_summary_payment_method::text = 'mixed' then 'other'::public.payment_method else v_summary_payment_method end,
    subtotal_amount = v_subtotal,
    discount_amount = v_discount_amount,
    discount_pct = v_discount_pct,
    total_amount = v_total,
    cash_discount_amount = v_cash_discount_amount,
    cash_discount_pct = v_cash_discount_pct,
    employee_discount_applied = v_employee_discount_applied,
    employee_discount_amount = v_employee_discount_amount,
    employee_discount_pct = v_employee_discount_pct,
    employee_account_id = case when v_employee_discount_applied then p_employee_account_id else null end,
    employee_name_snapshot = case when v_employee_discount_applied then v_employee_name_snapshot else null end
  where id = v_sale_id;

  insert into public.sale_payments (
    org_id,
    sale_id,
    payment_method,
    amount,
    payment_device_id
  )
  select
    p_org_id,
    v_sale_id,
    (value ->> 'payment_method')::public.payment_method,
    ((value ->> 'amount')::numeric(12,2)),
    nullif(value ->> 'payment_device_id', '')::uuid
  from jsonb_array_elements(v_payment_rows);

  if p_special_order_id is not null then
    select status
      into v_order_status
    from public.client_special_orders
    where id = p_special_order_id
      and org_id = p_org_id;

    if v_order_status is null then
      raise exception 'special order not found';
    end if;

    update public.client_special_orders
    set status = case
      when coalesce(p_close_special_order, false) then 'delivered'::public.special_order_status
      else 'partial'::public.special_order_status
    end,
    updated_at = now()
    where id = p_special_order_id
      and org_id = p_org_id;
  end if;

  perform public.rpc_log_audit_event(
    p_org_id,
    'sale_created',
    'sales',
    v_sale_id,
    p_branch_id,
    jsonb_build_object(
      'branch_id', p_branch_id,
      'client_id', p_client_id,
      'payment_method', v_summary_payment_method,
      'special_order_id', p_special_order_id,
      'items_count', v_items_count,
      'total', v_total
    ),
    null
  );

  return query select v_sale_id, v_total, v_created_at;
end;
$$;

grant execute on function public.rpc_create_sale(
  uuid,
  uuid,
  public.payment_method,
  jsonb,
  uuid,
  boolean,
  boolean,
  numeric,
  jsonb,
  uuid,
  boolean,
  numeric,
  uuid,
  uuid
) to authenticated;

grant execute on function public.rpc_create_sale(
  uuid,
  uuid,
  public.payment_method,
  jsonb,
  uuid,
  boolean,
  boolean,
  numeric,
  jsonb,
  uuid,
  boolean,
  numeric,
  uuid,
  uuid
) to service_role;

create or replace view public.v_sales_admin
with (security_invoker = true) as
with payment_totals as (
  select
    sp.sale_id,
    coalesce(sum(sp.amount) filter (where sp.payment_method = 'cash'), 0)::numeric(12,2) as cash_amount,
    coalesce(sum(sp.amount) filter (where sp.payment_method::text in ('card', 'debit', 'credit')), 0)::numeric(12,2) as card_amount,
    coalesce(sum(sp.amount) filter (where sp.payment_method::text = 'mercadopago'), 0)::numeric(12,2) as mercadopago_amount,
    coalesce(sum(sp.amount) filter (where sp.payment_method::text not in ('cash', 'card', 'debit', 'credit', 'mercadopago')), 0)::numeric(12,2) as other_amount,
    array_agg(distinct sp.payment_method::text order by sp.payment_method::text) as payment_methods
  from public.sale_payments sp
  group by sp.sale_id
),
item_totals as (
  select
    si.sale_id,
    count(*)::int as items_count,
    coalesce(sum(si.quantity), 0)::numeric(14,3) as items_qty_total,
    string_agg(distinct si.product_name_snapshot, ', ' order by si.product_name_snapshot) as item_names_summary,
    lower(string_agg(distinct si.product_name_snapshot, ' ' order by si.product_name_snapshot)) as item_names_search
  from public.sale_items si
  group by si.sale_id
),
creator_names as (
  select
    ou.org_id,
    ou.user_id,
    coalesce(nullif(trim(ou.display_name), ''), ou.user_id::text) as creator_name
  from public.org_users ou
)
select
  s.id as sale_id,
  s.org_id,
  s.branch_id,
  b.name as branch_name,
  s.created_at,
  s.created_by,
  coalesce(cn.creator_name, s.created_by::text) as created_by_name,
  s.payment_method as payment_method_summary,
  s.subtotal_amount,
  s.discount_amount,
  s.discount_pct,
  s.total_amount,
  coalesce(it.items_count, 0) as items_count,
  coalesce(it.items_qty_total, 0)::numeric(14,3) as items_qty_total,
  coalesce(it.item_names_summary, '') as item_names_summary,
  coalesce(it.item_names_search, '') as item_names_search,
  coalesce(pt.payment_methods, array[]::text[]) as payment_methods,
  coalesce(pt.cash_amount, 0)::numeric(12,2) as cash_amount,
  coalesce(pt.card_amount, 0)::numeric(12,2) as card_amount,
  coalesce(pt.mercadopago_amount, 0)::numeric(12,2) as mercadopago_amount,
  coalesce(pt.other_amount, 0)::numeric(12,2) as other_amount,
  s.employee_account_id,
  s.employee_name_snapshot,
  s.cash_discount_amount,
  s.cash_discount_pct,
  s.employee_discount_applied,
  s.employee_discount_amount,
  s.employee_discount_pct,
  s.is_invoiced,
  s.invoiced_at,
  s.client_id,
  c.name as client_name,
  c.phone as client_phone
from public.sales s
join public.branches b
  on b.id = s.branch_id
 and b.org_id = s.org_id
left join public.clients c
  on c.id = s.client_id
 and c.org_id = s.org_id
left join payment_totals pt on pt.sale_id = s.id
left join item_totals it on it.sale_id = s.id
left join creator_names cn
  on cn.org_id = s.org_id
 and cn.user_id = s.created_by;

create or replace view public.v_sale_detail_admin
with (security_invoker = true) as
with items_by_sale as (
  select
    si.sale_id,
    jsonb_agg(
      jsonb_build_object(
        'sale_item_id', si.id,
        'product_id', si.product_id,
        'product_name', si.product_name_snapshot,
        'unit_price', si.unit_price_snapshot,
        'quantity', si.quantity,
        'line_total', si.line_total
      )
      order by si.product_name_snapshot
    ) as items
  from public.sale_items si
  group by si.sale_id
),
payments_by_sale as (
  select
    sp.sale_id,
    jsonb_agg(
      jsonb_build_object(
        'sale_payment_id', sp.id,
        'payment_method', sp.payment_method,
        'amount', sp.amount,
        'payment_device_id', sp.payment_device_id,
        'payment_device_name', ppd.device_name,
        'payment_device_provider', ppd.provider,
        'created_at', sp.created_at
      )
      order by sp.created_at, sp.id
    ) as payments
  from public.sale_payments sp
  left join public.pos_payment_devices ppd
    on ppd.id = sp.payment_device_id
   and ppd.org_id = sp.org_id
  group by sp.sale_id
),
creator_names as (
  select
    ou.org_id,
    ou.user_id,
    coalesce(nullif(trim(ou.display_name), ''), ou.user_id::text) as creator_name
  from public.org_users ou
)
select
  s.id as sale_id,
  s.org_id,
  s.branch_id,
  b.name as branch_name,
  s.created_at,
  s.created_by,
  coalesce(cn.creator_name, s.created_by::text) as created_by_name,
  s.payment_method as payment_method_summary,
  s.subtotal_amount,
  s.discount_amount,
  s.discount_pct,
  s.total_amount,
  coalesce(ibs.items, '[]'::jsonb) as items,
  coalesce(pbs.payments, '[]'::jsonb) as payments,
  s.employee_account_id,
  s.employee_name_snapshot,
  s.cash_discount_amount,
  s.cash_discount_pct,
  s.employee_discount_applied,
  s.employee_discount_amount,
  s.employee_discount_pct,
  s.is_invoiced,
  s.invoiced_at,
  s.client_id,
  c.name as client_name,
  c.phone as client_phone
from public.sales s
join public.branches b
  on b.id = s.branch_id
 and b.org_id = s.org_id
left join public.clients c
  on c.id = s.client_id
 and c.org_id = s.org_id
left join items_by_sale ibs on ibs.sale_id = s.id
left join payments_by_sale pbs on pbs.sale_id = s.id
left join creator_names cn
  on cn.org_id = s.org_id
 and cn.user_id = s.created_by;
