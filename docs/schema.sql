


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE TYPE "public"."order_frequency" AS ENUM (
    'weekly',
    'biweekly',
    'every_3_weeks',
    'monthly'
);


ALTER TYPE "public"."order_frequency" OWNER TO "postgres";


CREATE TYPE "public"."payment_method" AS ENUM (
    'cash',
    'debit',
    'credit',
    'transfer',
    'other',
    'mixed',
    'card',
    'mercadopago'
);


ALTER TYPE "public"."payment_method" OWNER TO "postgres";


CREATE TYPE "public"."sell_unit_type" AS ENUM (
    'unit',
    'weight',
    'bulk'
);


ALTER TYPE "public"."sell_unit_type" OWNER TO "postgres";


CREATE TYPE "public"."special_order_status" AS ENUM (
    'pending',
    'ordered',
    'received',
    'delivered',
    'partial',
    'cancelled'
);


ALTER TYPE "public"."special_order_status" OWNER TO "postgres";


CREATE TYPE "public"."stock_movement_type" AS ENUM (
    'sale',
    'purchase',
    'manual_adjustment',
    'expiration_adjustment'
);


ALTER TYPE "public"."stock_movement_type" OWNER TO "postgres";


CREATE TYPE "public"."supplier_order_status" AS ENUM (
    'draft',
    'sent',
    'received',
    'reconciled'
);


ALTER TYPE "public"."supplier_order_status" OWNER TO "postgres";


CREATE TYPE "public"."supplier_product_relation_type" AS ENUM (
    'primary',
    'secondary'
);


ALTER TYPE "public"."supplier_product_relation_type" OWNER TO "postgres";


CREATE TYPE "public"."user_role" AS ENUM (
    'superadmin',
    'org_admin',
    'staff'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";


CREATE TYPE "public"."weekday" AS ENUM (
    'mon',
    'tue',
    'wed',
    'thu',
    'fri',
    'sat',
    'sun'
);


ALTER TYPE "public"."weekday" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_recompute_supplier_payable"("p_payable_id" "uuid", "p_actor_user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
declare
  v_payable record;
  v_paid_amount numeric(12,2) := 0;
  v_base_amount numeric(12,2) := 0;
  v_outstanding numeric(12,2) := 0;
  v_status text := 'pending';
  v_last_paid_at timestamptz := null;
begin
  select * into v_payable
  from public.supplier_payables sp
  where sp.id = p_payable_id
  for update;

  if v_payable is null then
    raise exception 'payable not found';
  end if;

  select coalesce(sum(spm.amount), 0), max(spm.paid_at)
    into v_paid_amount, v_last_paid_at
  from public.supplier_payments spm
  where spm.payable_id = p_payable_id;

  v_base_amount := coalesce(v_payable.invoice_amount, v_payable.estimated_amount, 0);
  v_outstanding := greatest(v_base_amount - v_paid_amount, 0);

  if v_outstanding = 0 then
    v_status := 'paid';
  elsif v_paid_amount > 0 then
    v_status := 'partial';
  else
    v_status := 'pending';
  end if;

  update public.supplier_payables
  set
    paid_amount = round(v_paid_amount, 2),
    outstanding_amount = round(v_outstanding, 2),
    status = v_status,
    paid_at = case when v_status = 'paid' then v_last_paid_at else null end,
    updated_by = p_actor_user_id,
    updated_at = now()
  where id = p_payable_id;
end;
$$;


ALTER FUNCTION "public"."fn_recompute_supplier_payable"("p_payable_id" "uuid", "p_actor_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_sync_supplier_payable_from_order"("p_org_id" "uuid", "p_order_id" "uuid", "p_actor_user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
declare
  v_order record;
  v_estimated_amount numeric(12,2) := 0;
  v_due_on date := null;
  v_payable_id uuid;
begin
  select so.id,
         so.org_id,
         so.branch_id,
         so.supplier_id,
         so.status,
         so.sent_at,
         so.received_at,
         so.reconciled_at,
         s.payment_terms_days,
         s.preferred_payment_method
    into v_order
  from public.supplier_orders so
  join public.suppliers s
    on s.id = so.supplier_id
   and s.org_id = so.org_id
  where so.id = p_order_id
    and so.org_id = p_org_id;

  if v_order is null then
    raise exception 'order not found';
  end if;

  if v_order.status not in ('sent', 'received', 'reconciled') then
    return null;
  end if;

  select coalesce(
    sum(
      soi.ordered_qty * coalesce(nullif(soi.unit_cost, 0), p.unit_price, 0)
    ),
    0
  ) into v_estimated_amount
  from public.supplier_order_items soi
  left join public.products p
    on p.id = soi.product_id
   and p.org_id = soi.org_id
  where soi.org_id = p_org_id
    and soi.order_id = p_order_id;

  if v_order.payment_terms_days is not null then
    v_due_on := (
      coalesce(
        v_order.reconciled_at,
        v_order.received_at,
        v_order.sent_at,
        now()
      )::date
      + v_order.payment_terms_days
    );
  end if;

  insert into public.supplier_payables (
    org_id,
    branch_id,
    supplier_id,
    order_id,
    status,
    estimated_amount,
    invoice_amount,
    paid_amount,
    outstanding_amount,
    due_on,
    payment_terms_days_snapshot,
    preferred_payment_method,
    selected_payment_method,
    created_by,
    updated_by,
    created_at,
    updated_at
  ) values (
    p_org_id,
    v_order.branch_id,
    v_order.supplier_id,
    p_order_id,
    'pending',
    round(v_estimated_amount, 2),
    null,
    0,
    round(v_estimated_amount, 2),
    v_due_on,
    v_order.payment_terms_days,
    v_order.preferred_payment_method,
    null,
    p_actor_user_id,
    p_actor_user_id,
    now(),
    now()
  )
  on conflict (order_id) do update set
    branch_id = excluded.branch_id,
    supplier_id = excluded.supplier_id,
    estimated_amount = excluded.estimated_amount,
    due_on = coalesce(public.supplier_payables.due_on, excluded.due_on),
    payment_terms_days_snapshot = excluded.payment_terms_days_snapshot,
    preferred_payment_method = excluded.preferred_payment_method,
    updated_by = p_actor_user_id,
    updated_at = now()
  returning id into v_payable_id;

  perform public.fn_recompute_supplier_payable(v_payable_id, p_actor_user_id);

  return v_payable_id;
end;
$$;


ALTER FUNCTION "public"."fn_sync_supplier_payable_from_order"("p_org_id" "uuid", "p_order_id" "uuid", "p_actor_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_org_admin"("check_org_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
  select exists(
    select 1
    from public.org_users ou
    where ou.org_id = check_org_id
      and ou.user_id = auth.uid()
      and ou.is_active = true
      and ou.role = 'org_admin'
  );
$$;


ALTER FUNCTION "public"."is_org_admin"("check_org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_org_admin_or_superadmin"("check_org_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
  select public.is_platform_admin() or exists(
    select 1
    from public.org_users ou
    where ou.org_id = check_org_id
      and ou.user_id = auth.uid()
      and ou.is_active = true
      and ou.role in ('org_admin', 'superadmin')
  );
$$;


ALTER FUNCTION "public"."is_org_admin_or_superadmin"("check_org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_org_member"("check_org_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
  select exists(
    select 1
    from public.org_users ou
    where ou.org_id = check_org_id
      and ou.user_id = auth.uid()
      and ou.is_active = true
  );
$$;


ALTER FUNCTION "public"."is_org_member"("check_org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_platform_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
  select exists(
    select 1
    from public.platform_admins pa
    where pa.user_id = auth.uid()
  );
$$;


ALTER FUNCTION "public"."is_platform_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_add_cash_session_movement"("p_org_id" "uuid", "p_session_id" "uuid", "p_movement_type" "text", "p_category_key" "text", "p_amount" numeric, "p_note" "text" DEFAULT NULL::"text", "p_movement_at" timestamp with time zone DEFAULT NULL::timestamp with time zone) RETURNS TABLE("movement_id" "uuid", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
declare
  v_movement_id uuid := gen_random_uuid();
  v_created_at timestamptz := now();
  v_session record;
  v_cashbox_enabled boolean := false;
  v_movement_type text;
  v_category text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'invalid movement amount';
  end if;

  v_movement_type := lower(trim(coalesce(p_movement_type, '')));
  if v_movement_type not in ('expense', 'income') then
    raise exception 'invalid movement type';
  end if;

  v_category := nullif(trim(coalesce(p_category_key, '')), '');
  if v_category is null then
    raise exception 'movement category required';
  end if;

  select *
  into v_session
  from public.cash_sessions cs
  where cs.id = p_session_id
    and cs.org_id = p_org_id;

  if not found then
    raise exception 'cash session not found';
  end if;

  if v_session.status <> 'open' then
    raise exception 'cash session closed';
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
        and bm.branch_id = v_session.branch_id
        and bm.is_active = true
    ) then
      raise exception 'branch not allowed';
    end if;

    select exists (
      select 1
      from public.staff_module_access sma
      where sma.org_id = p_org_id
        and sma.role = 'staff'
        and sma.module_key = 'cashbox'
        and sma.is_enabled = true
        and (
          sma.branch_id = v_session.branch_id
          or sma.branch_id is null
        )
      order by case when sma.branch_id is null then 0 else 1 end desc
      limit 1
    ) into v_cashbox_enabled;

    if not v_cashbox_enabled then
      raise exception 'cashbox module disabled';
    end if;
  end if;

  insert into public.cash_session_movements (
    id,
    org_id,
    branch_id,
    session_id,
    movement_type,
    category_key,
    amount,
    note,
    movement_at,
    created_by,
    created_at
  ) values (
    v_movement_id,
    p_org_id,
    v_session.branch_id,
    p_session_id,
    v_movement_type,
    v_category,
    round(p_amount::numeric, 2),
    nullif(trim(coalesce(p_note, '')), ''),
    coalesce(p_movement_at, v_created_at),
    auth.uid(),
    v_created_at
  );

  perform public.rpc_log_audit_event(
    p_org_id,
    'cash_movement_added',
    'cash_session_movement',
    v_movement_id,
    v_session.branch_id,
    jsonb_build_object(
      'session_id', p_session_id,
      'movement_type', v_movement_type,
      'category_key', v_category,
      'amount', round(p_amount::numeric, 2),
      'movement_at', coalesce(p_movement_at, v_created_at),
      'note', nullif(trim(coalesce(p_note, '')), '')
    )
  );

  return query
  select v_movement_id, v_created_at;
end;
$$;


ALTER FUNCTION "public"."rpc_add_cash_session_movement"("p_org_id" "uuid", "p_session_id" "uuid", "p_movement_type" "text", "p_category_key" "text", "p_amount" numeric, "p_note" "text", "p_movement_at" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_adjust_expiration_batch"("p_org_id" "uuid", "p_batch_id" "uuid", "p_new_quantity" numeric) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
begin
  update public.expiration_batches
    set quantity = p_new_quantity
  where id = p_batch_id and org_id = p_org_id;

  perform public.rpc_log_audit_event(
    p_org_id,
    'expiration_batch_adjusted',
    'expiration_batch',
    p_batch_id,
    null,
    jsonb_build_object('new_quantity', p_new_quantity),
    null
  );
end;
$$;


ALTER FUNCTION "public"."rpc_adjust_expiration_batch"("p_org_id" "uuid", "p_batch_id" "uuid", "p_new_quantity" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_adjust_stock_manual"("p_org_id" "uuid", "p_branch_id" "uuid", "p_product_id" "uuid", "p_new_quantity_on_hand" numeric, "p_reason" "text") RETURNS TABLE("movement_id" "uuid", "resulting_quantity_on_hand" numeric)
    LANGUAGE "plpgsql"
    AS $$
declare
  v_current numeric(14,3);
  v_delta numeric(14,3);
  v_movement_id uuid;
begin
  select quantity_on_hand
    into v_current
  from public.stock_items
  where org_id = p_org_id
    and branch_id = p_branch_id
    and product_id = p_product_id
  for update;

  if v_current is null then
    v_current := 0;
    insert into public.stock_items (org_id, branch_id, product_id, quantity_on_hand)
    values (p_org_id, p_branch_id, p_product_id, p_new_quantity_on_hand);
  else
    update public.stock_items
      set quantity_on_hand = p_new_quantity_on_hand
    where org_id = p_org_id
      and branch_id = p_branch_id
      and product_id = p_product_id;
  end if;

  v_delta := p_new_quantity_on_hand - v_current;

  insert into public.stock_movements (
    org_id, branch_id, product_id, movement_type, quantity_delta, reason, source_type
  ) values (
    p_org_id, p_branch_id, p_product_id, 'manual_adjustment', v_delta, p_reason, 'manual_adjustment'
  ) returning id into v_movement_id;

  perform public.rpc_log_audit_event(
    p_org_id,
    'stock_manual_adjust',
    'stock_item',
    p_product_id,
    p_branch_id,
    jsonb_build_object(
      'new_quantity_on_hand', p_new_quantity_on_hand,
      'delta', v_delta,
      'reason', p_reason
    ),
    null
  );

  return query select v_movement_id, p_new_quantity_on_hand;
end;
$$;


ALTER FUNCTION "public"."rpc_adjust_stock_manual"("p_org_id" "uuid", "p_branch_id" "uuid", "p_product_id" "uuid", "p_new_quantity_on_hand" numeric, "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_bootstrap_platform_admin"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if exists (select 1 from public.platform_admins where user_id = auth.uid()) then
    return;
  end if;

  if exists (select 1 from public.platform_admins) then
    raise exception 'not authorized';
  end if;

  insert into public.platform_admins (user_id, created_by)
  values (auth.uid(), auth.uid());
end;
$$;


ALTER FUNCTION "public"."rpc_bootstrap_platform_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_close_cash_session"("p_org_id" "uuid", "p_session_id" "uuid", "p_close_note" "text" DEFAULT NULL::"text", "p_closed_controlled_by_name" "text" DEFAULT NULL::"text", "p_close_confirmed" boolean DEFAULT true, "p_closing_drawer_count_lines" "jsonb" DEFAULT NULL::"jsonb", "p_closing_reserve_count_lines" "jsonb" DEFAULT NULL::"jsonb") RETURNS TABLE("session_id" "uuid", "expected_cash_amount" numeric, "counted_cash_amount" numeric, "difference_amount" numeric, "closed_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
declare
  v_session record;
  v_summary record;
  v_closed_at timestamptz := now();
  v_cashbox_enabled boolean := false;
  v_controlled_by_name text;
  v_confirmed boolean;
  v_drawer_line jsonb;
  v_reserve_line jsonb;
  v_denom numeric(12,2);
  v_qty integer;
  v_closing_drawer_amount numeric(12,2) := 0;
  v_closing_reserve_amount numeric(12,2) := 0;
  v_counted_total numeric(12,2) := 0;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  v_controlled_by_name := nullif(trim(coalesce(p_closed_controlled_by_name, '')), '');
  if v_controlled_by_name is null then
    raise exception 'controlled by name required';
  end if;

  v_confirmed := coalesce(p_close_confirmed, false);
  if not v_confirmed then
    raise exception 'close confirmation required';
  end if;

  if p_closing_drawer_count_lines is null or jsonb_typeof(p_closing_drawer_count_lines) <> 'array' then
    raise exception 'closing drawer count lines required';
  end if;
  if p_closing_reserve_count_lines is null or jsonb_typeof(p_closing_reserve_count_lines) <> 'array' then
    raise exception 'closing reserve count lines required';
  end if;

  for v_drawer_line in select * from jsonb_array_elements(p_closing_drawer_count_lines)
  loop
    v_denom := (v_drawer_line ->> 'denomination_value')::numeric;
    v_qty := (v_drawer_line ->> 'quantity')::integer;

    if v_denom is null or v_denom <= 0 then
      raise exception 'invalid closing drawer denomination value';
    end if;
    if v_qty is null or v_qty < 0 then
      raise exception 'invalid closing drawer denomination quantity';
    end if;

    v_closing_drawer_amount := v_closing_drawer_amount + (v_denom * v_qty);
  end loop;

  for v_reserve_line in select * from jsonb_array_elements(p_closing_reserve_count_lines)
  loop
    v_denom := (v_reserve_line ->> 'denomination_value')::numeric;
    v_qty := (v_reserve_line ->> 'quantity')::integer;

    if v_denom is null or v_denom <= 0 then
      raise exception 'invalid closing reserve denomination value';
    end if;
    if v_qty is null or v_qty < 0 then
      raise exception 'invalid closing reserve denomination quantity';
    end if;

    v_closing_reserve_amount := v_closing_reserve_amount + (v_denom * v_qty);
  end loop;

  v_counted_total := v_closing_drawer_amount + v_closing_reserve_amount;

  select cs.*
  into v_session
  from public.cash_sessions cs
  where cs.id = p_session_id
    and cs.org_id = p_org_id;

  if not found then
    raise exception 'cash session not found';
  end if;

  if v_session.status <> 'open' then
    raise exception 'cash session already closed';
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
        and bm.branch_id = v_session.branch_id
        and bm.is_active = true
    ) then
      raise exception 'branch not allowed';
    end if;

    select exists (
      select 1
      from public.staff_module_access sma
      where sma.org_id = p_org_id
        and sma.role = 'staff'
        and sma.module_key = 'cashbox'
        and sma.is_enabled = true
        and (
          sma.branch_id = v_session.branch_id
          or sma.branch_id is null
        )
      order by case when sma.branch_id is null then 0 else 1 end desc
      limit 1
    ) into v_cashbox_enabled;

    if not v_cashbox_enabled then
      raise exception 'cashbox module disabled';
    end if;
  end if;

  select *
  into v_summary
  from public.v_cashbox_session_current v
  where v.session_id = p_session_id
    and v.org_id = p_org_id;

  if not found then
    raise exception 'cash session summary unavailable';
  end if;

  update public.cash_sessions
  set
    status = 'closed',
    closed_by = auth.uid(),
    closed_at = v_closed_at,
    expected_cash_amount = v_summary.expected_cash_amount,
    closing_drawer_amount = round(v_closing_drawer_amount, 2),
    closing_reserve_amount = round(v_closing_reserve_amount, 2),
    counted_cash_amount = round(v_counted_total, 2),
    difference_amount = round(v_counted_total, 2) - v_summary.expected_cash_amount,
    close_note = nullif(trim(coalesce(p_close_note, '')), ''),
    closed_controlled_by_name = v_controlled_by_name,
    close_confirmed = v_confirmed,
    updated_at = v_closed_at
  where id = p_session_id;

  delete from public.cash_session_count_lines
  where session_id = p_session_id
    and count_scope in ('closing_drawer', 'closing_reserve');

  insert into public.cash_session_count_lines (
    org_id,
    branch_id,
    session_id,
    count_scope,
    denomination_value,
    quantity,
    created_at
  )
  select
    p_org_id,
    v_session.branch_id,
    p_session_id,
    'closing_drawer',
    (line ->> 'denomination_value')::numeric,
    (line ->> 'quantity')::integer,
    v_closed_at
  from jsonb_array_elements(p_closing_drawer_count_lines) line
  where (line ->> 'quantity')::integer > 0;

  insert into public.cash_session_count_lines (
    org_id,
    branch_id,
    session_id,
    count_scope,
    denomination_value,
    quantity,
    created_at
  )
  select
    p_org_id,
    v_session.branch_id,
    p_session_id,
    'closing_reserve',
    (line ->> 'denomination_value')::numeric,
    (line ->> 'quantity')::integer,
    v_closed_at
  from jsonb_array_elements(p_closing_reserve_count_lines) line
  where (line ->> 'quantity')::integer > 0;

  perform public.rpc_log_audit_event(
    p_org_id,
    'cash_session_closed',
    'cash_session',
    p_session_id,
    v_session.branch_id,
    jsonb_build_object(
      'expected_cash_amount', v_summary.expected_cash_amount,
      'closing_drawer_amount', round(v_closing_drawer_amount, 2),
      'closing_reserve_amount', round(v_closing_reserve_amount, 2),
      'counted_cash_amount', round(v_counted_total, 2),
      'difference_amount', round(v_counted_total, 2) - v_summary.expected_cash_amount,
      'close_note', nullif(trim(coalesce(p_close_note, '')), ''),
      'closed_controlled_by_name', v_controlled_by_name,
      'close_confirmed', v_confirmed,
      'closing_drawer_count_lines', p_closing_drawer_count_lines,
      'closing_reserve_count_lines', p_closing_reserve_count_lines,
      'period_type', v_session.period_type,
      'session_label', v_session.session_label,
      'opened_by', v_session.opened_by
    )
  );

  return query
  select
    p_session_id,
    v_summary.expected_cash_amount,
    round(v_counted_total, 2),
    round(v_counted_total, 2) - v_summary.expected_cash_amount,
    v_closed_at;
end;
$$;


ALTER FUNCTION "public"."rpc_close_cash_session"("p_org_id" "uuid", "p_session_id" "uuid", "p_close_note" "text", "p_closed_controlled_by_name" "text", "p_close_confirmed" boolean, "p_closing_drawer_count_lines" "jsonb", "p_closing_reserve_count_lines" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_correct_sale_payment_method"("p_org_id" "uuid", "p_sale_payment_id" "uuid", "p_payment_method" "public"."payment_method", "p_payment_device_id" "uuid" DEFAULT NULL::"uuid", "p_reason" "text" DEFAULT NULL::"text") RETURNS TABLE("sale_id" "uuid", "sale_payment_id" "uuid", "previous_payment_method" "public"."payment_method", "payment_method" "public"."payment_method")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
declare
  v_payment record;
  v_sale record;
  v_distinct_methods integer := 0;
  v_summary_method public.payment_method;
  v_reason text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if not public.is_org_admin_or_superadmin(p_org_id) then
    raise exception 'not authorized';
  end if;

  if p_payment_method = 'mixed' then
    raise exception 'invalid payment method';
  end if;

  v_reason := nullif(trim(coalesce(p_reason, '')), '');
  if v_reason is null then
    raise exception 'reason is required';
  end if;

  select sp.*
  into v_payment
  from public.sale_payments sp
  where sp.id = p_sale_payment_id
    and sp.org_id = p_org_id
  for update;

  if not found then
    raise exception 'sale payment not found';
  end if;

  select s.*
  into v_sale
  from public.sales s
  where s.id = v_payment.sale_id
    and s.org_id = p_org_id
  for update;

  if not found then
    raise exception 'sale not found';
  end if;

  if exists (
    select 1
    from public.cash_sessions cs
    where cs.org_id = p_org_id
      and cs.branch_id = v_sale.branch_id
      and cs.status = 'closed'
      and v_sale.created_at >= cs.opened_at
      and v_sale.created_at <= cs.closed_at
  ) then
    raise exception 'sale belongs to a closed cash session';
  end if;

  if p_payment_method in ('card', 'mercadopago') then
    if p_payment_device_id is null then
      raise exception 'payment_device_id required for card and mercadopago';
    end if;

    if not exists (
      select 1
      from public.pos_payment_devices ppd
      where ppd.id = p_payment_device_id
        and ppd.org_id = p_org_id
        and ppd.branch_id = v_sale.branch_id
    ) then
      raise exception 'invalid payment device';
    end if;
  elsif p_payment_device_id is not null then
    raise exception 'payment_device_id only allowed for card and mercadopago';
  end if;

  update public.sale_payments
  set
    payment_method = p_payment_method,
    payment_device_id = p_payment_device_id
  where id = p_sale_payment_id
    and org_id = p_org_id;

  select count(distinct sp.payment_method)
  into v_distinct_methods
  from public.sale_payments sp
  where sp.sale_id = v_sale.id
    and sp.org_id = p_org_id;

  if v_distinct_methods > 1 then
    v_summary_method := 'mixed';
  else
    select sp.payment_method
    into v_summary_method
    from public.sale_payments sp
    where sp.sale_id = v_sale.id
      and sp.org_id = p_org_id
    order by sp.created_at, sp.id
    limit 1;
  end if;

  update public.sales
  set payment_method = coalesce(v_summary_method, p_payment_method)
  where id = v_sale.id
    and org_id = p_org_id;

  perform public.rpc_log_audit_event(
    p_org_id,
    'sale_payment_method_corrected',
    'sale_payment',
    p_sale_payment_id,
    v_sale.branch_id,
    jsonb_build_object(
      'sale_id', v_sale.id,
      'previous_payment_method', v_payment.payment_method,
      'new_payment_method', p_payment_method,
      'previous_payment_device_id', v_payment.payment_device_id,
      'new_payment_device_id', p_payment_device_id,
      'reason', v_reason
    ),
    auth.uid()
  );

  return query
  select v_sale.id, p_sale_payment_id, v_payment.payment_method, p_payment_method;
end;
$$;


ALTER FUNCTION "public"."rpc_correct_sale_payment_method"("p_org_id" "uuid", "p_sale_payment_id" "uuid", "p_payment_method" "public"."payment_method", "p_payment_device_id" "uuid", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_create_expiration_batch_manual"("p_org_id" "uuid", "p_branch_id" "uuid", "p_product_id" "uuid", "p_expires_on" "date", "p_quantity" numeric, "p_source_ref_id" "uuid") RETURNS TABLE("batch_id" "uuid")
    LANGUAGE "sql"
    AS $$
  with inserted as (
    insert into public.expiration_batches (
      org_id, branch_id, product_id, expires_on, quantity, source_type, source_ref_id
    ) values (
      p_org_id, p_branch_id, p_product_id, p_expires_on, p_quantity, 'manual', p_source_ref_id
    )
    returning id
  ), logged as (
    select public.rpc_log_audit_event(
      p_org_id,
      'expiration_batch_created',
      'expiration_batch',
      (select id from inserted),
      p_branch_id,
      jsonb_build_object(
        'product_id', p_product_id,
        'expires_on', p_expires_on,
        'quantity', p_quantity
      ),
      null
    )
  )
  select id from inserted;
$$;


ALTER FUNCTION "public"."rpc_create_expiration_batch_manual"("p_org_id" "uuid", "p_branch_id" "uuid", "p_product_id" "uuid", "p_expires_on" "date", "p_quantity" numeric, "p_source_ref_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_create_sale"("p_org_id" "uuid", "p_branch_id" "uuid", "p_payment_method" "public"."payment_method", "p_items" "jsonb", "p_special_order_id" "uuid" DEFAULT NULL::"uuid", "p_close_special_order" boolean DEFAULT false, "p_apply_cash_discount" boolean DEFAULT false, "p_cash_discount_pct" numeric DEFAULT NULL::numeric, "p_payments" "jsonb" DEFAULT NULL::"jsonb", "p_payment_device_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("sale_id" "uuid", "total" numeric, "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
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
  v_pos_enabled boolean := false;
  v_cash_discount_applied boolean := false;
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

  v_effective_payment_method := p_payment_method;

  if v_effective_payment_method::text = 'mixed' and (p_payments is null or jsonb_typeof(p_payments) <> 'array' or jsonb_array_length(p_payments) = 0) then
    raise exception 'mixed payment requires payments detail';
  end if;

  if p_cash_discount_pct is not null and not coalesce(p_apply_cash_discount, false) then
    raise exception 'cash discount pct requires apply_cash_discount';
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
    cash_discount_default_pct
  into
    v_allow_negative,
    v_cash_discount_enabled,
    v_cash_discount_default_pct
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

  insert into public.sales (
    id,
    org_id,
    branch_id,
    created_by,
    payment_method,
    subtotal_amount,
    discount_amount,
    discount_pct,
    total_amount,
    created_at
  )
  values (
    v_sale_id,
    p_org_id,
    p_branch_id,
    auth.uid(),
    case when v_effective_payment_method::text = 'mixed' then 'other'::public.payment_method else v_effective_payment_method end,
    0,
    0,
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
      raise exception 'insufficient stock for %', v_product_id;
    end if;

    v_line_total := v_price * v_qty;
    v_subtotal := v_subtotal + v_line_total;

    insert into public.sale_items (
      org_id, sale_id, product_id, product_name_snapshot, unit_price_snapshot, quantity, line_total
    ) values (
      p_org_id, v_sale_id, v_product_id, v_name, v_price, v_qty, v_line_total
    );

    if v_current = 0 then
      insert into public.stock_items (org_id, branch_id, product_id, quantity_on_hand)
      values (p_org_id, p_branch_id, v_product_id, v_current - v_qty)
      on conflict (org_id, branch_id, product_id)
      do update set quantity_on_hand = public.stock_items.quantity_on_hand - v_qty;
    else
      update public.stock_items
        set quantity_on_hand = quantity_on_hand - v_qty
      where org_id = p_org_id
        and branch_id = p_branch_id
        and product_id = v_product_id;
    end if;

    insert into public.stock_movements (
      org_id, branch_id, product_id, movement_type, quantity_delta, source_type, source_id
    ) values (
      p_org_id, p_branch_id, v_product_id, 'sale', -v_qty, 'sale', v_sale_id
    );

    v_remaining := v_qty;
    for v_batch in
      select id, quantity
      from public.expiration_batches
      where org_id = p_org_id
        and branch_id = p_branch_id
        and product_id = v_product_id
        and quantity > 0
      order by expires_on asc, public.expiration_batches.created_at asc
      for update
    loop
      exit when v_remaining <= 0;

      if v_batch.quantity >= v_remaining then
        update public.expiration_batches
          set quantity = quantity - v_remaining,
              updated_at = now()
        where id = v_batch.id;
        v_remaining := 0;
      else
        update public.expiration_batches
          set quantity = 0,
              updated_at = now()
        where id = v_batch.id;
        v_remaining := v_remaining - v_batch.quantity;
      end if;
    end loop;

    if p_special_order_id is not null then
      for v_item_rows in
        select id, requested_qty, fulfilled_qty
        from public.client_special_order_items
        where org_id = p_org_id
          and special_order_id = p_special_order_id
          and product_id = v_product_id
        order by public.client_special_order_items.created_at
        for update
      loop
        exit when v_qty <= 0;
        v_to_apply := least(v_qty, v_item_rows.requested_qty - v_item_rows.fulfilled_qty);
        if v_to_apply > 0 then
          update public.client_special_order_items
            set fulfilled_qty = fulfilled_qty + v_to_apply
          where id = v_item_rows.id;
          v_qty := v_qty - v_to_apply;
        end if;
      end loop;
    end if;
  end loop;

  v_total := v_subtotal;

  if p_payments is null then
    if v_effective_payment_method::text = 'mixed' then
      raise exception 'mixed payment requires payments detail';
    end if;

    v_payments_count := 1;
    v_single_payment_method := v_effective_payment_method;
    v_has_cash_payment := v_effective_payment_method = 'cash';
  else
    if jsonb_typeof(p_payments) <> 'array' then
      raise exception 'payments must be an array';
    end if;

    if jsonb_array_length(p_payments) = 0 then
      raise exception 'payments cannot be empty';
    end if;

    for v_payment in select * from jsonb_array_elements(p_payments)
    loop
      if coalesce(v_payment->>'payment_method', '') = '' then
        raise exception 'payment_method required in payments';
      end if;

      v_payment_method := (v_payment->>'payment_method')::public.payment_method;

      if v_payment_method::text = 'mixed' then
        raise exception 'mixed is not allowed inside payments detail';
      end if;

      v_payment_amount := round(coalesce((v_payment->>'amount')::numeric, 0), 2);
      if v_payment_amount <= 0 then
        raise exception 'payment amount must be greater than 0';
      end if;

      v_payment_device_id := nullif(v_payment->>'payment_device_id', '')::uuid;

      if v_payment_method::text in ('card', 'mercadopago') and v_payment_device_id is null then
        raise exception 'payment_device_id required for card and mercadopago';
      end if;

      if v_payment_method::text not in ('card', 'mercadopago') and v_payment_device_id is not null then
        raise exception 'payment_device_id only allowed for card and mercadopago';
      end if;

      if v_payment_device_id is not null and not exists (
        select 1
        from public.pos_payment_devices ppd
        where ppd.id = v_payment_device_id
          and ppd.org_id = p_org_id
          and ppd.branch_id = p_branch_id
          and ppd.is_active = true
      ) then
        raise exception 'invalid payment device';
      end if;

      v_payments_sum := v_payments_sum + v_payment_amount;
      v_payments_count := v_payments_count + 1;
      v_has_cash_payment := v_has_cash_payment or v_payment_method = 'cash';

      if v_payments_count = 1 then
        v_single_payment_method := v_payment_method;
        v_single_payment_device_id := v_payment_device_id;
      end if;

      v_payment_rows := v_payment_rows || jsonb_build_object(
        'payment_method', v_payment_method,
        'amount', v_payment_amount,
        'payment_device_id', v_payment_device_id
      );
    end loop;
  end if;

  if coalesce(p_apply_cash_discount, false) then
    if not v_cash_discount_enabled then
      raise exception 'cash discount disabled';
    end if;

    if not (v_payments_count = 1 and v_single_payment_method = 'cash') then
      raise exception 'cash discount only allowed for full cash payment';
    end if;

    v_cash_discount_applied := true;
    v_discount_pct := coalesce(p_cash_discount_pct, v_cash_discount_default_pct, 0);

    if v_discount_pct < 0 or v_discount_pct > 100 then
      raise exception 'invalid cash discount pct';
    end if;

    v_discount_amount := round((v_subtotal * v_discount_pct) / 100.0, 2);
    v_total := greatest(v_subtotal - v_discount_amount, 0);
  end if;

  if p_payments is null then
    v_payment_rows := jsonb_build_array(
      jsonb_build_object(
        'payment_method', v_effective_payment_method,
        'amount', v_total,
        'payment_device_id', v_single_payment_device_id
      )
    );
    v_payments_sum := v_total;
  end if;

  if round(v_payments_sum, 2) <> round(v_total, 2) then
    raise exception 'payments total must equal sale total';
  end if;

  if v_payments_count > 1 then
    v_summary_payment_method := 'mixed';
  else
    v_summary_payment_method := v_single_payment_method;
  end if;

  for v_payment in select * from jsonb_array_elements(v_payment_rows)
  loop
    insert into public.sale_payments (
      org_id,
      sale_id,
      payment_method,
      amount,
      payment_device_id,
      created_at
    ) values (
      p_org_id,
      v_sale_id,
      (v_payment->>'payment_method')::public.payment_method,
      (v_payment->>'amount')::numeric,
      nullif(v_payment->>'payment_device_id', '')::uuid,
      v_created_at
    );
  end loop;

  update public.sales
  set
    payment_method = v_summary_payment_method,
    subtotal_amount = v_subtotal,
    discount_amount = v_discount_amount,
    discount_pct = v_discount_pct,
    total_amount = v_total
  where id = v_sale_id;

  if p_special_order_id is not null then
    select status into v_order_status
    from public.client_special_orders
    where org_id = p_org_id and id = p_special_order_id;

    select count(*) into v_remaining_items
    from public.client_special_order_items
    where org_id = p_org_id
      and special_order_id = p_special_order_id
      and (requested_qty - fulfilled_qty) > 0;

    if p_close_special_order then
      update public.client_special_orders
        set status = 'delivered'
      where org_id = p_org_id and id = p_special_order_id;
    else
      if v_remaining_items = 0 then
        update public.client_special_orders
          set status = 'delivered'
        where org_id = p_org_id and id = p_special_order_id;
      else
        update public.client_special_orders
          set status = 'partial'
        where org_id = p_org_id and id = p_special_order_id;
      end if;
    end if;
  end if;

  perform public.rpc_log_audit_event(
    p_org_id,
    'sale_created',
    'sale',
    v_sale_id,
    p_branch_id,
    jsonb_build_object(
      'subtotal_amount', v_subtotal,
      'discount_amount', v_discount_amount,
      'discount_pct', v_discount_pct,
      'cash_discount_applied', v_cash_discount_applied,
      'payment_method', v_summary_payment_method,
      'has_cash_component', v_has_cash_payment,
      'payments', v_payment_rows,
      'items_count', v_items_count,
      'total', v_total
    ),
    null
  );

  return query select v_sale_id, v_total, v_created_at;
end;
$$;


ALTER FUNCTION "public"."rpc_create_sale"("p_org_id" "uuid", "p_branch_id" "uuid", "p_payment_method" "public"."payment_method", "p_items" "jsonb", "p_special_order_id" "uuid", "p_close_special_order" boolean, "p_apply_cash_discount" boolean, "p_cash_discount_pct" numeric, "p_payments" "jsonb", "p_payment_device_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_create_special_order"("p_org_id" "uuid", "p_branch_id" "uuid", "p_client_id" "uuid", "p_items" "jsonb", "p_notes" "text") RETURNS TABLE("special_order_id" "uuid")
    LANGUAGE "plpgsql"
    AS $$
declare
  v_order_id uuid;
  v_item jsonb;
  v_product_id uuid;
  v_requested_qty numeric(14,3);
  v_supplier_id uuid;
  v_notes text;
  v_description text;
begin
  v_notes := nullif(trim(coalesce(p_notes, '')), '');
  v_description := coalesce(v_notes, 'Pedido especial');

  insert into public.client_special_orders (
    org_id,
    branch_id,
    client_id,
    description,
    quantity,
    status,
    created_by,
    notes
  ) values (
    p_org_id,
    p_branch_id,
    p_client_id,
    v_description,
    null,
    'pending',
    auth.uid(),
    v_notes
  ) returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb))
  loop
    v_product_id := (v_item ->> 'product_id')::uuid;
    v_requested_qty := (v_item ->> 'requested_qty')::numeric;
    v_supplier_id := nullif((v_item ->> 'supplier_id')::text, '')::uuid;

    if v_product_id is null or v_requested_qty is null or v_requested_qty <= 0 then
      raise exception 'invalid special order item';
    end if;

    insert into public.client_special_order_items (
      org_id,
      special_order_id,
      product_id,
      supplier_id,
      requested_qty,
      fulfilled_qty
    ) values (
      p_org_id,
      v_order_id,
      v_product_id,
      v_supplier_id,
      v_requested_qty,
      0
    );
  end loop;

  perform public.rpc_log_audit_event(
    p_org_id,
    'special_order_created',
    'special_order',
    v_order_id,
    p_branch_id,
    jsonb_build_object(
      'client_id', p_client_id,
      'items_count', jsonb_array_length(coalesce(p_items, '[]'::jsonb))
    ),
    null
  );

  return query select v_order_id;
end;
$$;


ALTER FUNCTION "public"."rpc_create_special_order"("p_org_id" "uuid", "p_branch_id" "uuid", "p_client_id" "uuid", "p_items" "jsonb", "p_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_create_supplier_order"("p_org_id" "uuid", "p_branch_id" "uuid", "p_supplier_id" "uuid", "p_notes" "text") RETURNS TABLE("order_id" "uuid")
    LANGUAGE "sql"
    AS $$
  with inserted as (
    insert into public.supplier_orders (
      org_id, branch_id, supplier_id, status, notes, created_by
    ) values (
      p_org_id, p_branch_id, p_supplier_id, 'draft', p_notes, auth.uid()
    )
    returning id
  ), logged as (
    select public.rpc_log_audit_event(
      p_org_id,
      'supplier_order_created',
      'supplier_order',
      (select id from inserted),
      p_branch_id,
      jsonb_build_object(
        'supplier_id', p_supplier_id,
        'status', 'draft',
        'notes', p_notes
      ),
      null
    )
  )
  select id from inserted;
$$;


ALTER FUNCTION "public"."rpc_create_supplier_order"("p_org_id" "uuid", "p_branch_id" "uuid", "p_supplier_id" "uuid", "p_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_get_active_org_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
  select case
    when public.is_platform_admin() then (
      select uao.active_org_id
      from public.user_active_orgs uao
      where uao.user_id = auth.uid()
      limit 1
    )
    else (
      select ou.org_id
      from public.org_users ou
      where ou.user_id = auth.uid()
        and ou.is_active = true
      order by ou.updated_at desc nulls last, ou.created_at desc
      limit 1
    )
  end;
$$;


ALTER FUNCTION "public"."rpc_get_active_org_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_get_cash_session_payment_breakdown"("p_org_id" "uuid", "p_session_id" "uuid") RETURNS TABLE("payment_method" "public"."payment_method", "payment_device_id" "uuid", "payment_device_name" "text", "payment_device_provider" "text", "total_amount" numeric, "payments_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
declare
  v_session record;
  v_cashbox_enabled boolean := false;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select cs.*
  into v_session
  from public.cash_sessions cs
  where cs.id = p_session_id
    and cs.org_id = p_org_id;

  if not found then
    raise exception 'cash session not found';
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
        and bm.branch_id = v_session.branch_id
        and bm.is_active = true
    ) then
      raise exception 'branch not allowed';
    end if;

    select exists (
      select 1
      from public.staff_module_access sma
      where sma.org_id = p_org_id
        and sma.role = 'staff'
        and sma.module_key = 'cashbox'
        and sma.is_enabled = true
        and (sma.branch_id = v_session.branch_id or sma.branch_id is null)
      order by case when sma.branch_id is null then 0 else 1 end desc
      limit 1
    ) into v_cashbox_enabled;

    if not v_cashbox_enabled then
      raise exception 'cashbox module disabled';
    end if;
  end if;

  return query
  select
    sp.payment_method,
    sp.payment_device_id,
    case
      when sp.payment_method = 'cash' then 'Efectivo'
      when ppd.device_name is null then 'Sin dispositivo'
      else ppd.device_name
    end as payment_device_name,
    ppd.provider as payment_device_provider,
    coalesce(sum(sp.amount), 0)::numeric(12,2) as total_amount,
    count(*)::bigint as payments_count
  from public.sales s
  join public.sale_payments sp
    on sp.sale_id = s.id
   and sp.org_id = s.org_id
  left join public.pos_payment_devices ppd
    on ppd.id = sp.payment_device_id
   and ppd.org_id = sp.org_id
  where s.org_id = p_org_id
    and s.branch_id = v_session.branch_id
    and s.created_at >= v_session.opened_at
    and s.created_at <= coalesce(v_session.closed_at, now())
  group by
    sp.payment_method,
    sp.payment_device_id,
    case
      when sp.payment_method = 'cash' then 'Efectivo'
      when ppd.device_name is null then 'Sin dispositivo'
      else ppd.device_name
    end,
    ppd.provider
  order by sp.payment_method::text, payment_device_name;
end;
$$;


ALTER FUNCTION "public"."rpc_get_cash_session_payment_breakdown"("p_org_id" "uuid", "p_session_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_get_cash_session_summary"("p_org_id" "uuid", "p_session_id" "uuid") RETURNS TABLE("session_id" "uuid", "branch_id" "uuid", "status" "text", "period_type" "text", "session_label" "text", "opening_cash_amount" numeric, "opening_reserve_amount" numeric, "closing_drawer_amount" numeric, "closing_reserve_amount" numeric, "cash_sales_amount" numeric, "card_sales_amount" numeric, "mercadopago_sales_amount" numeric, "manual_income_amount" numeric, "manual_expense_amount" numeric, "expected_cash_amount" numeric, "counted_cash_amount" numeric, "difference_amount" numeric, "movements_count" bigint, "opened_by" "uuid", "closed_by" "uuid", "opened_at" timestamp with time zone, "closed_at" timestamp with time zone, "close_note" "text", "closed_controlled_by_name" "text", "close_confirmed" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
declare
  v_session record;
  v_cashbox_enabled boolean := false;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select cs.*
  into v_session
  from public.cash_sessions cs
  where cs.id = p_session_id
    and cs.org_id = p_org_id;

  if not found then
    raise exception 'cash session not found';
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
        and bm.branch_id = v_session.branch_id
        and bm.is_active = true
    ) then
      raise exception 'branch not allowed';
    end if;

    select exists (
      select 1
      from public.staff_module_access sma
      where sma.org_id = p_org_id
        and sma.role = 'staff'
        and sma.module_key = 'cashbox'
        and sma.is_enabled = true
        and (
          sma.branch_id = v_session.branch_id
          or sma.branch_id is null
        )
      order by case when sma.branch_id is null then 0 else 1 end desc
      limit 1
    ) into v_cashbox_enabled;

    if not v_cashbox_enabled then
      raise exception 'cashbox module disabled';
    end if;
  end if;

  return query
  select
    v.session_id,
    v.branch_id,
    v.status,
    v.period_type,
    v.session_label,
    v.opening_cash_amount,
    v.opening_reserve_amount,
    v.closing_drawer_amount,
    v.closing_reserve_amount,
    v.cash_sales_amount,
    v.card_sales_amount,
    v.mercadopago_sales_amount,
    v.manual_income_amount,
    v.manual_expense_amount,
    v.expected_cash_amount,
    v.counted_cash_amount,
    v.difference_amount,
    v.movements_count,
    v.opened_by,
    v.closed_by,
    v.opened_at,
    v.closed_at,
    v.close_note,
    v.closed_controlled_by_name,
    v.close_confirmed
  from public.v_cashbox_session_current v
  where v.session_id = p_session_id
    and v.org_id = p_org_id;
end;
$$;


ALTER FUNCTION "public"."rpc_get_cash_session_summary"("p_org_id" "uuid", "p_session_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_get_client_detail"("p_org_id" "uuid", "p_client_id" "uuid") RETURNS TABLE("client_id" "uuid", "name" "text", "phone" "text", "email" "text", "notes" "text", "is_active" boolean, "special_order_id" "uuid", "special_order_status" "public"."special_order_status", "special_order_notes" "text", "special_order_branch_id" "uuid", "special_order_created_at" timestamp with time zone, "item_id" "uuid", "product_id" "uuid", "product_name" "text", "requested_qty" numeric, "fulfilled_qty" numeric, "supplier_id" "uuid", "supplier_name" "text")
    LANGUAGE "sql"
    AS $$
  select
    c.id as client_id,
    c.name,
    c.phone,
    c.email,
    c.notes,
    c.is_active,
    so.id as special_order_id,
    so.status as special_order_status,
    so.notes as special_order_notes,
    so.branch_id as special_order_branch_id,
    so.created_at as special_order_created_at,
    soi.id as item_id,
    soi.product_id,
    p.name as product_name,
    soi.requested_qty,
    soi.fulfilled_qty,
    soi.supplier_id,
    s.name as supplier_name
  from public.clients c
  left join public.client_special_orders so
    on so.client_id = c.id
    and so.org_id = c.org_id
  left join public.client_special_order_items soi
    on soi.special_order_id = so.id
    and soi.org_id = so.org_id
  left join public.products p
    on p.id = soi.product_id
    and p.org_id = so.org_id
  left join public.suppliers s
    on s.id = soi.supplier_id
    and s.org_id = so.org_id
  where c.org_id = p_org_id
    and c.id = p_client_id
  order by so.created_at desc nulls last, p.name;
$$;


ALTER FUNCTION "public"."rpc_get_client_detail"("p_org_id" "uuid", "p_client_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_get_dashboard_admin"("p_org_id" "uuid", "p_branch_id" "uuid") RETURNS TABLE("org_id" "uuid", "branch_id" "uuid", "sales_today_total" numeric, "sales_today_count" bigint, "sales_week_total" numeric, "sales_month_total" numeric, "cash_sales_today_total" numeric, "cash_sales_today_count" bigint, "cash_discount_today_total" numeric, "cash_discounted_sales_today_count" bigint, "expirations_critical_count" bigint, "expirations_warning_count" bigint, "supplier_orders_pending_count" bigint, "client_orders_pending_count" bigint)
    LANGUAGE "sql"
    AS $$
  select
    org_id,
    branch_id,
    sales_today_total,
    sales_today_count,
    sales_week_total,
    sales_month_total,
    cash_sales_today_total,
    cash_sales_today_count,
    cash_discount_today_total,
    cash_discounted_sales_today_count,
    expirations_critical_count,
    expirations_warning_count,
    supplier_orders_pending_count,
    client_orders_pending_count
  from public.v_dashboard_admin
  where org_id = p_org_id
    and (
      p_branch_id is null and branch_id is null
      or p_branch_id is not null and branch_id = p_branch_id
    );
$$;


ALTER FUNCTION "public"."rpc_get_dashboard_admin"("p_org_id" "uuid", "p_branch_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_get_special_order_for_pos"("p_org_id" "uuid", "p_special_order_id" "uuid") RETURNS TABLE("special_order_id" "uuid", "client_id" "uuid", "client_name" "text", "branch_id" "uuid", "product_id" "uuid", "product_name" "text", "sell_unit_type" "public"."sell_unit_type", "uom" "text", "unit_price" numeric, "remaining_qty" numeric)
    LANGUAGE "sql"
    AS $$
  select
    so.id as special_order_id,
    c.id as client_id,
    c.name as client_name,
    so.branch_id,
    soi.product_id,
    p.name as product_name,
    p.sell_unit_type,
    p.uom,
    p.unit_price,
    (soi.requested_qty - soi.fulfilled_qty) as remaining_qty
  from public.client_special_orders so
  join public.clients c
    on c.id = so.client_id
    and c.org_id = so.org_id
  join public.client_special_order_items soi
    on soi.special_order_id = so.id
    and soi.org_id = so.org_id
  join public.products p
    on p.id = soi.product_id
    and p.org_id = so.org_id
  where so.org_id = p_org_id
    and so.id = p_special_order_id
    and (soi.requested_qty - soi.fulfilled_qty) > 0
  order by p.name;
$$;


ALTER FUNCTION "public"."rpc_get_special_order_for_pos"("p_org_id" "uuid", "p_special_order_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_get_staff_effective_modules"() RETURNS TABLE("org_id" "uuid", "branch_id" "uuid", "module_key" "text", "is_enabled" boolean, "source_scope" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
  with memberships as (
    select bm.org_id, bm.branch_id
    from public.branch_memberships bm
    where bm.user_id = auth.uid()
      and bm.is_active = true
  ),
  module_keys as (
    select sma.org_id, sma.branch_id, sma.module_key, sma.is_enabled
    from public.staff_module_access sma
    where sma.role = 'staff'
  ),
  resolved as (
    select
      m.org_id,
      m.branch_id,
      mk.module_key,
      case
        when bo.module_key is not null then bo.is_enabled
        when od.module_key is not null then od.is_enabled
        else false
      end as is_enabled,
      case
        when bo.module_key is not null then 'branch_override'
        when od.module_key is not null then 'org_default'
        else 'none'
      end as source_scope
    from memberships m
    join (
      select distinct org_id, module_key
      from module_keys
    ) mk on mk.org_id = m.org_id
    left join module_keys od
      on od.org_id = m.org_id
      and od.branch_id is null
      and od.module_key = mk.module_key
    left join module_keys bo
      on bo.org_id = m.org_id
      and bo.branch_id = m.branch_id
      and bo.module_key = mk.module_key
  )
  select * from resolved;
$$;


ALTER FUNCTION "public"."rpc_get_staff_effective_modules"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_get_staff_module_access"("p_org_id" "uuid", "p_branch_id" "uuid") RETURNS TABLE("module_key" "text", "is_enabled" boolean, "source_scope" "text")
    LANGUAGE "sql"
    AS $$
  with module_keys as (
    select distinct module_key
    from public.staff_module_access
    where org_id = p_org_id
      and role = 'staff'
  ),
  org_default as (
    select module_key, is_enabled
    from public.staff_module_access
    where org_id = p_org_id
      and branch_id is null
      and role = 'staff'
  ),
  branch_override as (
    select module_key, is_enabled
    from public.staff_module_access
    where org_id = p_org_id
      and branch_id = p_branch_id
      and role = 'staff'
  )
  select
    mk.module_key,
    coalesce(bo.is_enabled, od.is_enabled, false) as is_enabled,
    case
      when bo.module_key is not null then 'branch_override'
      when od.module_key is not null then 'org_default'
      else 'none'
    end as source_scope
  from module_keys mk
  left join org_default od on od.module_key = mk.module_key
  left join branch_override bo on bo.module_key = mk.module_key;
$$;


ALTER FUNCTION "public"."rpc_get_staff_module_access"("p_org_id" "uuid", "p_branch_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_invite_user_to_org"("p_org_id" "uuid", "p_email" "text", "p_role" "public"."user_role", "p_branch_ids" "uuid"[]) RETURNS TABLE("user_id" "uuid")
    LANGUAGE "plpgsql"
    AS $$
declare
  v_user_id uuid;
  v_branch_id uuid;
begin
  select id into v_user_id from auth.users where email = p_email;
  if v_user_id is null then
    raise exception 'user not found for email %', p_email;
  end if;

  insert into public.org_users (org_id, user_id, role)
  values (p_org_id, v_user_id, p_role)
  on conflict (org_id, user_id) do update set role = excluded.role;

  if p_role = 'staff' then
    foreach v_branch_id in array p_branch_ids loop
      insert into public.branch_memberships (org_id, branch_id, user_id)
      values (p_org_id, v_branch_id, v_user_id)
      on conflict (org_id, branch_id, user_id) do nothing;
    end loop;
  end if;

  perform public.rpc_log_audit_event(
    p_org_id,
    'user_invited',
    'org_user',
    v_user_id,
    null,
    jsonb_build_object(
      'email', p_email,
      'role', p_role,
      'branch_ids', p_branch_ids
    ),
    null
  );

  return query select v_user_id;
end;
$$;


ALTER FUNCTION "public"."rpc_invite_user_to_org"("p_org_id" "uuid", "p_email" "text", "p_role" "public"."user_role", "p_branch_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_list_clients"("p_org_id" "uuid", "p_branch_id" "uuid", "p_search" "text", "p_limit" integer, "p_offset" integer) RETURNS TABLE("client_id" "uuid", "name" "text", "phone" "text", "email" "text", "active_special_orders_count" bigint)
    LANGUAGE "sql"
    AS $$
  select
    c.id as client_id,
    c.name,
    c.phone,
    c.email,
    coalesce(count(co.id) filter (
      where co.status in ('pending', 'ordered', 'received')
        and (p_branch_id is null or co.branch_id = p_branch_id)
    ), 0) as active_special_orders_count
  from public.clients c
  left join public.client_special_orders co
    on co.client_id = c.id
    and co.org_id = c.org_id
  where c.org_id = p_org_id
    and (
      p_search is null
      or c.name ilike '%' || p_search || '%'
      or c.phone ilike '%' || p_search || '%'
      or c.email ilike '%' || p_search || '%'
    )
  group by c.id
  order by c.name
  limit coalesce(p_limit, 50)
  offset coalesce(p_offset, 0);
$$;


ALTER FUNCTION "public"."rpc_list_clients"("p_org_id" "uuid", "p_branch_id" "uuid", "p_search" "text", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_log_audit_event"("p_org_id" "uuid", "p_action_key" "text", "p_entity_type" "text", "p_entity_id" "uuid", "p_branch_id" "uuid", "p_metadata" "jsonb", "p_actor_user_id" "uuid" DEFAULT NULL::"uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if not public.is_org_member(p_org_id) then
    raise exception 'not authorized';
  end if;

  insert into public.audit_log (
    org_id,
    actor_user_id,
    branch_id,
    action_key,
    entity_type,
    entity_id,
    metadata
  ) values (
    p_org_id,
    coalesce(p_actor_user_id, auth.uid()),
    p_branch_id,
    p_action_key,
    p_entity_type,
    p_entity_id,
    p_metadata
  );
end;
$$;


ALTER FUNCTION "public"."rpc_log_audit_event"("p_org_id" "uuid", "p_action_key" "text", "p_entity_type" "text", "p_entity_id" "uuid", "p_branch_id" "uuid", "p_metadata" "jsonb", "p_actor_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_mark_special_order_items_ordered"("p_org_id" "uuid", "p_item_ids" "uuid"[], "p_supplier_order_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
begin
  update public.client_special_order_items
    set is_ordered = true,
        ordered_at = now(),
        supplier_order_id = p_supplier_order_id
  where org_id = p_org_id
    and id = any(p_item_ids);

  update public.client_special_orders so
    set status = 'ordered'
  where so.org_id = p_org_id
    and so.id in (
      select distinct special_order_id
      from public.client_special_order_items
      where org_id = p_org_id and id = any(p_item_ids)
    )
    and so.status = 'pending';
end;
$$;


ALTER FUNCTION "public"."rpc_mark_special_order_items_ordered"("p_org_id" "uuid", "p_item_ids" "uuid"[], "p_supplier_order_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_move_expiration_batch_to_waste"("p_org_id" "uuid", "p_batch_id" "uuid", "p_expected_qty" numeric) RETURNS TABLE("waste_id" "uuid", "total_amount" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
declare
  v_batch record;
  v_unit_price numeric(12,2);
  v_total numeric(12,2);
  v_waste_id uuid;
  v_current numeric(14,3);
  v_exp_enabled boolean := false;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select
    eb.id as batch_id,
    eb.branch_id,
    eb.product_id,
    eb.quantity,
    eb.expires_on
  into v_batch
  from public.expiration_batches eb
  where eb.org_id = p_org_id
    and eb.id = p_batch_id
  for update;

  if v_batch.batch_id is null then
    raise exception 'batch not found';
  end if;

  if v_batch.expires_on >= current_date then
    raise exception 'batch not expired';
  end if;

  if v_batch.quantity <= 0 then
    raise exception 'batch empty';
  end if;

  if p_expected_qty is not null and p_expected_qty <> v_batch.quantity then
    raise exception 'quantity mismatch';
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
        and bm.branch_id = v_batch.branch_id
        and bm.is_active = true
    ) then
      raise exception 'branch not allowed';
    end if;

    select coalesce(
      (select sma.is_enabled
       from public.staff_module_access sma
       where sma.org_id = p_org_id
         and sma.branch_id = v_batch.branch_id
         and sma.role = 'staff'
         and sma.module_key = 'expirations'
       limit 1),
      (select sma.is_enabled
       from public.staff_module_access sma
       where sma.org_id = p_org_id
         and sma.branch_id is null
         and sma.role = 'staff'
         and sma.module_key = 'expirations'
       limit 1),
      false
    ) into v_exp_enabled;

    if not v_exp_enabled then
      raise exception 'expirations module disabled';
    end if;
  end if;

  select unit_price
    into v_unit_price
  from public.products
  where id = v_batch.product_id
    and org_id = p_org_id;

  if v_unit_price is null then
    v_unit_price := 0;
  end if;

  v_total := v_unit_price * v_batch.quantity;

  insert into public.expiration_waste (
    org_id,
    branch_id,
    product_id,
    batch_id,
    quantity,
    unit_price_snapshot,
    total_amount,
    created_by
  ) values (
    p_org_id,
    v_batch.branch_id,
    v_batch.product_id,
    v_batch.batch_id,
    v_batch.quantity,
    v_unit_price,
    v_total,
    auth.uid()
  ) returning id into v_waste_id;

  update public.expiration_batches
    set quantity = 0,
        updated_at = now()
  where id = v_batch.batch_id;

  select quantity_on_hand
    into v_current
  from public.stock_items
  where org_id = p_org_id
    and branch_id = v_batch.branch_id
    and product_id = v_batch.product_id
  for update;

  if v_current is null then
    insert into public.stock_items (
      org_id, branch_id, product_id, quantity_on_hand
    ) values (
      p_org_id, v_batch.branch_id, v_batch.product_id, 0 - v_batch.quantity
    )
    on conflict (org_id, branch_id, product_id)
    do update set quantity_on_hand = public.stock_items.quantity_on_hand - v_batch.quantity;
  else
    update public.stock_items
      set quantity_on_hand = quantity_on_hand - v_batch.quantity
    where org_id = p_org_id
      and branch_id = v_batch.branch_id
      and product_id = v_batch.product_id;
  end if;

  insert into public.stock_movements (
    org_id,
    branch_id,
    product_id,
    movement_type,
    quantity_delta,
    reason,
    source_type,
    source_id,
    expiration_batch_id
  ) values (
    p_org_id,
    v_batch.branch_id,
    v_batch.product_id,
    'expiration_adjustment',
    0 - v_batch.quantity,
    'waste',
    'expiration_waste',
    v_waste_id,
    v_batch.batch_id
  );

  perform public.rpc_log_audit_event(
    p_org_id,
    'expiration_waste_recorded',
    'expiration_waste',
    v_waste_id,
    v_batch.branch_id,
    jsonb_build_object(
      'batch_id', v_batch.batch_id,
      'product_id', v_batch.product_id,
      'quantity', v_batch.quantity,
      'total_amount', v_total
    ),
    null
  );

  return query select v_waste_id, v_total;
end;
$$;


ALTER FUNCTION "public"."rpc_move_expiration_batch_to_waste"("p_org_id" "uuid", "p_batch_id" "uuid", "p_expected_qty" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_open_cash_session"("p_org_id" "uuid", "p_branch_id" "uuid", "p_period_type" "text" DEFAULT 'shift'::"text", "p_session_label" "text" DEFAULT NULL::"text", "p_opening_drawer_count_lines" "jsonb" DEFAULT NULL::"jsonb", "p_opening_reserve_count_lines" "jsonb" DEFAULT NULL::"jsonb") RETURNS TABLE("session_id" "uuid", "opened_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
declare
  v_session_id uuid := gen_random_uuid();
  v_opened_at timestamptz := now();
  v_cashbox_enabled boolean := false;
  v_drawer_line jsonb;
  v_reserve_line jsonb;
  v_denom numeric(12,2);
  v_qty integer;
  v_opening_drawer_amount numeric(12,2) := 0;
  v_opening_reserve_amount numeric(12,2) := 0;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if coalesce(p_period_type, '') not in ('shift', 'day') then
    raise exception 'invalid period type';
  end if;

  if p_opening_drawer_count_lines is null or jsonb_typeof(p_opening_drawer_count_lines) <> 'array' then
    raise exception 'opening drawer count lines required';
  end if;
  if p_opening_reserve_count_lines is null or jsonb_typeof(p_opening_reserve_count_lines) <> 'array' then
    raise exception 'opening reserve count lines required';
  end if;

  for v_drawer_line in select * from jsonb_array_elements(p_opening_drawer_count_lines)
  loop
    v_denom := (v_drawer_line ->> 'denomination_value')::numeric;
    v_qty := (v_drawer_line ->> 'quantity')::integer;

    if v_denom is null or v_denom <= 0 then
      raise exception 'invalid drawer denomination value';
    end if;
    if v_qty is null or v_qty < 0 then
      raise exception 'invalid drawer denomination quantity';
    end if;

    v_opening_drawer_amount := v_opening_drawer_amount + (v_denom * v_qty);
  end loop;

  for v_reserve_line in select * from jsonb_array_elements(p_opening_reserve_count_lines)
  loop
    v_denom := (v_reserve_line ->> 'denomination_value')::numeric;
    v_qty := (v_reserve_line ->> 'quantity')::integer;

    if v_denom is null or v_denom <= 0 then
      raise exception 'invalid reserve denomination value';
    end if;
    if v_qty is null or v_qty < 0 then
      raise exception 'invalid reserve denomination quantity';
    end if;

    v_opening_reserve_amount := v_opening_reserve_amount + (v_denom * v_qty);
  end loop;

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

    select exists (
      select 1
      from public.staff_module_access sma
      where sma.org_id = p_org_id
        and sma.role = 'staff'
        and sma.module_key = 'cashbox'
        and sma.is_enabled = true
        and (
          sma.branch_id = p_branch_id
          or sma.branch_id is null
        )
      order by case when sma.branch_id is null then 0 else 1 end desc
      limit 1
    ) into v_cashbox_enabled;

    if not v_cashbox_enabled then
      raise exception 'cashbox module disabled';
    end if;
  end if;

  if exists (
    select 1
    from public.cash_sessions cs
    where cs.org_id = p_org_id
      and cs.branch_id = p_branch_id
      and cs.status = 'open'
  ) then
    raise exception 'cash session already open for branch';
  end if;

  insert into public.cash_sessions (
    id,
    org_id,
    branch_id,
    opened_by,
    period_type,
    session_label,
    opening_cash_amount,
    opening_reserve_amount,
    status,
    opened_at,
    created_at,
    updated_at
  ) values (
    v_session_id,
    p_org_id,
    p_branch_id,
    auth.uid(),
    p_period_type,
    nullif(trim(coalesce(p_session_label, '')), ''),
    round(v_opening_drawer_amount, 2),
    round(v_opening_reserve_amount, 2),
    'open',
    v_opened_at,
    v_opened_at,
    v_opened_at
  );

  insert into public.cash_session_count_lines (
    org_id,
    branch_id,
    session_id,
    count_scope,
    denomination_value,
    quantity,
    created_at
  )
  select
    p_org_id,
    p_branch_id,
    v_session_id,
    'opening_drawer',
    (line ->> 'denomination_value')::numeric,
    (line ->> 'quantity')::integer,
    v_opened_at
  from jsonb_array_elements(p_opening_drawer_count_lines) line
  where (line ->> 'quantity')::integer > 0;

  insert into public.cash_session_count_lines (
    org_id,
    branch_id,
    session_id,
    count_scope,
    denomination_value,
    quantity,
    created_at
  )
  select
    p_org_id,
    p_branch_id,
    v_session_id,
    'opening_reserve',
    (line ->> 'denomination_value')::numeric,
    (line ->> 'quantity')::integer,
    v_opened_at
  from jsonb_array_elements(p_opening_reserve_count_lines) line
  where (line ->> 'quantity')::integer > 0;

  perform public.rpc_log_audit_event(
    p_org_id,
    'cash_session_opened',
    'cash_session',
    v_session_id,
    p_branch_id,
    jsonb_build_object(
      'period_type', p_period_type,
      'session_label', nullif(trim(coalesce(p_session_label, '')), ''),
      'opening_drawer_amount', round(v_opening_drawer_amount, 2),
      'opening_reserve_amount', round(v_opening_reserve_amount, 2),
      'opening_drawer_count_lines', p_opening_drawer_count_lines,
      'opening_reserve_count_lines', p_opening_reserve_count_lines
    )
  );

  return query
  select v_session_id, v_opened_at;
end;
$$;


ALTER FUNCTION "public"."rpc_open_cash_session"("p_org_id" "uuid", "p_branch_id" "uuid", "p_period_type" "text", "p_session_label" "text", "p_opening_drawer_count_lines" "jsonb", "p_opening_reserve_count_lines" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_receive_supplier_order"("p_org_id" "uuid", "p_order_id" "uuid", "p_items" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_item jsonb;
  v_order record;
  v_item_id uuid;
  v_received_qty numeric(14,3);
  v_product_id uuid;
  v_shelf_life_days integer;
  v_expires_on date;
begin
  select * into v_order
  from public.supplier_orders
  where id = p_order_id and org_id = p_org_id
  for update;

  if v_order is null then
    raise exception 'order not found';
  end if;

  if v_order.status <> 'sent' then
    raise exception 'order must be sent before received';
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_item_id := (v_item ->> 'order_item_id')::uuid;
    v_received_qty := (v_item ->> 'received_qty')::numeric;

    update public.supplier_order_items
      set received_qty = v_received_qty
    where id = v_item_id
      and order_id = p_order_id
      and org_id = p_org_id
    returning product_id into v_product_id;

    if v_product_id is null then
      raise exception 'order item not found %', v_item_id;
    end if;

    insert into public.stock_items (org_id, branch_id, product_id, quantity_on_hand)
    values (p_org_id, v_order.branch_id, v_product_id, v_received_qty)
    on conflict (org_id, branch_id, product_id)
    do update set quantity_on_hand = public.stock_items.quantity_on_hand + v_received_qty;

    insert into public.stock_movements (
      org_id, branch_id, product_id, movement_type, quantity_delta, source_type, source_id
    ) values (
      p_org_id, v_order.branch_id, v_product_id, 'purchase', v_received_qty, 'purchase', p_order_id
    );

    if v_received_qty > 0 then
      select shelf_life_days into v_shelf_life_days
      from public.products
      where id = v_product_id and org_id = p_org_id;

      if v_shelf_life_days is not null and v_shelf_life_days > 0 then
        v_expires_on := current_date + v_shelf_life_days;
        insert into public.expiration_batches (
          org_id,
          branch_id,
          product_id,
          expires_on,
          quantity,
          source_type,
          source_ref_id,
          created_at,
          updated_at
        ) values (
          p_org_id,
          v_order.branch_id,
          v_product_id,
          v_expires_on,
          v_received_qty,
          'purchase',
          p_order_id,
          now(),
          now()
        );
      end if;
    end if;
  end loop;

  update public.supplier_orders
    set status = 'received',
        received_at = now()
  where id = p_order_id and org_id = p_org_id;
end;
$$;


ALTER FUNCTION "public"."rpc_receive_supplier_order"("p_org_id" "uuid", "p_order_id" "uuid", "p_items" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_receive_supplier_order"("p_org_id" "uuid", "p_order_id" "uuid", "p_items" "jsonb", "p_received_at" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_controlled_by_user_id" "uuid" DEFAULT NULL::"uuid", "p_controlled_by_name" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $_$
declare
  v_item jsonb;
  v_order record;
  v_item_id uuid;
  v_received_qty numeric(14,3);
  v_product_id uuid;
  v_shelf_life_days integer;
  v_expires_on date;
  v_received_ts timestamptz;
  v_received_date date;
  v_supplier_name text;
  v_supplier_code text;
  v_seq int;
  v_batch_code text;
begin
  select * into v_order
  from public.supplier_orders
  where id = p_order_id and org_id = p_org_id
  for update;

  if v_order is null then
    raise exception 'order not found';
  end if;

  if v_order.status <> 'sent' then
    raise exception 'order must be sent before received';
  end if;

  v_received_ts := coalesce(p_received_at, now());
  v_received_date := v_received_ts::date;

  select name into v_supplier_name
  from public.suppliers
  where id = v_order.supplier_id and org_id = p_org_id;

  v_supplier_code := upper(left(
    regexp_replace(
      translate(coalesce(v_supplier_name, ''), 'áéíóúÁÉÍÓÚñÑ', 'aeiouAEIOUnN'),
      '[^A-Za-z]',
      '',
      'g'
    ),
    3
  ));

  if v_supplier_code is null or length(v_supplier_code) < 3 then
    v_supplier_code := 'SUP';
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_item_id := (v_item ->> 'order_item_id')::uuid;
    v_received_qty := (v_item ->> 'received_qty')::numeric;

    update public.supplier_order_items
      set received_qty = v_received_qty
    where id = v_item_id
      and order_id = p_order_id
      and org_id = p_org_id
    returning product_id into v_product_id;

    if v_product_id is null then
      raise exception 'order item not found %', v_item_id;
    end if;

    insert into public.stock_items (org_id, branch_id, product_id, quantity_on_hand)
    values (p_org_id, v_order.branch_id, v_product_id, v_received_qty)
    on conflict (org_id, branch_id, product_id)
    do update set quantity_on_hand = public.stock_items.quantity_on_hand + v_received_qty;

    insert into public.stock_movements (
      org_id, branch_id, product_id, movement_type, quantity_delta, source_type, source_id
    ) values (
      p_org_id, v_order.branch_id, v_product_id, 'purchase', v_received_qty, 'purchase', p_order_id
    );

    if v_received_qty > 0 then
      select shelf_life_days into v_shelf_life_days
      from public.products
      where id = v_product_id and org_id = p_org_id;

      if v_shelf_life_days is not null and v_shelf_life_days > 0 then
        v_expires_on := v_received_date + v_shelf_life_days;

        select coalesce(
          max((regexp_match(batch_code, '-(\\d{3})$'))[1]::int),
          0
        ) + 1
        into v_seq
        from public.expiration_batches
        where org_id = p_org_id
          and branch_id = v_order.branch_id
          and batch_code like (v_supplier_code || '-' || to_char(v_received_date, 'YYYYMMDD') || '-%');

        v_batch_code := v_supplier_code || '-' || to_char(v_received_date, 'YYYYMMDD') || '-' || lpad(v_seq::text, 3, '0');

        insert into public.expiration_batches (
          org_id,
          branch_id,
          product_id,
          expires_on,
          quantity,
          source_type,
          source_ref_id,
          batch_code,
          created_at,
          updated_at
        ) values (
          p_org_id,
          v_order.branch_id,
          v_product_id,
          v_expires_on,
          v_received_qty,
          'purchase',
          p_order_id,
          v_batch_code,
          now(),
          now()
        );
      end if;
    end if;
  end loop;

  update public.supplier_orders
    set status = 'reconciled',
        received_at = v_received_ts,
        reconciled_at = now(),
        controlled_by_user_id = p_controlled_by_user_id,
        controlled_by_name = nullif(p_controlled_by_name, '')
  where id = p_order_id and org_id = p_org_id;

  perform public.rpc_log_audit_event(
    p_org_id,
    'supplier_order_received',
    'supplier_order',
    p_order_id,
    v_order.branch_id,
    jsonb_build_object(
      'status', 'reconciled',
      'received_at', v_received_ts,
      'controlled_by_user_id', p_controlled_by_user_id,
      'controlled_by_name', nullif(p_controlled_by_name, ''),
      'items_count', jsonb_array_length(p_items)
    ),
    p_controlled_by_user_id
  );
end;
$_$;


ALTER FUNCTION "public"."rpc_receive_supplier_order"("p_org_id" "uuid", "p_order_id" "uuid", "p_items" "jsonb", "p_received_at" timestamp with time zone, "p_controlled_by_user_id" "uuid", "p_controlled_by_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_reconcile_supplier_order"("p_org_id" "uuid", "p_order_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
begin
  update public.supplier_orders
    set status = 'reconciled',
        reconciled_at = now()
  where id = p_order_id
    and org_id = p_org_id
    and status = 'received';

  perform public.rpc_log_audit_event(
    p_org_id,
    'supplier_order_reconciled',
    'supplier_order',
    p_order_id,
    null,
    null,
    null
  );
end;
$$;


ALTER FUNCTION "public"."rpc_reconcile_supplier_order"("p_org_id" "uuid", "p_order_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_reconcile_supplier_order"("p_org_id" "uuid", "p_order_id" "uuid", "p_controlled_by_user_id" "uuid" DEFAULT NULL::"uuid", "p_controlled_by_name" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
begin
  update public.supplier_orders
    set status = 'reconciled',
        reconciled_at = now(),
        controlled_by_user_id = p_controlled_by_user_id,
        controlled_by_name = nullif(p_controlled_by_name, '')
  where id = p_order_id
    and org_id = p_org_id
    and status = 'received';
end;
$$;


ALTER FUNCTION "public"."rpc_reconcile_supplier_order"("p_org_id" "uuid", "p_order_id" "uuid", "p_controlled_by_user_id" "uuid", "p_controlled_by_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_register_supplier_payment"("p_org_id" "uuid", "p_payable_id" "uuid", "p_amount" numeric, "p_payment_method" "public"."payment_method", "p_paid_at" timestamp with time zone DEFAULT "now"(), "p_transfer_account_id" "uuid" DEFAULT NULL::"uuid", "p_reference" "text" DEFAULT NULL::"text", "p_note" "text" DEFAULT NULL::"text") RETURNS TABLE("payment_id" "uuid", "payable_status" "text", "outstanding_amount" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
declare
  v_payable record;
  v_payment_id uuid;
  v_open_session_id uuid;
  v_supplier_name text;
  v_cash_movement_note text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if not public.is_org_admin_or_superadmin(p_org_id) then
    raise exception 'not authorized';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'invalid payment amount';
  end if;

  if p_payment_method not in ('cash', 'transfer') then
    raise exception 'invalid payment method';
  end if;

  select * into v_payable
  from public.supplier_payables sp
  where sp.id = p_payable_id
    and sp.org_id = p_org_id
  for update;

  if v_payable is null then
    raise exception 'payable not found';
  end if;

  if v_payable.status = 'paid' then
    raise exception 'payable already paid';
  end if;

  if p_amount > v_payable.outstanding_amount and v_payable.outstanding_amount > 0 then
    raise exception 'payment amount exceeds outstanding amount';
  end if;

  if p_payment_method = 'transfer' and p_transfer_account_id is not null then
    if not exists (
      select 1
      from public.supplier_payment_accounts spa
      where spa.id = p_transfer_account_id
        and spa.org_id = p_org_id
        and spa.supplier_id = v_payable.supplier_id
    ) then
      raise exception 'transfer account not found for supplier';
    end if;
  end if;

  insert into public.supplier_payments (
    org_id,
    branch_id,
    supplier_id,
    payable_id,
    order_id,
    payment_method,
    transfer_account_id,
    amount,
    paid_at,
    reference,
    note,
    created_by,
    created_at
  ) values (
    p_org_id,
    v_payable.branch_id,
    v_payable.supplier_id,
    p_payable_id,
    v_payable.order_id,
    p_payment_method,
    p_transfer_account_id,
    round(p_amount, 2),
    coalesce(p_paid_at, now()),
    nullif(trim(coalesce(p_reference, '')), ''),
    nullif(trim(coalesce(p_note, '')), ''),
    auth.uid(),
    now()
  )
  returning id into v_payment_id;

  if p_payment_method = 'cash' then
    select cs.id
    into v_open_session_id
    from public.cash_sessions cs
    where cs.org_id = p_org_id
      and cs.branch_id = v_payable.branch_id
      and cs.status = 'open'
      and coalesce(p_paid_at, now()) >= cs.opened_at
    order by cs.opened_at desc
    limit 1;

    if v_open_session_id is not null then
      select s.name
      into v_supplier_name
      from public.suppliers s
      where s.id = v_payable.supplier_id
        and s.org_id = p_org_id;

      v_cash_movement_note := trim(
        both ' '
        from concat(
          'Pago proveedor ',
          coalesce(v_supplier_name, 'Proveedor'),
          ' · pedido ',
          v_payable.order_id::text,
          case
            when nullif(trim(coalesce(p_note, '')), '') is null then ''
            else concat(' · ', nullif(trim(coalesce(p_note, '')), ''))
          end
        )
      );

      insert into public.cash_session_movements (
        org_id,
        branch_id,
        session_id,
        movement_type,
        category_key,
        amount,
        note,
        movement_at,
        created_by,
        created_at,
        supplier_payment_id
      ) values (
        p_org_id,
        v_payable.branch_id,
        v_open_session_id,
        'expense',
        'supplier_payment_cash',
        round(p_amount, 2),
        nullif(v_cash_movement_note, ''),
        coalesce(p_paid_at, now()),
        auth.uid(),
        now(),
        v_payment_id
      );
    end if;
  end if;

  update public.supplier_payables
  set
    selected_payment_method = p_payment_method,
    updated_by = auth.uid(),
    updated_at = now()
  where id = p_payable_id;

  perform public.fn_recompute_supplier_payable(p_payable_id, auth.uid());

  select * into v_payable
  from public.supplier_payables
  where id = p_payable_id;

  perform public.rpc_log_audit_event(
    p_org_id,
    'supplier_payment_registered',
    'supplier_payment',
    v_payment_id,
    v_payable.branch_id,
    jsonb_build_object(
      'payable_id', p_payable_id,
      'order_id', v_payable.order_id,
      'amount', round(p_amount, 2),
      'payment_method', p_payment_method,
      'transfer_account_id', p_transfer_account_id,
      'reference', nullif(trim(coalesce(p_reference, '')), ''),
      'status', v_payable.status,
      'outstanding_amount', v_payable.outstanding_amount
    ),
    auth.uid()
  );

  return query
  select v_payment_id, v_payable.status, v_payable.outstanding_amount;
end;
$$;


ALTER FUNCTION "public"."rpc_register_supplier_payment"("p_org_id" "uuid", "p_payable_id" "uuid", "p_amount" numeric, "p_payment_method" "public"."payment_method", "p_paid_at" timestamp with time zone, "p_transfer_account_id" "uuid", "p_reference" "text", "p_note" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_remove_supplier_order_item"("p_org_id" "uuid", "p_order_id" "uuid", "p_product_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_id uuid;
begin
  select id into v_id
  from public.supplier_order_items
  where org_id = p_org_id
    and order_id = p_order_id
    and product_id = p_product_id;

  delete from public.supplier_order_items
  where org_id = p_org_id
    and order_id = p_order_id
    and product_id = p_product_id;

  if v_id is not null then
    perform public.rpc_log_audit_event(
      p_org_id,
      'supplier_order_item_removed',
      'supplier_order_item',
      v_id,
      null,
      jsonb_build_object(
        'order_id', p_order_id,
        'product_id', p_product_id
      ),
      null
    );
  end if;
end;
$$;


ALTER FUNCTION "public"."rpc_remove_supplier_order_item"("p_org_id" "uuid", "p_order_id" "uuid", "p_product_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_remove_supplier_product"("p_org_id" "uuid", "p_supplier_id" "uuid", "p_product_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_id uuid;
begin
  select id into v_id
  from public.supplier_products
  where org_id = p_org_id
    and supplier_id = p_supplier_id
    and product_id = p_product_id;

  delete from public.supplier_products
  where org_id = p_org_id
    and supplier_id = p_supplier_id
    and product_id = p_product_id;

  if v_id is not null then
    perform public.rpc_log_audit_event(
      p_org_id,
      'supplier_product_removed',
      'supplier_product',
      v_id,
      null,
      jsonb_build_object(
        'supplier_id', p_supplier_id,
        'product_id', p_product_id
      ),
      null
    );
  end if;
end;
$$;


ALTER FUNCTION "public"."rpc_remove_supplier_product"("p_org_id" "uuid", "p_supplier_id" "uuid", "p_product_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_remove_supplier_product_relation"("p_org_id" "uuid", "p_product_id" "uuid", "p_relation_type" "public"."supplier_product_relation_type") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_id uuid;
begin
  select id into v_id
  from public.supplier_products
  where org_id = p_org_id
    and product_id = p_product_id
    and relation_type = p_relation_type;

  delete from public.supplier_products
  where org_id = p_org_id
    and product_id = p_product_id
    and relation_type = p_relation_type;

  if v_id is not null then
    perform public.rpc_log_audit_event(
      p_org_id,
      'supplier_product_removed',
      'supplier_product',
      v_id,
      null,
      jsonb_build_object(
        'product_id', p_product_id,
        'relation_type', p_relation_type
      ),
      null
    );
  end if;
end;
$$;


ALTER FUNCTION "public"."rpc_remove_supplier_product_relation"("p_org_id" "uuid", "p_product_id" "uuid", "p_relation_type" "public"."supplier_product_relation_type") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_set_safety_stock"("p_org_id" "uuid", "p_branch_id" "uuid", "p_product_id" "uuid", "p_safety_stock" numeric) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
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


ALTER FUNCTION "public"."rpc_set_safety_stock"("p_org_id" "uuid", "p_branch_id" "uuid", "p_product_id" "uuid", "p_safety_stock" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_set_special_order_status"("p_org_id" "uuid", "p_special_order_id" "uuid", "p_status" "public"."special_order_status") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
begin
  update public.client_special_orders
    set status = p_status
  where id = p_special_order_id and org_id = p_org_id;

  perform public.rpc_log_audit_event(
    p_org_id,
    'special_order_status_set',
    'special_order',
    p_special_order_id,
    null,
    jsonb_build_object('status', p_status),
    null
  );
end;
$$;


ALTER FUNCTION "public"."rpc_set_special_order_status"("p_org_id" "uuid", "p_special_order_id" "uuid", "p_status" "public"."special_order_status") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_set_staff_module_access"("p_org_id" "uuid", "p_branch_id" "uuid", "p_module_key" "text", "p_is_enabled" boolean, "p_role" "public"."user_role") RETURNS "void"
    LANGUAGE "sql"
    AS $$
  with upserted as (
    insert into public.staff_module_access (org_id, branch_id, role, module_key, is_enabled)
    values (p_org_id, p_branch_id, coalesce(p_role, 'staff'), p_module_key, p_is_enabled)
    on conflict (org_id, branch_id, role, module_key) do update set
      is_enabled = excluded.is_enabled
    returning id
  ), logged as (
    select public.rpc_log_audit_event(
      p_org_id,
      'staff_module_access_set',
      'staff_module_access',
      (select id from upserted),
      p_branch_id,
      jsonb_build_object(
        'module_key', p_module_key,
        'is_enabled', p_is_enabled,
        'role', coalesce(p_role, 'staff')
      ),
      null
    )
  )
  select null;
$$;


ALTER FUNCTION "public"."rpc_set_staff_module_access"("p_org_id" "uuid", "p_branch_id" "uuid", "p_module_key" "text", "p_is_enabled" boolean, "p_role" "public"."user_role") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_set_supplier_order_expected_receive_on"("p_org_id" "uuid", "p_order_id" "uuid", "p_expected_receive_on" "date") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_order record;
begin
  select id, branch_id, status, expected_receive_on
    into v_order
  from public.supplier_orders
  where id = p_order_id
    and org_id = p_org_id
  for update;

  if v_order is null then
    raise exception 'order not found';
  end if;

  if v_order.status not in ('sent', 'received') then
    raise exception 'expected receive date can be set only for sent/received orders';
  end if;

  update public.supplier_orders
    set expected_receive_on = p_expected_receive_on
  where id = p_order_id
    and org_id = p_org_id;

  perform public.rpc_log_audit_event(
    p_org_id,
    'supplier_order_expected_receive_on_set',
    'supplier_order',
    p_order_id,
    v_order.branch_id,
    jsonb_build_object(
      'old_expected_receive_on', v_order.expected_receive_on,
      'new_expected_receive_on', p_expected_receive_on,
      'status', v_order.status
    ),
    null
  );
end;
$$;


ALTER FUNCTION "public"."rpc_set_supplier_order_expected_receive_on"("p_org_id" "uuid", "p_order_id" "uuid", "p_expected_receive_on" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_set_supplier_order_status"("p_org_id" "uuid", "p_order_id" "uuid", "p_status" "public"."supplier_order_status") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
begin
  if p_status = 'sent' then
    update public.supplier_orders
      set status = p_status,
          sent_at = now()
    where id = p_order_id and org_id = p_org_id;
  elsif p_status = 'reconciled' then
    update public.supplier_orders
      set status = p_status,
          reconciled_at = now()
    where id = p_order_id and org_id = p_org_id;
  else
    update public.supplier_orders
      set status = p_status
    where id = p_order_id and org_id = p_org_id;
  end if;

  perform public.rpc_log_audit_event(
    p_org_id,
    'supplier_order_status_set',
    'supplier_order',
    p_order_id,
    null,
    jsonb_build_object('status', p_status),
    null
  );
end;
$$;


ALTER FUNCTION "public"."rpc_set_supplier_order_status"("p_org_id" "uuid", "p_order_id" "uuid", "p_status" "public"."supplier_order_status") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_set_supplier_payment_account_active"("p_org_id" "uuid", "p_account_id" "uuid", "p_is_active" boolean) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
declare
  v_account record;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if not public.is_org_admin_or_superadmin(p_org_id) then
    raise exception 'not authorized';
  end if;

  update public.supplier_payment_accounts
  set
    is_active = coalesce(p_is_active, false),
    updated_by = auth.uid(),
    updated_at = now()
  where id = p_account_id
    and org_id = p_org_id
  returning * into v_account;

  if v_account is null then
    raise exception 'account not found';
  end if;

  perform public.rpc_log_audit_event(
    p_org_id,
    'supplier_payment_account_status_set',
    'supplier_payment_account',
    p_account_id,
    null,
    jsonb_build_object(
      'supplier_id', v_account.supplier_id,
      'is_active', coalesce(p_is_active, false)
    ),
    auth.uid()
  );
end;
$$;


ALTER FUNCTION "public"."rpc_set_supplier_payment_account_active"("p_org_id" "uuid", "p_account_id" "uuid", "p_is_active" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_superadmin_create_org"("p_org_name" "text", "p_timezone" "text" DEFAULT 'UTC'::"text", "p_initial_branch_name" "text" DEFAULT 'Casa Central'::"text", "p_initial_branch_address" "text" DEFAULT NULL::"text", "p_owner_user_id" "uuid" DEFAULT NULL::"uuid", "p_owner_display_name" "text" DEFAULT NULL::"text") RETURNS TABLE("org_id" "uuid", "branch_id" "uuid", "owner_user_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
declare
  v_org_id uuid;
  v_branch_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if not public.is_platform_admin() then
    raise exception 'not authorized';
  end if;

  if coalesce(trim(p_org_name), '') = '' then
    raise exception 'org name required';
  end if;

  if coalesce(trim(p_initial_branch_name), '') = '' then
    raise exception 'initial branch name required';
  end if;

  if p_owner_user_id is null then
    raise exception 'owner user required';
  end if;

  if not exists (select 1 from auth.users u where u.id = p_owner_user_id) then
    raise exception 'owner user not found';
  end if;

  insert into public.orgs (name, timezone)
  values (trim(p_org_name), coalesce(nullif(trim(p_timezone), ''), 'UTC'))
  returning id into v_org_id;

  insert into public.branches (org_id, name, address)
  values (v_org_id, trim(p_initial_branch_name), nullif(trim(p_initial_branch_address), ''))
  returning id into v_branch_id;

  insert into public.org_preferences (org_id)
  values (v_org_id)
  on conflict on constraint org_preferences_pkey do nothing;

  insert into public.org_users (org_id, user_id, role, display_name, is_active)
  values (
    v_org_id,
    p_owner_user_id,
    'org_admin',
    nullif(trim(p_owner_display_name), ''),
    true
  )
  on conflict on constraint org_users_org_id_user_id_key
  do update set
    role = 'org_admin',
    is_active = true,
    display_name = coalesce(excluded.display_name, public.org_users.display_name);

  insert into public.branch_memberships (org_id, branch_id, user_id, is_active)
  values (v_org_id, v_branch_id, p_owner_user_id, true)
  on conflict on constraint branch_memberships_org_id_branch_id_user_id_key
  do update set is_active = true;

  return query
  select v_org_id, v_branch_id, p_owner_user_id;
end;
$$;


ALTER FUNCTION "public"."rpc_superadmin_create_org"("p_org_name" "text", "p_timezone" "text", "p_initial_branch_name" "text", "p_initial_branch_address" "text", "p_owner_user_id" "uuid", "p_owner_display_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_superadmin_set_active_org"("p_org_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if not public.is_platform_admin() then
    raise exception 'not authorized';
  end if;

  if not exists (select 1 from public.orgs where id = p_org_id) then
    raise exception 'org not found';
  end if;

  insert into public.user_active_orgs (user_id, active_org_id, updated_at)
  values (auth.uid(), p_org_id, now())
  on conflict (user_id)
  do update set active_org_id = excluded.active_org_id, updated_at = now();
end;
$$;


ALTER FUNCTION "public"."rpc_superadmin_set_active_org"("p_org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_superadmin_upsert_branch"("p_org_id" "uuid", "p_branch_id" "uuid", "p_name" "text", "p_address" "text" DEFAULT NULL::"text", "p_is_active" boolean DEFAULT true) RETURNS TABLE("branch_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
declare
  v_branch_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if not public.is_platform_admin() then
    raise exception 'not authorized';
  end if;

  if p_org_id is null then
    raise exception 'org required';
  end if;

  if coalesce(trim(p_name), '') = '' then
    raise exception 'branch name required';
  end if;

  if p_branch_id is null then
    insert into public.branches (org_id, name, address, is_active)
    values (p_org_id, trim(p_name), nullif(trim(p_address), ''), coalesce(p_is_active, true))
    returning id into v_branch_id;
  else
    update public.branches
    set
      name = trim(p_name),
      address = nullif(trim(p_address), ''),
      is_active = coalesce(p_is_active, is_active),
      updated_at = now()
    where id = p_branch_id
      and org_id = p_org_id
    returning id into v_branch_id;

    if v_branch_id is null then
      raise exception 'branch not found';
    end if;
  end if;

  return query select v_branch_id;
end;
$$;


ALTER FUNCTION "public"."rpc_superadmin_upsert_branch"("p_org_id" "uuid", "p_branch_id" "uuid", "p_name" "text", "p_address" "text", "p_is_active" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_sync_supplier_payable_from_order"("p_org_id" "uuid", "p_order_id" "uuid") RETURNS TABLE("payable_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
declare
  v_payable_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if not public.is_org_admin_or_superadmin(p_org_id) then
    raise exception 'not authorized';
  end if;

  v_payable_id := public.fn_sync_supplier_payable_from_order(
    p_org_id,
    p_order_id,
    auth.uid()
  );

  return query select v_payable_id;
end;
$$;


ALTER FUNCTION "public"."rpc_sync_supplier_payable_from_order"("p_org_id" "uuid", "p_order_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_update_expiration_batch_date"("p_org_id" "uuid", "p_batch_id" "uuid", "p_new_expires_on" "date", "p_reason" "text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
begin
  update public.expiration_batches
    set expires_on = p_new_expires_on
  where id = p_batch_id
    and org_id = p_org_id;

  perform public.rpc_log_audit_event(
    p_org_id,
    'expiration_batch_date_corrected',
    'expiration_batch',
    p_batch_id,
    null,
    jsonb_build_object(
      'new_expires_on', p_new_expires_on,
      'reason', coalesce(p_reason, '')
    ),
    null
  );
end;
$$;


ALTER FUNCTION "public"."rpc_update_expiration_batch_date"("p_org_id" "uuid", "p_batch_id" "uuid", "p_new_expires_on" "date", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_update_supplier_payable"("p_org_id" "uuid", "p_payable_id" "uuid", "p_invoice_amount" numeric DEFAULT NULL::numeric, "p_due_on" "date" DEFAULT NULL::"date", "p_invoice_reference" "text" DEFAULT NULL::"text", "p_invoice_photo_url" "text" DEFAULT NULL::"text", "p_invoice_note" "text" DEFAULT NULL::"text", "p_selected_payment_method" "public"."payment_method" DEFAULT NULL::"public"."payment_method") RETURNS TABLE("payable_id" "uuid", "status" "text", "outstanding_amount" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
declare
  v_payable record;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if not public.is_org_admin_or_superadmin(p_org_id) then
    raise exception 'not authorized';
  end if;

  if p_invoice_amount is not null and p_invoice_amount < 0 then
    raise exception 'invoice amount must be >= 0';
  end if;

  if p_selected_payment_method is not null
    and p_selected_payment_method not in ('cash', 'transfer') then
    raise exception 'invalid selected payment method';
  end if;

  update public.supplier_payables
  set
    invoice_amount = p_invoice_amount,
    due_on = p_due_on,
    invoice_reference = nullif(trim(coalesce(p_invoice_reference, '')), ''),
    invoice_photo_url = nullif(trim(coalesce(p_invoice_photo_url, '')), ''),
    invoice_note = nullif(trim(coalesce(p_invoice_note, '')), ''),
    selected_payment_method = p_selected_payment_method,
    updated_by = auth.uid(),
    updated_at = now()
  where id = p_payable_id
    and org_id = p_org_id
  returning * into v_payable;

  if v_payable is null then
    raise exception 'payable not found';
  end if;

  perform public.fn_recompute_supplier_payable(p_payable_id, auth.uid());

  select * into v_payable
  from public.supplier_payables
  where id = p_payable_id;

  perform public.rpc_log_audit_event(
    p_org_id,
    'supplier_payable_updated',
    'supplier_payable',
    p_payable_id,
    v_payable.branch_id,
    jsonb_build_object(
      'invoice_amount', v_payable.invoice_amount,
      'due_on', v_payable.due_on,
      'invoice_reference', v_payable.invoice_reference,
      'invoice_photo_url', v_payable.invoice_photo_url,
      'selected_payment_method', v_payable.selected_payment_method,
      'status', v_payable.status,
      'outstanding_amount', v_payable.outstanding_amount
    ),
    auth.uid()
  );

  return query
  select v_payable.id, v_payable.status, v_payable.outstanding_amount;
end;
$$;


ALTER FUNCTION "public"."rpc_update_supplier_payable"("p_org_id" "uuid", "p_payable_id" "uuid", "p_invoice_amount" numeric, "p_due_on" "date", "p_invoice_reference" "text", "p_invoice_photo_url" "text", "p_invoice_note" "text", "p_selected_payment_method" "public"."payment_method") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_update_user_membership"("p_org_id" "uuid", "p_user_id" "uuid", "p_role" "public"."user_role", "p_is_active" boolean, "p_display_name" "text", "p_branch_ids" "uuid"[]) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_branch_id uuid;
begin
  update public.org_users
    set role = p_role,
        is_active = coalesce(p_is_active, true),
        display_name = p_display_name
  where org_id = p_org_id and user_id = p_user_id;

  delete from public.branch_memberships
  where org_id = p_org_id and user_id = p_user_id;

  if p_role = 'staff' then
    foreach v_branch_id in array p_branch_ids loop
      insert into public.branch_memberships (org_id, branch_id, user_id)
      values (p_org_id, v_branch_id, p_user_id)
      on conflict (org_id, branch_id, user_id) do nothing;
    end loop;
  end if;

  perform public.rpc_log_audit_event(
    p_org_id,
    'user_membership_updated',
    'org_user',
    p_user_id,
    null,
    jsonb_build_object(
      'role', p_role,
      'is_active', coalesce(p_is_active, true),
      'display_name', p_display_name,
      'branch_ids', p_branch_ids
    ),
    null
  );
end;
$$;


ALTER FUNCTION "public"."rpc_update_user_membership"("p_org_id" "uuid", "p_user_id" "uuid", "p_role" "public"."user_role", "p_is_active" boolean, "p_display_name" "text", "p_branch_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_upsert_branch"("p_branch_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_address" "text", "p_is_active" boolean) RETURNS TABLE("branch_id" "uuid")
    LANGUAGE "sql"
    AS $$
  with upserted as (
    insert into public.branches (id, org_id, name, address, is_active)
    values (coalesce(p_branch_id, gen_random_uuid()), p_org_id, p_name, p_address, coalesce(p_is_active, true))
    on conflict (id) do update set
      name = excluded.name,
      address = excluded.address,
      is_active = excluded.is_active
    returning id
  ), logged as (
    select public.rpc_log_audit_event(
      p_org_id,
      'branch_upsert',
      'branch',
      (select id from upserted),
      (select id from upserted),
      jsonb_build_object(
        'name', p_name,
        'address', p_address,
        'is_active', coalesce(p_is_active, true)
      ),
      null
    )
  )
  select id from upserted;
$$;


ALTER FUNCTION "public"."rpc_upsert_branch"("p_branch_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_address" "text", "p_is_active" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_upsert_client"("p_client_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_phone" "text", "p_email" "text", "p_notes" "text", "p_is_active" boolean) RETURNS TABLE("client_id" "uuid")
    LANGUAGE "sql"
    AS $$
  with upserted as (
    insert into public.clients (
      id, org_id, name, phone, email, notes, is_active
    ) values (
      coalesce(p_client_id, gen_random_uuid()),
      p_org_id,
      p_name,
      p_phone,
      p_email,
      p_notes,
      coalesce(p_is_active, true)
    )
    on conflict (id) do update set
      name = excluded.name,
      phone = excluded.phone,
      email = excluded.email,
      notes = excluded.notes,
      is_active = excluded.is_active
    returning id
  ), logged as (
    select public.rpc_log_audit_event(
      p_org_id,
      'client_upsert',
      'client',
      (select id from upserted),
      null,
      jsonb_build_object(
        'name', p_name,
        'phone', p_phone,
        'email', p_email,
        'is_active', coalesce(p_is_active, true)
      ),
      null
    )
  )
  select id from upserted;
$$;


ALTER FUNCTION "public"."rpc_upsert_client"("p_client_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_phone" "text", "p_email" "text", "p_notes" "text", "p_is_active" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_upsert_product"("p_product_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_internal_code" "text", "p_barcode" "text", "p_sell_unit_type" "public"."sell_unit_type", "p_uom" "text", "p_unit_price" numeric, "p_is_active" boolean) RETURNS TABLE("product_id" "uuid")
    LANGUAGE "sql"
    AS $$
  with upserted as (
    insert into public.products (
      id, org_id, name, internal_code, barcode, sell_unit_type, uom, unit_price, is_active
    )
    values (
      coalesce(p_product_id, gen_random_uuid()),
      p_org_id,
      p_name,
      p_internal_code,
      p_barcode,
      p_sell_unit_type,
      p_uom,
      p_unit_price,
      coalesce(p_is_active, true)
    )
    on conflict (id) do update set
      name = excluded.name,
      internal_code = excluded.internal_code,
      barcode = excluded.barcode,
      sell_unit_type = excluded.sell_unit_type,
      uom = excluded.uom,
      unit_price = excluded.unit_price,
      is_active = excluded.is_active
    returning id
  ), logged as (
    select public.rpc_log_audit_event(
      p_org_id,
      'product_upsert',
      'product',
      (select id from upserted),
      null,
      jsonb_build_object(
        'name', p_name,
        'internal_code', nullif(p_internal_code, ''),
        'barcode', nullif(p_barcode, ''),
        'sell_unit_type', p_sell_unit_type,
        'uom', p_uom,
        'unit_price', p_unit_price,
        'is_active', coalesce(p_is_active, true)
      ),
      null
    )
  )
  select id from upserted;
$$;


ALTER FUNCTION "public"."rpc_upsert_product"("p_product_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_internal_code" "text", "p_barcode" "text", "p_sell_unit_type" "public"."sell_unit_type", "p_uom" "text", "p_unit_price" numeric, "p_is_active" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_upsert_product"("p_product_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_internal_code" "text", "p_barcode" "text", "p_sell_unit_type" "public"."sell_unit_type", "p_uom" "text", "p_unit_price" numeric, "p_is_active" boolean, "p_shelf_life_days" integer DEFAULT NULL::integer) RETURNS TABLE("product_id" "uuid")
    LANGUAGE "sql"
    AS $$
  with upserted as (
    insert into public.products (
      id,
      org_id,
      name,
      internal_code,
      barcode,
      sell_unit_type,
      uom,
      unit_price,
      is_active,
      shelf_life_days
    )
    values (
      coalesce(p_product_id, gen_random_uuid()),
      p_org_id,
      p_name,
      p_internal_code,
      p_barcode,
      p_sell_unit_type,
      p_uom,
      p_unit_price,
      coalesce(p_is_active, true),
      p_shelf_life_days
    )
    on conflict (id) do update set
      name = excluded.name,
      internal_code = excluded.internal_code,
      barcode = excluded.barcode,
      sell_unit_type = excluded.sell_unit_type,
      uom = excluded.uom,
      unit_price = excluded.unit_price,
      is_active = excluded.is_active,
      shelf_life_days = excluded.shelf_life_days
    returning id
  ), logged as (
    select public.rpc_log_audit_event(
      p_org_id,
      'product_upsert',
      'product',
      (select id from upserted),
      null,
      jsonb_build_object(
        'name', p_name,
        'internal_code', p_internal_code,
        'barcode', p_barcode,
        'sell_unit_type', p_sell_unit_type,
        'uom', p_uom,
        'unit_price', p_unit_price,
        'is_active', p_is_active,
        'shelf_life_days', p_shelf_life_days
      ),
      null
    )
  )
  select id from upserted;
$$;


ALTER FUNCTION "public"."rpc_upsert_product"("p_product_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_internal_code" "text", "p_barcode" "text", "p_sell_unit_type" "public"."sell_unit_type", "p_uom" "text", "p_unit_price" numeric, "p_is_active" boolean, "p_shelf_life_days" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_upsert_supplier"("p_supplier_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_contact_name" "text", "p_phone" "text", "p_email" "text", "p_notes" "text", "p_is_active" boolean) RETURNS TABLE("supplier_id" "uuid")
    LANGUAGE "sql"
    AS $$
  with upserted as (
    insert into public.suppliers (
      id, org_id, name, contact_name, phone, email, notes, is_active
    ) values (
      coalesce(p_supplier_id, gen_random_uuid()),
      p_org_id,
      p_name,
      p_contact_name,
      p_phone,
      p_email,
      p_notes,
      coalesce(p_is_active, true)
    )
    on conflict (id) do update set
      name = excluded.name,
      contact_name = excluded.contact_name,
      phone = excluded.phone,
      email = excluded.email,
      notes = excluded.notes,
      is_active = excluded.is_active
    returning id
  ), logged as (
    select public.rpc_log_audit_event(
      p_org_id,
      'supplier_upsert',
      'supplier',
      (select id from upserted),
      null,
      jsonb_build_object(
        'name', p_name,
        'contact_name', p_contact_name,
        'phone', p_phone,
        'email', p_email,
        'is_active', coalesce(p_is_active, true)
      ),
      null
    )
  )
  select id from upserted;
$$;


ALTER FUNCTION "public"."rpc_upsert_supplier"("p_supplier_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_contact_name" "text", "p_phone" "text", "p_email" "text", "p_notes" "text", "p_is_active" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_upsert_supplier"("p_supplier_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_contact_name" "text", "p_phone" "text", "p_email" "text", "p_notes" "text", "p_is_active" boolean, "p_order_frequency" "public"."order_frequency" DEFAULT NULL::"public"."order_frequency", "p_order_day" "public"."weekday" DEFAULT NULL::"public"."weekday", "p_receive_day" "public"."weekday" DEFAULT NULL::"public"."weekday") RETURNS TABLE("supplier_id" "uuid")
    LANGUAGE "plpgsql"
    AS $$
declare
  v_supplier_id uuid;
begin
  insert into public.suppliers (
    id,
    org_id,
    name,
    contact_name,
    phone,
    email,
    notes,
    is_active,
    order_frequency,
    order_day,
    receive_day
  ) values (
    coalesce(p_supplier_id, gen_random_uuid()),
    p_org_id,
    p_name,
    p_contact_name,
    p_phone,
    p_email,
    p_notes,
    coalesce(p_is_active, true),
    p_order_frequency,
    p_order_day,
    p_receive_day
  )
  on conflict (id) do update set
    name = excluded.name,
    contact_name = excluded.contact_name,
    phone = excluded.phone,
    email = excluded.email,
    notes = excluded.notes,
    is_active = excluded.is_active,
    order_frequency = excluded.order_frequency,
    order_day = excluded.order_day,
    receive_day = excluded.receive_day
  returning id into v_supplier_id;

  perform public.rpc_log_audit_event(
    p_org_id,
    'supplier_upsert',
    'supplier',
    v_supplier_id,
    null,
    jsonb_build_object(
      'name', p_name,
      'contact_name', p_contact_name,
      'phone', p_phone,
      'email', p_email,
      'is_active', coalesce(p_is_active, true),
      'order_frequency', p_order_frequency,
      'order_day', p_order_day,
      'receive_day', p_receive_day
    ),
    null
  );

  return query select v_supplier_id;
end;
$$;


ALTER FUNCTION "public"."rpc_upsert_supplier"("p_supplier_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_contact_name" "text", "p_phone" "text", "p_email" "text", "p_notes" "text", "p_is_active" boolean, "p_order_frequency" "public"."order_frequency", "p_order_day" "public"."weekday", "p_receive_day" "public"."weekday") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_upsert_supplier"("p_supplier_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_contact_name" "text", "p_phone" "text", "p_email" "text", "p_notes" "text", "p_is_active" boolean, "p_order_frequency" "public"."order_frequency" DEFAULT NULL::"public"."order_frequency", "p_order_day" "public"."weekday" DEFAULT NULL::"public"."weekday", "p_receive_day" "public"."weekday" DEFAULT NULL::"public"."weekday", "p_payment_terms_days" integer DEFAULT NULL::integer, "p_preferred_payment_method" "public"."payment_method" DEFAULT NULL::"public"."payment_method", "p_accepts_cash" boolean DEFAULT true, "p_accepts_transfer" boolean DEFAULT true, "p_payment_note" "text" DEFAULT NULL::"text") RETURNS TABLE("supplier_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
declare
  v_supplier_id uuid;
  v_accepts_cash boolean := coalesce(p_accepts_cash, true);
  v_accepts_transfer boolean := coalesce(p_accepts_transfer, true);
  v_preferred public.payment_method := p_preferred_payment_method;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if not public.is_org_admin_or_superadmin(p_org_id) then
    raise exception 'not authorized';
  end if;

  if coalesce(trim(p_name), '') = '' then
    raise exception 'supplier name required';
  end if;

  if p_payment_terms_days is not null and p_payment_terms_days < 0 then
    raise exception 'payment terms must be >= 0';
  end if;

  if not (v_accepts_cash or v_accepts_transfer) then
    raise exception 'supplier must accept at least one payment method';
  end if;

  if v_preferred is not null and v_preferred not in ('cash', 'transfer') then
    raise exception 'preferred payment method must be cash or transfer';
  end if;

  if v_preferred = 'cash' and not v_accepts_cash then
    raise exception 'preferred payment method cash must be enabled in accepts_cash';
  end if;

  if v_preferred = 'transfer' and not v_accepts_transfer then
    raise exception 'preferred payment method transfer must be enabled in accepts_transfer';
  end if;

  insert into public.suppliers (
    id,
    org_id,
    name,
    contact_name,
    phone,
    email,
    notes,
    is_active,
    order_frequency,
    order_day,
    receive_day,
    payment_terms_days,
    preferred_payment_method,
    accepts_cash,
    accepts_transfer,
    payment_note
  ) values (
    coalesce(p_supplier_id, gen_random_uuid()),
    p_org_id,
    trim(p_name),
    nullif(trim(coalesce(p_contact_name, '')), ''),
    nullif(trim(coalesce(p_phone, '')), ''),
    nullif(trim(coalesce(p_email, '')), ''),
    nullif(trim(coalesce(p_notes, '')), ''),
    coalesce(p_is_active, true),
    p_order_frequency,
    p_order_day,
    p_receive_day,
    p_payment_terms_days,
    v_preferred,
    v_accepts_cash,
    v_accepts_transfer,
    nullif(trim(coalesce(p_payment_note, '')), '')
  )
  on conflict (id) do update set
    name = excluded.name,
    contact_name = excluded.contact_name,
    phone = excluded.phone,
    email = excluded.email,
    notes = excluded.notes,
    is_active = excluded.is_active,
    order_frequency = excluded.order_frequency,
    order_day = excluded.order_day,
    receive_day = excluded.receive_day,
    payment_terms_days = excluded.payment_terms_days,
    preferred_payment_method = excluded.preferred_payment_method,
    accepts_cash = excluded.accepts_cash,
    accepts_transfer = excluded.accepts_transfer,
    payment_note = excluded.payment_note
  returning id into v_supplier_id;

  perform public.rpc_log_audit_event(
    p_org_id,
    'supplier_upsert',
    'supplier',
    v_supplier_id,
    null,
    jsonb_build_object(
      'name', trim(p_name),
      'contact_name', nullif(trim(coalesce(p_contact_name, '')), ''),
      'phone', nullif(trim(coalesce(p_phone, '')), ''),
      'email', nullif(trim(coalesce(p_email, '')), ''),
      'is_active', coalesce(p_is_active, true),
      'order_frequency', p_order_frequency,
      'order_day', p_order_day,
      'receive_day', p_receive_day,
      'payment_terms_days', p_payment_terms_days,
      'preferred_payment_method', v_preferred,
      'accepts_cash', v_accepts_cash,
      'accepts_transfer', v_accepts_transfer,
      'payment_note', nullif(trim(coalesce(p_payment_note, '')), '')
    ),
    auth.uid()
  );

  return query select v_supplier_id;
end;
$$;


ALTER FUNCTION "public"."rpc_upsert_supplier"("p_supplier_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_contact_name" "text", "p_phone" "text", "p_email" "text", "p_notes" "text", "p_is_active" boolean, "p_order_frequency" "public"."order_frequency", "p_order_day" "public"."weekday", "p_receive_day" "public"."weekday", "p_payment_terms_days" integer, "p_preferred_payment_method" "public"."payment_method", "p_accepts_cash" boolean, "p_accepts_transfer" boolean, "p_payment_note" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_upsert_supplier_order_item"("p_org_id" "uuid", "p_order_id" "uuid", "p_product_id" "uuid", "p_ordered_qty" numeric, "p_unit_cost" numeric) RETURNS TABLE("order_item_id" "uuid")
    LANGUAGE "sql"
    AS $$
  with upserted as (
    insert into public.supplier_order_items (
      org_id, order_id, product_id, ordered_qty, unit_cost
    ) values (
      p_org_id, p_order_id, p_product_id, p_ordered_qty, p_unit_cost
    )
    on conflict (order_id, product_id) do update set
      ordered_qty = excluded.ordered_qty,
      unit_cost = excluded.unit_cost
    returning id
  ), logged as (
    select public.rpc_log_audit_event(
      p_org_id,
      'supplier_order_item_upsert',
      'supplier_order_item',
      (select id from upserted),
      null,
      jsonb_build_object(
        'order_id', p_order_id,
        'product_id', p_product_id,
        'ordered_qty', p_ordered_qty,
        'unit_cost', p_unit_cost
      ),
      null
    )
  )
  select id from upserted;
$$;


ALTER FUNCTION "public"."rpc_upsert_supplier_order_item"("p_org_id" "uuid", "p_order_id" "uuid", "p_product_id" "uuid", "p_ordered_qty" numeric, "p_unit_cost" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_upsert_supplier_payment_account"("p_org_id" "uuid", "p_supplier_id" "uuid", "p_account_id" "uuid" DEFAULT NULL::"uuid", "p_account_label" "text" DEFAULT NULL::"text", "p_bank_name" "text" DEFAULT NULL::"text", "p_account_holder_name" "text" DEFAULT NULL::"text", "p_account_identifier" "text" DEFAULT NULL::"text", "p_is_active" boolean DEFAULT true) RETURNS TABLE("account_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
declare
  v_account_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if not public.is_org_admin_or_superadmin(p_org_id) then
    raise exception 'not authorized';
  end if;

  if not exists (
    select 1
    from public.suppliers s
    where s.id = p_supplier_id
      and s.org_id = p_org_id
  ) then
    raise exception 'supplier not found';
  end if;

  insert into public.supplier_payment_accounts (
    id,
    org_id,
    supplier_id,
    account_label,
    bank_name,
    account_holder_name,
    account_identifier,
    is_active,
    created_by,
    updated_by,
    created_at,
    updated_at
  ) values (
    coalesce(p_account_id, gen_random_uuid()),
    p_org_id,
    p_supplier_id,
    nullif(trim(coalesce(p_account_label, '')), ''),
    nullif(trim(coalesce(p_bank_name, '')), ''),
    nullif(trim(coalesce(p_account_holder_name, '')), ''),
    nullif(trim(coalesce(p_account_identifier, '')), ''),
    coalesce(p_is_active, true),
    auth.uid(),
    auth.uid(),
    now(),
    now()
  )
  on conflict (id) do update set
    account_label = excluded.account_label,
    bank_name = excluded.bank_name,
    account_holder_name = excluded.account_holder_name,
    account_identifier = excluded.account_identifier,
    is_active = excluded.is_active,
    updated_by = auth.uid(),
    updated_at = now()
  returning id into v_account_id;

  perform public.rpc_log_audit_event(
    p_org_id,
    'supplier_payment_account_upsert',
    'supplier_payment_account',
    v_account_id,
    null,
    jsonb_build_object(
      'supplier_id', p_supplier_id,
      'account_label', nullif(trim(coalesce(p_account_label, '')), ''),
      'bank_name', nullif(trim(coalesce(p_bank_name, '')), ''),
      'account_identifier', nullif(trim(coalesce(p_account_identifier, '')), ''),
      'is_active', coalesce(p_is_active, true)
    ),
    auth.uid()
  );

  return query select v_account_id;
end;
$$;


ALTER FUNCTION "public"."rpc_upsert_supplier_payment_account"("p_org_id" "uuid", "p_supplier_id" "uuid", "p_account_id" "uuid", "p_account_label" "text", "p_bank_name" "text", "p_account_holder_name" "text", "p_account_identifier" "text", "p_is_active" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_upsert_supplier_product"("p_org_id" "uuid", "p_supplier_id" "uuid", "p_product_id" "uuid", "p_supplier_sku" "text", "p_supplier_product_name" "text") RETURNS TABLE("id" "uuid")
    LANGUAGE "sql"
    AS $$
  with upserted as (
    insert into public.supplier_products (
      org_id, supplier_id, product_id, supplier_sku, supplier_product_name
    ) values (
      p_org_id, p_supplier_id, p_product_id, p_supplier_sku, p_supplier_product_name
    )
    on conflict (org_id, supplier_id, product_id) do update set
      supplier_sku = excluded.supplier_sku,
      supplier_product_name = excluded.supplier_product_name
    returning id
  ), logged as (
    select public.rpc_log_audit_event(
      p_org_id,
      'supplier_product_upsert',
      'supplier_product',
      (select id from upserted),
      null,
      jsonb_build_object(
        'supplier_id', p_supplier_id,
        'product_id', p_product_id,
        'supplier_sku', p_supplier_sku,
        'supplier_product_name', p_supplier_product_name
      ),
      null
    )
  )
  select id from upserted;
$$;


ALTER FUNCTION "public"."rpc_upsert_supplier_product"("p_org_id" "uuid", "p_supplier_id" "uuid", "p_product_id" "uuid", "p_supplier_sku" "text", "p_supplier_product_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_upsert_supplier_product"("p_org_id" "uuid", "p_supplier_id" "uuid", "p_product_id" "uuid", "p_supplier_sku" "text", "p_supplier_product_name" "text", "p_relation_type" "public"."supplier_product_relation_type" DEFAULT 'primary'::"public"."supplier_product_relation_type") RETURNS TABLE("id" "uuid")
    LANGUAGE "sql"
    AS $$
  with upserted as (
    insert into public.supplier_products (
      org_id, supplier_id, product_id, supplier_sku, supplier_product_name, relation_type
    ) values (
      p_org_id, p_supplier_id, p_product_id, p_supplier_sku, p_supplier_product_name, p_relation_type
    )
    on conflict (org_id, product_id, relation_type) do update set
      supplier_id = excluded.supplier_id,
      supplier_sku = excluded.supplier_sku,
      supplier_product_name = excluded.supplier_product_name,
      relation_type = excluded.relation_type
    returning id
  ), logged as (
    select public.rpc_log_audit_event(
      p_org_id,
      'supplier_product_upsert',
      'supplier_product',
      (select id from upserted),
      null,
      jsonb_build_object(
        'supplier_id', p_supplier_id,
        'product_id', p_product_id,
        'supplier_sku', p_supplier_sku,
        'supplier_product_name', p_supplier_product_name,
        'relation_type', p_relation_type
      ),
      null
    )
  )
  select id from upserted;
$$;


ALTER FUNCTION "public"."rpc_upsert_supplier_product"("p_org_id" "uuid", "p_supplier_id" "uuid", "p_product_id" "uuid", "p_supplier_sku" "text", "p_supplier_product_name" "text", "p_relation_type" "public"."supplier_product_relation_type") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_seed_pos_payment_devices_for_branch"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  insert into public.pos_payment_devices (
    org_id,
    branch_id,
    device_name,
    provider,
    is_active
  ) values
    (new.org_id, new.id, 'Posnet principal', 'posnet', true),
    (new.org_id, new.id, 'MercadoPago principal', 'mercadopago', true)
  on conflict (org_id, branch_id, device_name) do nothing;

  return new;
end;
$$;


ALTER FUNCTION "public"."trg_seed_pos_payment_devices_for_branch"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_sync_supplier_payable_from_order"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
begin
  if new.status in ('sent', 'received', 'reconciled') then
    perform public.fn_sync_supplier_payable_from_order(
      new.org_id,
      new.id,
      coalesce(new.created_by, auth.uid())
    );
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."trg_sync_supplier_payable_from_order"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."audit_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "actor_user_id" "uuid" NOT NULL,
    "branch_id" "uuid",
    "action_key" "text" NOT NULL,
    "entity_type" "text" NOT NULL,
    "entity_id" "uuid",
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."audit_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."branch_memberships" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "branch_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."branch_memberships" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."branches" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "address" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."branches" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cash_session_count_lines" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "branch_id" "uuid" NOT NULL,
    "session_id" "uuid" NOT NULL,
    "denomination_value" numeric(12,2) NOT NULL,
    "quantity" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "count_scope" "text" DEFAULT 'closing_drawer'::"text" NOT NULL,
    CONSTRAINT "cash_session_count_lines_denom_positive_ck" CHECK (("denomination_value" > (0)::numeric)),
    CONSTRAINT "cash_session_count_lines_quantity_non_negative_ck" CHECK (("quantity" >= 0)),
    CONSTRAINT "cash_session_count_lines_scope_ck" CHECK (("count_scope" = ANY (ARRAY['opening_drawer'::"text", 'opening_reserve'::"text", 'closing_drawer'::"text", 'closing_reserve'::"text"])))
);


ALTER TABLE "public"."cash_session_count_lines" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cash_session_movements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "branch_id" "uuid" NOT NULL,
    "session_id" "uuid" NOT NULL,
    "movement_type" "text" NOT NULL,
    "category_key" "text" NOT NULL,
    "amount" numeric(12,2) NOT NULL,
    "note" "text",
    "movement_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "supplier_payment_id" "uuid",
    CONSTRAINT "cash_session_movements_amount_positive_ck" CHECK (("amount" > (0)::numeric)),
    CONSTRAINT "cash_session_movements_movement_type_ck" CHECK (("movement_type" = ANY (ARRAY['expense'::"text", 'income'::"text"])))
);


ALTER TABLE "public"."cash_session_movements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cash_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "branch_id" "uuid" NOT NULL,
    "opened_by" "uuid" NOT NULL,
    "closed_by" "uuid",
    "period_type" "text" DEFAULT 'shift'::"text" NOT NULL,
    "session_label" "text",
    "status" "text" DEFAULT 'open'::"text" NOT NULL,
    "opening_cash_amount" numeric(12,2) DEFAULT 0 NOT NULL,
    "expected_cash_amount" numeric(12,2),
    "counted_cash_amount" numeric(12,2),
    "difference_amount" numeric(12,2),
    "close_note" "text",
    "opened_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "closed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "closed_controlled_by_name" "text",
    "close_confirmed" boolean DEFAULT false NOT NULL,
    "opening_reserve_amount" numeric(12,2) DEFAULT 0 NOT NULL,
    "closing_drawer_amount" numeric(12,2),
    "closing_reserve_amount" numeric(12,2),
    CONSTRAINT "cash_sessions_closing_drawer_amount_ck" CHECK ((("closing_drawer_amount" IS NULL) OR ("closing_drawer_amount" >= (0)::numeric))),
    CONSTRAINT "cash_sessions_closing_reserve_amount_ck" CHECK ((("closing_reserve_amount" IS NULL) OR ("closing_reserve_amount" >= (0)::numeric))),
    CONSTRAINT "cash_sessions_counted_cash_amount_ck" CHECK ((("counted_cash_amount" IS NULL) OR ("counted_cash_amount" >= (0)::numeric))),
    CONSTRAINT "cash_sessions_expected_cash_amount_ck" CHECK ((("expected_cash_amount" IS NULL) OR ("expected_cash_amount" >= (0)::numeric))),
    CONSTRAINT "cash_sessions_opening_cash_amount_ck" CHECK (("opening_cash_amount" >= (0)::numeric)),
    CONSTRAINT "cash_sessions_opening_reserve_amount_ck" CHECK (("opening_reserve_amount" >= (0)::numeric)),
    CONSTRAINT "cash_sessions_period_type_ck" CHECK (("period_type" = ANY (ARRAY['shift'::"text", 'day'::"text"]))),
    CONSTRAINT "cash_sessions_status_ck" CHECK (("status" = ANY (ARRAY['open'::"text", 'closed'::"text"])))
);


ALTER TABLE "public"."cash_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."client_special_order_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "special_order_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "supplier_id" "uuid",
    "supplier_order_id" "uuid",
    "requested_qty" numeric(14,3) NOT NULL,
    "fulfilled_qty" numeric(14,3) DEFAULT 0 NOT NULL,
    "is_ordered" boolean DEFAULT false NOT NULL,
    "ordered_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."client_special_order_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."client_special_orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "branch_id" "uuid" NOT NULL,
    "client_id" "uuid" NOT NULL,
    "description" "text",
    "quantity" numeric(14,3),
    "status" "public"."special_order_status" DEFAULT 'pending'::"public"."special_order_status" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "notes" "text"
);


ALTER TABLE "public"."client_special_orders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."clients" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "phone" "text",
    "email" "text",
    "notes" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."clients" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."expiration_batches" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "branch_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "expires_on" "date" NOT NULL,
    "quantity" numeric(14,3) NOT NULL,
    "source_type" "text" NOT NULL,
    "source_ref_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "batch_code" "text"
);


ALTER TABLE "public"."expiration_batches" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."expiration_waste" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "branch_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "batch_id" "uuid",
    "quantity" numeric(14,3) NOT NULL,
    "unit_price_snapshot" numeric(12,2) DEFAULT 0 NOT NULL,
    "total_amount" numeric(12,2) DEFAULT 0 NOT NULL,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."expiration_waste" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."org_preferences" (
    "org_id" "uuid" NOT NULL,
    "critical_days" integer DEFAULT 3 NOT NULL,
    "warning_days" integer DEFAULT 7 NOT NULL,
    "allow_negative_stock" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "cash_discount_enabled" boolean DEFAULT true NOT NULL,
    "cash_discount_default_pct" numeric(5,2) DEFAULT 10 NOT NULL,
    "cash_denominations" "jsonb" DEFAULT '[100, 200, 500, 1000, 2000, 10000, 20000]'::"jsonb" NOT NULL,
    CONSTRAINT "org_preferences_cash_denominations_array_ck" CHECK (("jsonb_typeof"("cash_denominations") = 'array'::"text")),
    CONSTRAINT "org_preferences_cash_discount_default_pct_ck" CHECK ((("cash_discount_default_pct" >= (0)::numeric) AND ("cash_discount_default_pct" <= (100)::numeric)))
);


ALTER TABLE "public"."org_preferences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."org_users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "public"."user_role" NOT NULL,
    "display_name" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."org_users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."orgs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "timezone" "text" DEFAULT 'UTC'::"text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."orgs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."platform_admins" (
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid"
);


ALTER TABLE "public"."platform_admins" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pos_payment_devices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "branch_id" "uuid" NOT NULL,
    "device_name" "text" NOT NULL,
    "provider" "text" DEFAULT 'posnet'::"text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_by" "uuid",
    "updated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "pos_payment_devices_device_name_not_blank_ck" CHECK (("length"(TRIM(BOTH FROM "device_name")) > 0)),
    CONSTRAINT "pos_payment_devices_provider_ck" CHECK (("provider" = ANY (ARRAY['posnet'::"text", 'mercadopago'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."pos_payment_devices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "internal_code" "text",
    "barcode" "text",
    "sell_unit_type" "public"."sell_unit_type" NOT NULL,
    "uom" "text" NOT NULL,
    "unit_price" numeric(12,2) DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "shelf_life_days" integer,
    CONSTRAINT "products_shelf_life_days_nonnegative" CHECK ((("shelf_life_days" IS NULL) OR ("shelf_life_days" >= 0)))
);


ALTER TABLE "public"."products" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sale_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "sale_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "product_name_snapshot" "text" NOT NULL,
    "unit_price_snapshot" numeric(12,2) NOT NULL,
    "quantity" numeric(14,3) NOT NULL,
    "line_total" numeric(12,2) NOT NULL
);


ALTER TABLE "public"."sale_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sale_payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "sale_id" "uuid" NOT NULL,
    "payment_method" "public"."payment_method" NOT NULL,
    "amount" numeric(12,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "payment_device_id" "uuid",
    CONSTRAINT "sale_payments_amount_positive_ck" CHECK (("amount" > (0)::numeric)),
    CONSTRAINT "sale_payments_method_not_mixed_ck" CHECK ((("payment_method")::"text" <> 'mixed'::"text"))
);


ALTER TABLE "public"."sale_payments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sales" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "branch_id" "uuid" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "payment_method" "public"."payment_method" NOT NULL,
    "total_amount" numeric(12,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "subtotal_amount" numeric(12,2) DEFAULT 0 NOT NULL,
    "discount_amount" numeric(12,2) DEFAULT 0 NOT NULL,
    "discount_pct" numeric(5,2) DEFAULT 0 NOT NULL,
    CONSTRAINT "sales_discount_amount_range_ck" CHECK ((("discount_amount" >= (0)::numeric) AND ("discount_amount" <= "subtotal_amount"))),
    CONSTRAINT "sales_discount_pct_range_ck" CHECK ((("discount_pct" >= (0)::numeric) AND ("discount_pct" <= (100)::numeric)))
);


ALTER TABLE "public"."sales" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."staff_module_access" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "branch_id" "uuid",
    "role" "public"."user_role" DEFAULT 'staff'::"public"."user_role" NOT NULL,
    "module_key" "text" NOT NULL,
    "is_enabled" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."staff_module_access" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stock_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "branch_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "quantity_on_hand" numeric(14,3) DEFAULT 0 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "safety_stock" numeric(14,3) DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."stock_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stock_movements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "branch_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "movement_type" "public"."stock_movement_type" NOT NULL,
    "quantity_delta" numeric(14,3) NOT NULL,
    "reason" "text",
    "source_type" "text",
    "source_id" "uuid",
    "expiration_batch_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."stock_movements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."supplier_order_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "order_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "ordered_qty" numeric(14,3) NOT NULL,
    "received_qty" numeric(14,3) DEFAULT 0 NOT NULL,
    "unit_cost" numeric(12,2),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."supplier_order_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."supplier_orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "branch_id" "uuid" NOT NULL,
    "supplier_id" "uuid" NOT NULL,
    "status" "public"."supplier_order_status" DEFAULT 'draft'::"public"."supplier_order_status" NOT NULL,
    "notes" "text",
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "sent_at" timestamp with time zone,
    "received_at" timestamp with time zone,
    "reconciled_at" timestamp with time zone,
    "controlled_by_user_id" "uuid",
    "controlled_by_name" "text",
    "expected_receive_on" "date"
);


ALTER TABLE "public"."supplier_orders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."supplier_payables" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "branch_id" "uuid" NOT NULL,
    "supplier_id" "uuid" NOT NULL,
    "order_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "estimated_amount" numeric(12,2) DEFAULT 0 NOT NULL,
    "invoice_amount" numeric(12,2),
    "paid_amount" numeric(12,2) DEFAULT 0 NOT NULL,
    "outstanding_amount" numeric(12,2) DEFAULT 0 NOT NULL,
    "due_on" "date",
    "payment_terms_days_snapshot" integer,
    "preferred_payment_method" "public"."payment_method",
    "selected_payment_method" "public"."payment_method",
    "invoice_photo_url" "text",
    "invoice_note" "text",
    "paid_at" timestamp with time zone,
    "created_by" "uuid",
    "updated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "invoice_reference" "text",
    CONSTRAINT "supplier_payables_estimated_amount_ck" CHECK (("estimated_amount" >= (0)::numeric)),
    CONSTRAINT "supplier_payables_invoice_amount_ck" CHECK ((("invoice_amount" IS NULL) OR ("invoice_amount" >= (0)::numeric))),
    CONSTRAINT "supplier_payables_outstanding_amount_ck" CHECK (("outstanding_amount" >= (0)::numeric)),
    CONSTRAINT "supplier_payables_paid_amount_ck" CHECK (("paid_amount" >= (0)::numeric)),
    CONSTRAINT "supplier_payables_payment_terms_snapshot_ck" CHECK ((("payment_terms_days_snapshot" IS NULL) OR ("payment_terms_days_snapshot" >= 0))),
    CONSTRAINT "supplier_payables_preferred_payment_method_ck" CHECK ((("preferred_payment_method" IS NULL) OR ("preferred_payment_method" = ANY (ARRAY['cash'::"public"."payment_method", 'transfer'::"public"."payment_method"])))),
    CONSTRAINT "supplier_payables_selected_payment_method_ck" CHECK ((("selected_payment_method" IS NULL) OR ("selected_payment_method" = ANY (ARRAY['cash'::"public"."payment_method", 'transfer'::"public"."payment_method"])))),
    CONSTRAINT "supplier_payables_status_ck" CHECK (("status" = ANY (ARRAY['pending'::"text", 'partial'::"text", 'paid'::"text"])))
);


ALTER TABLE "public"."supplier_payables" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."supplier_payment_accounts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "supplier_id" "uuid" NOT NULL,
    "account_label" "text",
    "bank_name" "text",
    "account_holder_name" "text",
    "account_identifier" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "updated_by" "uuid"
);


ALTER TABLE "public"."supplier_payment_accounts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."supplier_payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "branch_id" "uuid" NOT NULL,
    "supplier_id" "uuid" NOT NULL,
    "payable_id" "uuid" NOT NULL,
    "order_id" "uuid" NOT NULL,
    "payment_method" "public"."payment_method" NOT NULL,
    "transfer_account_id" "uuid",
    "amount" numeric(12,2) NOT NULL,
    "paid_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "reference" "text",
    "note" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "supplier_payments_amount_positive_ck" CHECK (("amount" > (0)::numeric)),
    CONSTRAINT "supplier_payments_method_ck" CHECK (("payment_method" = ANY (ARRAY['cash'::"public"."payment_method", 'transfer'::"public"."payment_method"])))
);


ALTER TABLE "public"."supplier_payments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."supplier_products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "supplier_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "supplier_sku" "text",
    "supplier_product_name" "text",
    "default_purchase_uom" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "relation_type" "public"."supplier_product_relation_type" DEFAULT 'primary'::"public"."supplier_product_relation_type" NOT NULL
);


ALTER TABLE "public"."supplier_products" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."suppliers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "contact_name" "text",
    "phone" "text",
    "email" "text",
    "notes" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "order_frequency" "public"."order_frequency",
    "order_day" "public"."weekday",
    "receive_day" "public"."weekday",
    "payment_terms_days" integer,
    "preferred_payment_method" "public"."payment_method",
    "accepts_cash" boolean DEFAULT true NOT NULL,
    "accepts_transfer" boolean DEFAULT true NOT NULL,
    "payment_note" "text",
    CONSTRAINT "suppliers_accepts_any_payment_method_ck" CHECK (("accepts_cash" OR "accepts_transfer")),
    CONSTRAINT "suppliers_payment_terms_days_nonnegative_ck" CHECK ((("payment_terms_days" IS NULL) OR ("payment_terms_days" >= 0))),
    CONSTRAINT "suppliers_preferred_payment_method_ck" CHECK ((("preferred_payment_method" IS NULL) OR ("preferred_payment_method" = ANY (ARRAY['cash'::"public"."payment_method", 'transfer'::"public"."payment_method"]))))
);


ALTER TABLE "public"."suppliers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_active_orgs" (
    "user_id" "uuid" NOT NULL,
    "active_org_id" "uuid" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_active_orgs" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_audit_log_admin" WITH ("security_invoker"='true') AS
 SELECT "al"."id",
    "al"."org_id",
    "al"."branch_id",
    "b"."name" AS "branch_name",
    "al"."created_at",
    "al"."action_key",
    "al"."entity_type",
    "al"."entity_id",
    "al"."actor_user_id",
    "ou"."display_name" AS "actor_display_name",
    "ou"."role" AS "actor_role",
    "al"."metadata"
   FROM (("public"."audit_log" "al"
     LEFT JOIN "public"."org_users" "ou" ON ((("ou"."org_id" = "al"."org_id") AND ("ou"."user_id" = "al"."actor_user_id"))))
     LEFT JOIN "public"."branches" "b" ON (("b"."id" = "al"."branch_id")));


ALTER VIEW "public"."v_audit_log_admin" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_branches_admin" AS
 SELECT "b"."id" AS "branch_id",
    "b"."org_id",
    "b"."name",
    "b"."address",
    "b"."is_active",
    "b"."created_at",
    "b"."updated_at",
    COALESCE("m"."members_count", (0)::bigint) AS "members_count"
   FROM ("public"."branches" "b"
     LEFT JOIN ( SELECT "branch_memberships"."branch_id",
            "count"(*) AS "members_count"
           FROM "public"."branch_memberships"
          WHERE ("branch_memberships"."is_active" = true)
          GROUP BY "branch_memberships"."branch_id") "m" ON (("m"."branch_id" = "b"."id")));


ALTER VIEW "public"."v_branches_admin" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_cashbox_session_current" AS
 WITH "sales_by_method" AS (
         SELECT "cs_1"."id" AS "session_id",
            COALESCE("sum"("sp"."amount") FILTER (WHERE ("sp"."payment_method" = 'cash'::"public"."payment_method")), (0)::numeric) AS "cash_sales_amount",
            COALESCE("sum"("sp"."amount") FILTER (WHERE (("sp"."payment_method")::"text" = ANY (ARRAY['card'::"text", 'debit'::"text", 'credit'::"text"]))), (0)::numeric) AS "card_sales_amount",
            COALESCE("sum"("sp"."amount") FILTER (WHERE (("sp"."payment_method")::"text" = 'mercadopago'::"text")), (0)::numeric) AS "mercadopago_sales_amount"
           FROM (("public"."cash_sessions" "cs_1"
             LEFT JOIN "public"."sales" "s" ON ((("s"."org_id" = "cs_1"."org_id") AND ("s"."branch_id" = "cs_1"."branch_id") AND ("s"."created_at" >= "cs_1"."opened_at") AND ("s"."created_at" <= COALESCE("cs_1"."closed_at", "now"())))))
             LEFT JOIN "public"."sale_payments" "sp" ON (("sp"."sale_id" = "s"."id")))
          GROUP BY "cs_1"."id"
        ), "movement_totals" AS (
         SELECT "csm"."session_id",
            COALESCE("sum"(
                CASE
                    WHEN ("csm"."movement_type" = 'income'::"text") THEN "csm"."amount"
                    ELSE (0)::numeric
                END), (0)::numeric) AS "manual_income_amount",
            COALESCE("sum"(
                CASE
                    WHEN ("csm"."movement_type" = 'expense'::"text") THEN "csm"."amount"
                    ELSE (0)::numeric
                END), (0)::numeric) AS "manual_expense_amount",
            "count"(*) AS "movements_count"
           FROM "public"."cash_session_movements" "csm"
          GROUP BY "csm"."session_id"
        )
 SELECT "cs"."id" AS "session_id",
    "cs"."org_id",
    "cs"."branch_id",
    "cs"."status",
    "cs"."period_type",
    "cs"."session_label",
    "cs"."opening_cash_amount",
    "cs"."opening_reserve_amount",
    "cs"."closing_drawer_amount",
    "cs"."closing_reserve_amount",
    COALESCE("sbm"."cash_sales_amount", (0)::numeric) AS "cash_sales_amount",
    COALESCE("sbm"."card_sales_amount", (0)::numeric) AS "card_sales_amount",
    COALESCE("sbm"."mercadopago_sales_amount", (0)::numeric) AS "mercadopago_sales_amount",
    COALESCE("mt"."manual_income_amount", (0)::numeric) AS "manual_income_amount",
    COALESCE("mt"."manual_expense_amount", (0)::numeric) AS "manual_expense_amount",
    ((((("cs"."opening_cash_amount" + "cs"."opening_reserve_amount") + COALESCE("sbm"."cash_sales_amount", (0)::numeric)) + COALESCE("mt"."manual_income_amount", (0)::numeric)) - COALESCE("mt"."manual_expense_amount", (0)::numeric)))::numeric(12,2) AS "expected_cash_amount",
    "cs"."counted_cash_amount",
        CASE
            WHEN ("cs"."counted_cash_amount" IS NULL) THEN NULL::numeric
            ELSE (("cs"."counted_cash_amount" - (((("cs"."opening_cash_amount" + "cs"."opening_reserve_amount") + COALESCE("sbm"."cash_sales_amount", (0)::numeric)) + COALESCE("mt"."manual_income_amount", (0)::numeric)) - COALESCE("mt"."manual_expense_amount", (0)::numeric))))::numeric(12,2)
        END AS "difference_amount",
    COALESCE("mt"."movements_count", (0)::bigint) AS "movements_count",
    "cs"."opened_by",
    "cs"."closed_by",
    "cs"."opened_at",
    "cs"."closed_at",
    "cs"."close_note",
    "cs"."closed_controlled_by_name",
    "cs"."close_confirmed",
    "cs"."created_at",
    "cs"."updated_at"
   FROM (("public"."cash_sessions" "cs"
     LEFT JOIN "sales_by_method" "sbm" ON (("sbm"."session_id" = "cs"."id")))
     LEFT JOIN "movement_totals" "mt" ON (("mt"."session_id" = "cs"."id")));


ALTER VIEW "public"."v_cashbox_session_current" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_dashboard_admin" AS
 WITH "scopes" AS (
         SELECT "o_1"."id" AS "org_id",
            NULL::"uuid" AS "branch_id"
           FROM "public"."orgs" "o_1"
        UNION ALL
         SELECT "b"."org_id",
            "b"."id" AS "branch_id"
           FROM "public"."branches" "b"
        ), "sales_agg" AS (
         SELECT "s"."id" AS "sale_id",
            "s"."org_id",
            "s"."branch_id",
            "s"."created_at",
            "s"."total_amount",
            "s"."discount_amount",
            COALESCE("sum"("sp"."amount") FILTER (WHERE ("sp"."payment_method" = 'cash'::"public"."payment_method")), (0)::numeric) AS "cash_collected_amount",
            ("count"(*) FILTER (WHERE ("sp"."payment_method" = 'cash'::"public"."payment_method")) > 0) AS "has_cash_component"
           FROM ("public"."sales" "s"
             LEFT JOIN "public"."sale_payments" "sp" ON (("sp"."sale_id" = "s"."id")))
          GROUP BY "s"."id", "s"."org_id", "s"."branch_id", "s"."created_at", "s"."total_amount", "s"."discount_amount"
        ), "metrics" AS (
         SELECT "s"."org_id",
            "s"."branch_id",
            COALESCE("sum"("s"."total_amount") FILTER (WHERE (("s"."created_at")::"date" = CURRENT_DATE)), (0)::numeric) AS "sales_today_total",
            COALESCE("count"(*) FILTER (WHERE (("s"."created_at")::"date" = CURRENT_DATE)), (0)::bigint) AS "sales_today_count",
            COALESCE("sum"("s"."total_amount") FILTER (WHERE ("s"."created_at" >= "date_trunc"('week'::"text", "now"()))), (0)::numeric) AS "sales_week_total",
            COALESCE("sum"("s"."total_amount") FILTER (WHERE ("s"."created_at" >= "date_trunc"('month'::"text", "now"()))), (0)::numeric) AS "sales_month_total",
            COALESCE("sum"("s"."cash_collected_amount") FILTER (WHERE (("s"."created_at")::"date" = CURRENT_DATE)), (0)::numeric) AS "cash_sales_today_total",
            COALESCE("count"(*) FILTER (WHERE ((("s"."created_at")::"date" = CURRENT_DATE) AND "s"."has_cash_component")), (0)::bigint) AS "cash_sales_today_count",
            COALESCE("sum"("s"."discount_amount") FILTER (WHERE (("s"."created_at")::"date" = CURRENT_DATE)), (0)::numeric) AS "cash_discount_today_total",
            COALESCE("count"(*) FILTER (WHERE ((("s"."created_at")::"date" = CURRENT_DATE) AND ("s"."discount_amount" > (0)::numeric))), (0)::bigint) AS "cash_discounted_sales_today_count"
           FROM "sales_agg" "s"
          GROUP BY "s"."org_id", "s"."branch_id"
        ), "expiration_counts" AS (
         SELECT "eb"."org_id",
            "eb"."branch_id",
            "count"(*) FILTER (WHERE (("eb"."expires_on" - CURRENT_DATE) <= "op"."critical_days")) AS "expirations_critical_count",
            "count"(*) FILTER (WHERE ((("eb"."expires_on" - CURRENT_DATE) > "op"."critical_days") AND (("eb"."expires_on" - CURRENT_DATE) <= "op"."warning_days"))) AS "expirations_warning_count"
           FROM ("public"."expiration_batches" "eb"
             LEFT JOIN "public"."org_preferences" "op" ON (("op"."org_id" = "eb"."org_id")))
          GROUP BY "eb"."org_id", "eb"."branch_id"
        ), "order_counts" AS (
         SELECT "so"."org_id",
            "so"."branch_id",
            "count"(*) FILTER (WHERE ("so"."status" = ANY (ARRAY['sent'::"public"."supplier_order_status", 'received'::"public"."supplier_order_status"]))) AS "supplier_orders_pending_count"
           FROM "public"."supplier_orders" "so"
          GROUP BY "so"."org_id", "so"."branch_id"
        ), "client_order_counts" AS (
         SELECT "co"."org_id",
            "co"."branch_id",
            "count"(*) FILTER (WHERE ("co"."status" = ANY (ARRAY['pending'::"public"."special_order_status", 'ordered'::"public"."special_order_status", 'received'::"public"."special_order_status"]))) AS "client_orders_pending_count"
           FROM "public"."client_special_orders" "co"
          GROUP BY "co"."org_id", "co"."branch_id"
        )
 SELECT "sc"."org_id",
    "sc"."branch_id",
    COALESCE("m"."sales_today_total", (0)::numeric) AS "sales_today_total",
    COALESCE("m"."sales_today_count", (0)::bigint) AS "sales_today_count",
    COALESCE("m"."sales_week_total", (0)::numeric) AS "sales_week_total",
    COALESCE("m"."sales_month_total", (0)::numeric) AS "sales_month_total",
    COALESCE("m"."cash_sales_today_total", (0)::numeric) AS "cash_sales_today_total",
    COALESCE("m"."cash_sales_today_count", (0)::bigint) AS "cash_sales_today_count",
    COALESCE("m"."cash_discount_today_total", (0)::numeric) AS "cash_discount_today_total",
    COALESCE("m"."cash_discounted_sales_today_count", (0)::bigint) AS "cash_discounted_sales_today_count",
    COALESCE("e"."expirations_critical_count", (0)::bigint) AS "expirations_critical_count",
    COALESCE("e"."expirations_warning_count", (0)::bigint) AS "expirations_warning_count",
    COALESCE("o"."supplier_orders_pending_count", (0)::bigint) AS "supplier_orders_pending_count",
    COALESCE("c"."client_orders_pending_count", (0)::bigint) AS "client_orders_pending_count"
   FROM (((("scopes" "sc"
     LEFT JOIN "metrics" "m" ON ((("m"."org_id" = "sc"."org_id") AND (("m"."branch_id" = "sc"."branch_id") OR (("m"."branch_id" IS NULL) AND ("sc"."branch_id" IS NULL))))))
     LEFT JOIN "expiration_counts" "e" ON ((("e"."org_id" = "sc"."org_id") AND (("e"."branch_id" = "sc"."branch_id") OR (("e"."branch_id" IS NULL) AND ("sc"."branch_id" IS NULL))))))
     LEFT JOIN "order_counts" "o" ON ((("o"."org_id" = "sc"."org_id") AND (("o"."branch_id" = "sc"."branch_id") OR (("o"."branch_id" IS NULL) AND ("sc"."branch_id" IS NULL))))))
     LEFT JOIN "client_order_counts" "c" ON ((("c"."org_id" = "sc"."org_id") AND (("c"."branch_id" = "sc"."branch_id") OR (("c"."branch_id" IS NULL) AND ("sc"."branch_id" IS NULL))))));


ALTER VIEW "public"."v_dashboard_admin" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_expiration_batch_detail" AS
 SELECT "eb"."id" AS "batch_id",
    "eb"."org_id",
    "eb"."branch_id",
    "b"."name" AS "branch_name",
    "eb"."product_id",
    "p"."name" AS "product_name",
    "eb"."expires_on",
    ("eb"."expires_on" - CURRENT_DATE) AS "days_left",
    "eb"."quantity",
    "eb"."batch_code",
    "eb"."source_type",
    "eb"."source_ref_id",
    "eb"."created_at"
   FROM (("public"."expiration_batches" "eb"
     LEFT JOIN "public"."products" "p" ON ((("p"."id" = "eb"."product_id") AND ("p"."org_id" = "eb"."org_id"))))
     LEFT JOIN "public"."branches" "b" ON ((("b"."id" = "eb"."branch_id") AND ("b"."org_id" = "eb"."org_id"))));


ALTER VIEW "public"."v_expiration_batch_detail" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_expiration_waste_detail" AS
 SELECT "ew"."id" AS "waste_id",
    "ew"."org_id",
    "ew"."branch_id",
    "b"."name" AS "branch_name",
    "ew"."product_id",
    "p"."name" AS "product_name",
    "ew"."quantity",
    "ew"."unit_price_snapshot",
    "ew"."total_amount",
    "ew"."created_at"
   FROM (("public"."expiration_waste" "ew"
     JOIN "public"."products" "p" ON ((("p"."id" = "ew"."product_id") AND ("p"."org_id" = "ew"."org_id"))))
     JOIN "public"."branches" "b" ON ((("b"."id" = "ew"."branch_id") AND ("b"."org_id" = "ew"."org_id"))));


ALTER VIEW "public"."v_expiration_waste_detail" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_expiration_waste_summary" AS
 SELECT "org_id",
    "branch_id",
    "sum"("total_amount") AS "total_amount",
    "sum"("quantity") AS "total_quantity",
    "max"("created_at") AS "last_created_at"
   FROM "public"."expiration_waste"
  GROUP BY "org_id", "branch_id";


ALTER VIEW "public"."v_expiration_waste_summary" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_expirations_due" AS
 SELECT "eb"."id" AS "batch_id",
    "eb"."org_id",
    "eb"."branch_id",
    "b"."name" AS "branch_name",
    "eb"."product_id",
    "p"."name" AS "product_name",
    "eb"."expires_on",
    ("eb"."expires_on" - CURRENT_DATE) AS "days_left",
    "eb"."quantity",
    "eb"."batch_code",
    "p"."unit_price",
    ("eb"."quantity" * COALESCE("p"."unit_price", (0)::numeric)) AS "total_value",
    "op"."critical_days",
    "op"."warning_days",
        CASE
            WHEN (("eb"."expires_on" - CURRENT_DATE) <= "op"."critical_days") THEN 'critical'::"text"
            WHEN (("eb"."expires_on" - CURRENT_DATE) <= "op"."warning_days") THEN 'warning'::"text"
            ELSE 'info'::"text"
        END AS "severity"
   FROM ((("public"."expiration_batches" "eb"
     LEFT JOIN "public"."products" "p" ON ((("p"."id" = "eb"."product_id") AND ("p"."org_id" = "eb"."org_id"))))
     LEFT JOIN "public"."branches" "b" ON ((("b"."id" = "eb"."branch_id") AND ("b"."org_id" = "eb"."org_id"))))
     LEFT JOIN "public"."org_preferences" "op" ON (("op"."org_id" = "eb"."org_id")))
  WHERE ("eb"."quantity" > (0)::numeric);


ALTER VIEW "public"."v_expirations_due" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_expirations_expired" AS
 SELECT "eb"."id" AS "batch_id",
    "eb"."org_id",
    "eb"."branch_id",
    "b"."name" AS "branch_name",
    "eb"."product_id",
    "p"."name" AS "product_name",
    "eb"."expires_on",
    (CURRENT_DATE - "eb"."expires_on") AS "days_expired",
    "eb"."quantity",
    "eb"."batch_code",
    "p"."unit_price",
    ("eb"."quantity" * COALESCE("p"."unit_price", (0)::numeric)) AS "total_value"
   FROM (("public"."expiration_batches" "eb"
     JOIN "public"."products" "p" ON ((("p"."id" = "eb"."product_id") AND ("p"."org_id" = "eb"."org_id"))))
     JOIN "public"."branches" "b" ON ((("b"."id" = "eb"."branch_id") AND ("b"."org_id" = "eb"."org_id"))))
  WHERE (("eb"."quantity" > (0)::numeric) AND ("eb"."expires_on" < CURRENT_DATE));


ALTER VIEW "public"."v_expirations_expired" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_order_detail_admin" AS
 SELECT "so"."id" AS "order_id",
    "so"."org_id",
    "so"."status",
    "so"."notes",
    "so"."supplier_id",
    "s"."name" AS "supplier_name",
    "so"."branch_id",
    "b"."name" AS "branch_name",
    "so"."created_at",
    "so"."sent_at",
    "so"."received_at",
    "so"."reconciled_at",
    "so"."expected_receive_on",
    "so"."controlled_by_user_id",
    "so"."controlled_by_name",
    "ou"."display_name" AS "controlled_by_user_name",
    "soi"."id" AS "order_item_id",
    "soi"."product_id",
    "p"."name" AS "product_name",
    "soi"."ordered_qty",
    "soi"."received_qty",
    "soi"."unit_cost",
    ("soi"."received_qty" - "soi"."ordered_qty") AS "diff_qty"
   FROM ((((("public"."supplier_orders" "so"
     LEFT JOIN "public"."suppliers" "s" ON ((("s"."id" = "so"."supplier_id") AND ("s"."org_id" = "so"."org_id"))))
     LEFT JOIN "public"."branches" "b" ON ((("b"."id" = "so"."branch_id") AND ("b"."org_id" = "so"."org_id"))))
     LEFT JOIN "public"."org_users" "ou" ON ((("ou"."user_id" = "so"."controlled_by_user_id") AND ("ou"."org_id" = "so"."org_id"))))
     LEFT JOIN "public"."supplier_order_items" "soi" ON ((("soi"."order_id" = "so"."id") AND ("soi"."org_id" = "so"."org_id"))))
     LEFT JOIN "public"."products" "p" ON ((("p"."id" = "soi"."product_id") AND ("p"."org_id" = "so"."org_id"))));


ALTER VIEW "public"."v_order_detail_admin" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_orders_admin" AS
 SELECT "so"."id" AS "order_id",
    "so"."org_id",
    "so"."branch_id",
    "b"."name" AS "branch_name",
    "so"."supplier_id",
    "s"."name" AS "supplier_name",
    "so"."status",
    "so"."created_at",
    "so"."sent_at",
    "so"."received_at",
    "so"."reconciled_at",
    "so"."expected_receive_on",
    COALESCE("items"."items_count", (0)::bigint) AS "items_count",
    "sp"."id" AS "payable_id",
    "sp"."status" AS "payable_status",
        CASE
            WHEN ("sp"."id" IS NULL) THEN 'not_created'::"text"
            WHEN (("sp"."status" <> 'paid'::"text") AND ("sp"."due_on" IS NOT NULL) AND ("sp"."due_on" < CURRENT_DATE)) THEN 'overdue'::"text"
            ELSE "sp"."status"
        END AS "payment_state",
    "sp"."due_on" AS "payable_due_on",
    "sp"."outstanding_amount" AS "payable_outstanding_amount"
   FROM (((("public"."supplier_orders" "so"
     LEFT JOIN "public"."suppliers" "s" ON ((("s"."id" = "so"."supplier_id") AND ("s"."org_id" = "so"."org_id"))))
     LEFT JOIN "public"."branches" "b" ON ((("b"."id" = "so"."branch_id") AND ("b"."org_id" = "so"."org_id"))))
     LEFT JOIN ( SELECT "supplier_order_items"."order_id",
            "count"(*) AS "items_count"
           FROM "public"."supplier_order_items"
          GROUP BY "supplier_order_items"."order_id") "items" ON (("items"."order_id" = "so"."id")))
     LEFT JOIN "public"."supplier_payables" "sp" ON ((("sp"."order_id" = "so"."id") AND ("sp"."org_id" = "so"."org_id"))));


ALTER VIEW "public"."v_orders_admin" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_pos_product_catalog" AS
 SELECT "p"."id" AS "product_id",
    "p"."org_id",
    "p"."name",
    "p"."internal_code",
    "p"."barcode",
    "p"."sell_unit_type",
    "p"."uom",
    "p"."unit_price",
    "p"."is_active",
    "b"."id" AS "branch_id",
    COALESCE("si"."quantity_on_hand", (0)::numeric) AS "stock_on_hand"
   FROM (("public"."products" "p"
     JOIN "public"."branches" "b" ON ((("b"."org_id" = "p"."org_id") AND ("b"."is_active" = true))))
     LEFT JOIN "public"."stock_items" "si" ON ((("si"."product_id" = "p"."id") AND ("si"."org_id" = "p"."org_id") AND ("si"."branch_id" = "b"."id"))));


ALTER VIEW "public"."v_pos_product_catalog" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_products_admin" AS
SELECT
    NULL::"uuid" AS "product_id",
    NULL::"uuid" AS "org_id",
    NULL::"text" AS "name",
    NULL::"text" AS "internal_code",
    NULL::"text" AS "barcode",
    NULL::"public"."sell_unit_type" AS "sell_unit_type",
    NULL::"text" AS "uom",
    NULL::numeric(12,2) AS "unit_price",
    NULL::boolean AS "is_active",
    NULL::timestamp with time zone AS "created_at",
    NULL::timestamp with time zone AS "updated_at",
    NULL::numeric AS "stock_total",
    NULL::"jsonb" AS "stock_by_branch",
    NULL::integer AS "shelf_life_days";


ALTER VIEW "public"."v_products_admin" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_products_typeahead_admin" AS
 SELECT "id" AS "product_id",
    "org_id",
    "name",
    "is_active"
   FROM "public"."products" "p";


ALTER VIEW "public"."v_products_typeahead_admin" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_sale_detail_admin" WITH ("security_invoker"='true') AS
 WITH "items_by_sale" AS (
         SELECT "si"."sale_id",
            "jsonb_agg"("jsonb_build_object"('sale_item_id', "si"."id", 'product_id', "si"."product_id", 'product_name', "si"."product_name_snapshot", 'unit_price', "si"."unit_price_snapshot", 'quantity', "si"."quantity", 'line_total', "si"."line_total") ORDER BY "si"."product_name_snapshot") AS "items"
           FROM "public"."sale_items" "si"
          GROUP BY "si"."sale_id"
        ), "payments_by_sale" AS (
         SELECT "sp"."sale_id",
            "jsonb_agg"("jsonb_build_object"('sale_payment_id', "sp"."id", 'payment_method', "sp"."payment_method", 'amount', "sp"."amount", 'payment_device_id', "sp"."payment_device_id", 'payment_device_name', "ppd"."device_name", 'payment_device_provider', "ppd"."provider", 'created_at', "sp"."created_at") ORDER BY "sp"."created_at", "sp"."id") AS "payments"
           FROM ("public"."sale_payments" "sp"
             LEFT JOIN "public"."pos_payment_devices" "ppd" ON ((("ppd"."id" = "sp"."payment_device_id") AND ("ppd"."org_id" = "sp"."org_id"))))
          GROUP BY "sp"."sale_id"
        ), "creator_names" AS (
         SELECT "ou"."org_id",
            "ou"."user_id",
            COALESCE(NULLIF(TRIM(BOTH FROM "ou"."display_name"), ''::"text"), ("ou"."user_id")::"text") AS "creator_name"
           FROM "public"."org_users" "ou"
        )
 SELECT "s"."id" AS "sale_id",
    "s"."org_id",
    "s"."branch_id",
    "b"."name" AS "branch_name",
    "s"."created_at",
    "s"."created_by",
    COALESCE("cn"."creator_name", ("s"."created_by")::"text") AS "created_by_name",
    "s"."payment_method" AS "payment_method_summary",
    "s"."subtotal_amount",
    "s"."discount_amount",
    "s"."discount_pct",
    "s"."total_amount",
    COALESCE("ibs"."items", '[]'::"jsonb") AS "items",
    COALESCE("pbs"."payments", '[]'::"jsonb") AS "payments"
   FROM (((("public"."sales" "s"
     JOIN "public"."branches" "b" ON ((("b"."id" = "s"."branch_id") AND ("b"."org_id" = "s"."org_id"))))
     LEFT JOIN "items_by_sale" "ibs" ON (("ibs"."sale_id" = "s"."id")))
     LEFT JOIN "payments_by_sale" "pbs" ON (("pbs"."sale_id" = "s"."id")))
     LEFT JOIN "creator_names" "cn" ON ((("cn"."org_id" = "s"."org_id") AND ("cn"."user_id" = "s"."created_by"))));


ALTER VIEW "public"."v_sale_detail_admin" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_sales_admin" WITH ("security_invoker"='true') AS
 WITH "payment_totals" AS (
         SELECT "sp"."sale_id",
            (COALESCE("sum"("sp"."amount") FILTER (WHERE ("sp"."payment_method" = 'cash'::"public"."payment_method")), (0)::numeric))::numeric(12,2) AS "cash_amount",
            (COALESCE("sum"("sp"."amount") FILTER (WHERE (("sp"."payment_method")::"text" = ANY (ARRAY['card'::"text", 'debit'::"text", 'credit'::"text"]))), (0)::numeric))::numeric(12,2) AS "card_amount",
            (COALESCE("sum"("sp"."amount") FILTER (WHERE (("sp"."payment_method")::"text" = 'mercadopago'::"text")), (0)::numeric))::numeric(12,2) AS "mercadopago_amount",
            (COALESCE("sum"("sp"."amount") FILTER (WHERE (("sp"."payment_method")::"text" <> ALL (ARRAY['cash'::"text", 'card'::"text", 'debit'::"text", 'credit'::"text", 'mercadopago'::"text"]))), (0)::numeric))::numeric(12,2) AS "other_amount",
            "array_agg"(DISTINCT ("sp"."payment_method")::"text" ORDER BY ("sp"."payment_method")::"text") AS "payment_methods"
           FROM "public"."sale_payments" "sp"
          GROUP BY "sp"."sale_id"
        ), "item_totals" AS (
         SELECT "si"."sale_id",
            ("count"(*))::integer AS "items_count",
            (COALESCE("sum"("si"."quantity"), (0)::numeric))::numeric(14,3) AS "items_qty_total",
            "string_agg"(DISTINCT "si"."product_name_snapshot", ', '::"text" ORDER BY "si"."product_name_snapshot") AS "item_names_summary",
            "lower"("string_agg"(DISTINCT "si"."product_name_snapshot", ' '::"text" ORDER BY "si"."product_name_snapshot")) AS "item_names_search"
           FROM "public"."sale_items" "si"
          GROUP BY "si"."sale_id"
        ), "creator_names" AS (
         SELECT "ou"."org_id",
            "ou"."user_id",
            COALESCE(NULLIF(TRIM(BOTH FROM "ou"."display_name"), ''::"text"), ("ou"."user_id")::"text") AS "creator_name"
           FROM "public"."org_users" "ou"
        )
 SELECT "s"."id" AS "sale_id",
    "s"."org_id",
    "s"."branch_id",
    "b"."name" AS "branch_name",
    "s"."created_at",
    "s"."created_by",
    COALESCE("cn"."creator_name", ("s"."created_by")::"text") AS "created_by_name",
    "s"."payment_method" AS "payment_method_summary",
    "s"."subtotal_amount",
    "s"."discount_amount",
    "s"."discount_pct",
    "s"."total_amount",
    COALESCE("it"."items_count", 0) AS "items_count",
    (COALESCE("it"."items_qty_total", (0)::numeric))::numeric(14,3) AS "items_qty_total",
    COALESCE("it"."item_names_summary", ''::"text") AS "item_names_summary",
    COALESCE("it"."item_names_search", ''::"text") AS "item_names_search",
    COALESCE("pt"."payment_methods", ARRAY[]::"text"[]) AS "payment_methods",
    (COALESCE("pt"."cash_amount", (0)::numeric))::numeric(12,2) AS "cash_amount",
    (COALESCE("pt"."card_amount", (0)::numeric))::numeric(12,2) AS "card_amount",
    (COALESCE("pt"."mercadopago_amount", (0)::numeric))::numeric(12,2) AS "mercadopago_amount",
    (COALESCE("pt"."other_amount", (0)::numeric))::numeric(12,2) AS "other_amount"
   FROM (((("public"."sales" "s"
     JOIN "public"."branches" "b" ON ((("b"."id" = "s"."branch_id") AND ("b"."org_id" = "s"."org_id"))))
     LEFT JOIN "payment_totals" "pt" ON (("pt"."sale_id" = "s"."id")))
     LEFT JOIN "item_totals" "it" ON (("it"."sale_id" = "s"."id")))
     LEFT JOIN "creator_names" "cn" ON ((("cn"."org_id" = "s"."org_id") AND ("cn"."user_id" = "s"."created_by"))));


ALTER VIEW "public"."v_sales_admin" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_settings_users_admin" AS
 SELECT "ou"."org_id",
    "ou"."user_id",
    "au"."email",
    "ou"."display_name",
    "ou"."role",
    "ou"."is_active",
    "ou"."created_at",
    "array_remove"("array_agg"("bm"."branch_id"), NULL::"uuid") AS "branch_ids"
   FROM (("public"."org_users" "ou"
     LEFT JOIN "auth"."users" "au" ON (("au"."id" = "ou"."user_id")))
     LEFT JOIN "public"."branch_memberships" "bm" ON ((("bm"."user_id" = "ou"."user_id") AND ("bm"."org_id" = "ou"."org_id") AND ("bm"."is_active" = true))))
  GROUP BY "ou"."org_id", "ou"."user_id", "au"."email", "ou"."display_name", "ou"."role", "ou"."is_active", "ou"."created_at";


ALTER VIEW "public"."v_settings_users_admin" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_special_order_items_pending" AS
 SELECT "soi"."id" AS "item_id",
    "soi"."org_id",
    "so"."id" AS "special_order_id",
    "so"."status" AS "special_order_status",
    "so"."branch_id",
    "c"."id" AS "client_id",
    "c"."name" AS "client_name",
    "soi"."product_id",
    "p"."name" AS "product_name",
    COALESCE("soi"."supplier_id", "sp"."supplier_id") AS "supplier_id",
    "sup"."name" AS "supplier_name",
    "soi"."requested_qty",
    "soi"."fulfilled_qty",
    ("soi"."requested_qty" - "soi"."fulfilled_qty") AS "remaining_qty",
    "soi"."is_ordered",
    "soi"."ordered_at"
   FROM ((((("public"."client_special_order_items" "soi"
     LEFT JOIN "public"."client_special_orders" "so" ON ((("so"."id" = "soi"."special_order_id") AND ("so"."org_id" = "soi"."org_id"))))
     LEFT JOIN "public"."clients" "c" ON ((("c"."id" = "so"."client_id") AND ("c"."org_id" = "so"."org_id"))))
     LEFT JOIN "public"."products" "p" ON ((("p"."id" = "soi"."product_id") AND ("p"."org_id" = "soi"."org_id"))))
     LEFT JOIN "public"."supplier_products" "sp" ON ((("sp"."product_id" = "soi"."product_id") AND ("sp"."org_id" = "soi"."org_id") AND ("sp"."relation_type" = 'primary'::"public"."supplier_product_relation_type"))))
     LEFT JOIN "public"."suppliers" "sup" ON ((("sup"."id" = COALESCE("soi"."supplier_id", "sp"."supplier_id")) AND ("sup"."org_id" = "soi"."org_id"))))
  WHERE (("so"."status" = ANY (ARRAY['pending'::"public"."special_order_status", 'ordered'::"public"."special_order_status", 'partial'::"public"."special_order_status"])) AND (("soi"."requested_qty" - "soi"."fulfilled_qty") > (0)::numeric));


ALTER VIEW "public"."v_special_order_items_pending" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_staff_effective_modules" AS
 WITH "memberships" AS (
         SELECT "bm"."org_id",
            "bm"."branch_id"
           FROM "public"."branch_memberships" "bm"
          WHERE (("bm"."user_id" = "auth"."uid"()) AND ("bm"."is_active" = true))
        ), "module_keys" AS (
         SELECT "sma"."org_id",
            "sma"."branch_id",
            "sma"."module_key",
            "sma"."is_enabled"
           FROM "public"."staff_module_access" "sma"
          WHERE ("sma"."role" = 'staff'::"public"."user_role")
        ), "resolved" AS (
         SELECT "m"."org_id",
            "m"."branch_id",
            "mk"."module_key",
                CASE
                    WHEN ("bo"."module_key" IS NOT NULL) THEN "bo"."is_enabled"
                    WHEN ("od"."module_key" IS NOT NULL) THEN "od"."is_enabled"
                    ELSE false
                END AS "is_enabled",
                CASE
                    WHEN ("bo"."module_key" IS NOT NULL) THEN 'branch_override'::"text"
                    WHEN ("od"."module_key" IS NOT NULL) THEN 'org_default'::"text"
                    ELSE 'none'::"text"
                END AS "source_scope"
           FROM ((("memberships" "m"
             JOIN ( SELECT DISTINCT "module_keys"."org_id",
                    "module_keys"."module_key"
                   FROM "module_keys") "mk" ON (("mk"."org_id" = "m"."org_id")))
             LEFT JOIN "module_keys" "od" ON ((("od"."org_id" = "m"."org_id") AND ("od"."branch_id" IS NULL) AND ("od"."module_key" = "mk"."module_key"))))
             LEFT JOIN "module_keys" "bo" ON ((("bo"."org_id" = "m"."org_id") AND ("bo"."branch_id" = "m"."branch_id") AND ("bo"."module_key" = "mk"."module_key"))))
        )
 SELECT "org_id",
    "branch_id",
    "module_key",
    "is_enabled",
    "source_scope"
   FROM "resolved";


ALTER VIEW "public"."v_staff_effective_modules" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_stock_by_branch" AS
 SELECT "org_id",
    "branch_id",
    "product_id",
    "quantity_on_hand",
    "updated_at"
   FROM "public"."stock_items" "si";


ALTER VIEW "public"."v_stock_by_branch" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_superadmin_org_detail" WITH ("security_invoker"='true') AS
 SELECT "o"."id" AS "org_id",
    "o"."name" AS "org_name",
    "o"."timezone",
    "o"."is_active" AS "org_is_active",
    "b"."id" AS "branch_id",
    "b"."name" AS "branch_name",
    "b"."address" AS "branch_address",
    "b"."is_active" AS "branch_is_active",
    "b"."created_at" AS "branch_created_at",
    "ou"."user_id",
    "ou"."display_name",
    "ou"."role",
    "ou"."is_active" AS "user_is_active",
    "ou"."created_at" AS "user_created_at"
   FROM (("public"."orgs" "o"
     LEFT JOIN "public"."branches" "b" ON (("b"."org_id" = "o"."id")))
     LEFT JOIN "public"."org_users" "ou" ON (("ou"."org_id" = "o"."id")));


ALTER VIEW "public"."v_superadmin_org_detail" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_superadmin_orgs" WITH ("security_invoker"='true') AS
 SELECT "o"."id" AS "org_id",
    "o"."name" AS "org_name",
    "o"."timezone",
    "o"."is_active",
    "o"."created_at",
    "count"(DISTINCT "b"."id") FILTER (WHERE "b"."is_active") AS "branches_count",
    "count"(DISTINCT "ou"."user_id") FILTER (WHERE "ou"."is_active") AS "users_count"
   FROM (("public"."orgs" "o"
     LEFT JOIN "public"."branches" "b" ON (("b"."org_id" = "o"."id")))
     LEFT JOIN "public"."org_users" "ou" ON (("ou"."org_id" = "o"."id")))
  GROUP BY "o"."id", "o"."name", "o"."timezone", "o"."is_active", "o"."created_at";


ALTER VIEW "public"."v_superadmin_orgs" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_supplier_detail_admin" AS
 SELECT "s"."id" AS "supplier_id",
    "s"."org_id",
    "s"."name",
    "s"."contact_name",
    "s"."phone",
    "s"."email",
    "s"."notes",
    "s"."is_active",
    "s"."created_at",
    "s"."updated_at",
    "sp"."product_id",
    "p"."name" AS "product_name",
    "p"."is_active" AS "product_is_active",
    "p"."barcode",
    "p"."internal_code",
    "sp"."supplier_sku",
    "sp"."supplier_product_name",
    "sp"."relation_type",
    "s"."order_frequency",
    "s"."order_day",
    "s"."receive_day",
    "s"."payment_terms_days",
    "s"."preferred_payment_method",
    "s"."accepts_cash",
    "s"."accepts_transfer",
    "s"."payment_note"
   FROM (("public"."suppliers" "s"
     LEFT JOIN "public"."supplier_products" "sp" ON ((("sp"."supplier_id" = "s"."id") AND ("sp"."org_id" = "s"."org_id"))))
     LEFT JOIN "public"."products" "p" ON ((("p"."id" = "sp"."product_id") AND ("p"."org_id" = "s"."org_id"))));


ALTER VIEW "public"."v_supplier_detail_admin" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_supplier_payables_admin" AS
 SELECT "sp"."id" AS "payable_id",
    "sp"."org_id",
    "sp"."branch_id",
    "b"."name" AS "branch_name",
    "sp"."supplier_id",
    "s"."name" AS "supplier_name",
    "sp"."order_id",
    "so"."status" AS "order_status",
    "sp"."status" AS "payable_status",
        CASE
            WHEN (("sp"."status" <> 'paid'::"text") AND ("sp"."due_on" IS NOT NULL) AND ("sp"."due_on" < CURRENT_DATE)) THEN 'overdue'::"text"
            ELSE "sp"."status"
        END AS "payment_state",
    "sp"."estimated_amount",
    "sp"."invoice_amount",
    "sp"."paid_amount",
    "sp"."outstanding_amount",
    "sp"."due_on",
        CASE
            WHEN ("sp"."due_on" IS NULL) THEN NULL::integer
            ELSE ("sp"."due_on" - CURRENT_DATE)
        END AS "due_in_days",
    (("sp"."status" <> 'paid'::"text") AND ("sp"."due_on" IS NOT NULL) AND ("sp"."due_on" < CURRENT_DATE)) AS "is_overdue",
    "sp"."payment_terms_days_snapshot",
    "sp"."preferred_payment_method",
    "sp"."selected_payment_method",
    "sp"."invoice_reference",
    "sp"."invoice_photo_url",
    "sp"."invoice_note",
    "sp"."paid_at",
    "sp"."created_at",
    "sp"."updated_at"
   FROM ((("public"."supplier_payables" "sp"
     JOIN "public"."supplier_orders" "so" ON ((("so"."id" = "sp"."order_id") AND ("so"."org_id" = "sp"."org_id"))))
     JOIN "public"."suppliers" "s" ON ((("s"."id" = "sp"."supplier_id") AND ("s"."org_id" = "sp"."org_id"))))
     JOIN "public"."branches" "b" ON ((("b"."id" = "sp"."branch_id") AND ("b"."org_id" = "sp"."org_id"))));


ALTER VIEW "public"."v_supplier_payables_admin" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_supplier_product_suggestions" AS
 WITH "sales_30d" AS (
         SELECT "si_1"."org_id",
            "s_1"."branch_id",
            "si_1"."product_id",
            "sum"("si_1"."quantity") AS "total_qty"
           FROM ("public"."sale_items" "si_1"
             JOIN "public"."sales" "s_1" ON ((("s_1"."id" = "si_1"."sale_id") AND ("s_1"."org_id" = "si_1"."org_id"))))
          WHERE ("s_1"."created_at" >= ("now"() - '30 days'::interval))
          GROUP BY "si_1"."org_id", "s_1"."branch_id", "si_1"."product_id"
        ), "cycle_days" AS (
         SELECT "s_1"."id" AS "supplier_id",
                CASE "s_1"."order_frequency"
                    WHEN 'weekly'::"public"."order_frequency" THEN 7
                    WHEN 'biweekly'::"public"."order_frequency" THEN 14
                    WHEN 'every_3_weeks'::"public"."order_frequency" THEN 21
                    WHEN 'monthly'::"public"."order_frequency" THEN 30
                    ELSE 30
                END AS "days"
           FROM "public"."suppliers" "s_1"
        )
 SELECT "sp"."org_id",
    "sp"."supplier_id",
    "b"."id" AS "branch_id",
    "sp"."product_id",
    "p"."name" AS "product_name",
    "sp"."relation_type",
    COALESCE("si"."quantity_on_hand", (0)::numeric) AS "stock_on_hand",
    COALESCE("si"."safety_stock", (0)::numeric) AS "safety_stock",
    (COALESCE("s30"."total_qty", (0)::numeric) / 30.0) AS "avg_daily_sales_30d",
    "cd"."days" AS "cycle_days",
    GREATEST((0)::numeric, ((((COALESCE("s30"."total_qty", (0)::numeric) / 30.0) * ("cd"."days")::numeric) + COALESCE("si"."safety_stock", (0)::numeric)) - COALESCE("si"."quantity_on_hand", (0)::numeric))) AS "suggested_qty"
   FROM (((((("public"."supplier_products" "sp"
     JOIN "public"."products" "p" ON ((("p"."id" = "sp"."product_id") AND ("p"."org_id" = "sp"."org_id"))))
     JOIN "public"."suppliers" "s" ON ((("s"."id" = "sp"."supplier_id") AND ("s"."org_id" = "sp"."org_id"))))
     JOIN "public"."branches" "b" ON ((("b"."org_id" = "sp"."org_id") AND ("b"."is_active" = true))))
     LEFT JOIN "public"."stock_items" "si" ON ((("si"."org_id" = "sp"."org_id") AND ("si"."product_id" = "sp"."product_id") AND ("si"."branch_id" = "b"."id"))))
     LEFT JOIN "sales_30d" "s30" ON ((("s30"."org_id" = "sp"."org_id") AND ("s30"."product_id" = "sp"."product_id") AND ("s30"."branch_id" = "b"."id"))))
     LEFT JOIN "cycle_days" "cd" ON (("cd"."supplier_id" = "sp"."supplier_id")))
  WHERE ("p"."is_active" = true);


ALTER VIEW "public"."v_supplier_product_suggestions" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_suppliers_admin" AS
 SELECT "s"."id" AS "supplier_id",
    "s"."org_id",
    "s"."name",
    "s"."contact_name",
    "s"."phone",
    "s"."email",
    "s"."notes",
    "s"."is_active",
    "s"."created_at",
    "s"."updated_at",
    COALESCE("sp_count"."products_count", (0)::bigint) AS "products_count",
    "s"."order_frequency",
    "s"."order_day",
    "s"."receive_day",
    "s"."payment_terms_days",
    "s"."preferred_payment_method",
    "s"."accepts_cash",
    "s"."accepts_transfer",
    "s"."payment_note",
    COALESCE("accounts_count"."accounts_count", (0)::bigint) AS "payment_accounts_count"
   FROM (("public"."suppliers" "s"
     LEFT JOIN ( SELECT "supplier_products"."supplier_id",
            "count"(*) AS "products_count"
           FROM "public"."supplier_products"
          GROUP BY "supplier_products"."supplier_id") "sp_count" ON (("sp_count"."supplier_id" = "s"."id")))
     LEFT JOIN ( SELECT "spa"."supplier_id",
            "count"(*) FILTER (WHERE ("spa"."is_active" = true)) AS "accounts_count"
           FROM "public"."supplier_payment_accounts" "spa"
          GROUP BY "spa"."supplier_id") "accounts_count" ON (("accounts_count"."supplier_id" = "s"."id")));


ALTER VIEW "public"."v_suppliers_admin" OWNER TO "postgres";


ALTER TABLE ONLY "public"."audit_log"
    ADD CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."branch_memberships"
    ADD CONSTRAINT "branch_memberships_org_id_branch_id_user_id_key" UNIQUE ("org_id", "branch_id", "user_id");



ALTER TABLE ONLY "public"."branch_memberships"
    ADD CONSTRAINT "branch_memberships_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."branches"
    ADD CONSTRAINT "branches_org_id_name_key" UNIQUE ("org_id", "name");



ALTER TABLE ONLY "public"."branches"
    ADD CONSTRAINT "branches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cash_session_count_lines"
    ADD CONSTRAINT "cash_session_count_lines_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cash_session_count_lines"
    ADD CONSTRAINT "cash_session_count_lines_unique_session_scope_denom" UNIQUE ("session_id", "count_scope", "denomination_value");



ALTER TABLE ONLY "public"."cash_session_movements"
    ADD CONSTRAINT "cash_session_movements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cash_sessions"
    ADD CONSTRAINT "cash_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."client_special_order_items"
    ADD CONSTRAINT "client_special_order_items_org_id_special_order_id_product__key" UNIQUE ("org_id", "special_order_id", "product_id");



ALTER TABLE ONLY "public"."client_special_order_items"
    ADD CONSTRAINT "client_special_order_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."client_special_orders"
    ADD CONSTRAINT "client_special_orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."expiration_batches"
    ADD CONSTRAINT "expiration_batches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."expiration_waste"
    ADD CONSTRAINT "expiration_waste_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."org_preferences"
    ADD CONSTRAINT "org_preferences_pkey" PRIMARY KEY ("org_id");



ALTER TABLE ONLY "public"."org_users"
    ADD CONSTRAINT "org_users_org_id_user_id_key" UNIQUE ("org_id", "user_id");



ALTER TABLE ONLY "public"."org_users"
    ADD CONSTRAINT "org_users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."orgs"
    ADD CONSTRAINT "orgs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."platform_admins"
    ADD CONSTRAINT "platform_admins_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."pos_payment_devices"
    ADD CONSTRAINT "pos_payment_devices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pos_payment_devices"
    ADD CONSTRAINT "pos_payment_devices_unique_org_branch_name" UNIQUE ("org_id", "branch_id", "device_name");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sale_items"
    ADD CONSTRAINT "sale_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sale_payments"
    ADD CONSTRAINT "sale_payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sales"
    ADD CONSTRAINT "sales_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."staff_module_access"
    ADD CONSTRAINT "staff_module_access_org_id_branch_id_role_module_key_key" UNIQUE ("org_id", "branch_id", "role", "module_key");



ALTER TABLE ONLY "public"."staff_module_access"
    ADD CONSTRAINT "staff_module_access_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stock_items"
    ADD CONSTRAINT "stock_items_org_id_branch_id_product_id_key" UNIQUE ("org_id", "branch_id", "product_id");



ALTER TABLE ONLY "public"."stock_items"
    ADD CONSTRAINT "stock_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."supplier_order_items"
    ADD CONSTRAINT "supplier_order_items_order_id_product_id_key" UNIQUE ("order_id", "product_id");



ALTER TABLE ONLY "public"."supplier_order_items"
    ADD CONSTRAINT "supplier_order_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."supplier_orders"
    ADD CONSTRAINT "supplier_orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."supplier_payables"
    ADD CONSTRAINT "supplier_payables_order_id_key" UNIQUE ("order_id");



ALTER TABLE ONLY "public"."supplier_payables"
    ADD CONSTRAINT "supplier_payables_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."supplier_payment_accounts"
    ADD CONSTRAINT "supplier_payment_accounts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."supplier_payments"
    ADD CONSTRAINT "supplier_payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."supplier_products"
    ADD CONSTRAINT "supplier_products_org_id_supplier_id_product_id_key" UNIQUE ("org_id", "supplier_id", "product_id");



ALTER TABLE ONLY "public"."supplier_products"
    ADD CONSTRAINT "supplier_products_org_product_relation_key" UNIQUE ("org_id", "product_id", "relation_type");



ALTER TABLE ONLY "public"."supplier_products"
    ADD CONSTRAINT "supplier_products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."suppliers"
    ADD CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_active_orgs"
    ADD CONSTRAINT "user_active_orgs_pkey" PRIMARY KEY ("user_id");



CREATE INDEX "audit_log_org_action_idx" ON "public"."audit_log" USING "btree" ("org_id", "action_key");



CREATE INDEX "audit_log_org_actor_idx" ON "public"."audit_log" USING "btree" ("org_id", "actor_user_id");



CREATE INDEX "audit_log_org_created_at_idx" ON "public"."audit_log" USING "btree" ("org_id", "created_at" DESC);



CREATE INDEX "cash_session_count_lines_org_branch_idx" ON "public"."cash_session_count_lines" USING "btree" ("org_id", "branch_id", "created_at" DESC);



CREATE INDEX "cash_session_count_lines_session_idx" ON "public"."cash_session_count_lines" USING "btree" ("session_id", "denomination_value" DESC);



CREATE INDEX "cash_session_count_lines_session_scope_idx" ON "public"."cash_session_count_lines" USING "btree" ("session_id", "count_scope", "denomination_value" DESC);



CREATE INDEX "cash_session_movements_org_branch_idx" ON "public"."cash_session_movements" USING "btree" ("org_id", "branch_id", "created_at" DESC);



CREATE INDEX "cash_session_movements_session_idx" ON "public"."cash_session_movements" USING "btree" ("session_id", "created_at" DESC);



CREATE UNIQUE INDEX "cash_session_movements_supplier_payment_uniq_idx" ON "public"."cash_session_movements" USING "btree" ("supplier_payment_id") WHERE ("supplier_payment_id" IS NOT NULL);



CREATE UNIQUE INDEX "cash_sessions_open_unique" ON "public"."cash_sessions" USING "btree" ("org_id", "branch_id") WHERE ("status" = 'open'::"text");



CREATE INDEX "cash_sessions_org_branch_status_idx" ON "public"."cash_sessions" USING "btree" ("org_id", "branch_id", "status", "opened_at" DESC);



CREATE INDEX "cash_sessions_org_created_idx" ON "public"."cash_sessions" USING "btree" ("org_id", "created_at" DESC);



CREATE INDEX "expiration_waste_org_branch_idx" ON "public"."expiration_waste" USING "btree" ("org_id", "branch_id", "created_at" DESC);



CREATE INDEX "pos_payment_devices_org_branch_active_idx" ON "public"."pos_payment_devices" USING "btree" ("org_id", "branch_id", "is_active", "device_name");



CREATE UNIQUE INDEX "products_org_barcode_uq" ON "public"."products" USING "btree" ("org_id", "barcode") WHERE ("barcode" IS NOT NULL);



CREATE UNIQUE INDEX "products_org_internal_code_uq" ON "public"."products" USING "btree" ("org_id", "internal_code") WHERE ("internal_code" IS NOT NULL);



CREATE INDEX "sale_payments_org_id_idx" ON "public"."sale_payments" USING "btree" ("org_id");



CREATE INDEX "sale_payments_payment_device_id_idx" ON "public"."sale_payments" USING "btree" ("payment_device_id");



CREATE INDEX "sale_payments_payment_method_idx" ON "public"."sale_payments" USING "btree" ("payment_method");



CREATE INDEX "sale_payments_sale_id_idx" ON "public"."sale_payments" USING "btree" ("sale_id");



CREATE INDEX "supplier_orders_expected_receive_on_idx" ON "public"."supplier_orders" USING "btree" ("org_id", "branch_id", "expected_receive_on") WHERE ("expected_receive_on" IS NOT NULL);



CREATE INDEX "supplier_payables_org_branch_status_due_idx" ON "public"."supplier_payables" USING "btree" ("org_id", "branch_id", "status", "due_on", "created_at" DESC);



CREATE INDEX "supplier_payables_org_supplier_status_idx" ON "public"."supplier_payables" USING "btree" ("org_id", "supplier_id", "status", "created_at" DESC);



CREATE UNIQUE INDEX "supplier_payment_accounts_org_supplier_identifier_uk" ON "public"."supplier_payment_accounts" USING "btree" ("org_id", "supplier_id", "account_identifier") WHERE (("account_identifier" IS NOT NULL) AND ("length"(TRIM(BOTH FROM "account_identifier")) > 0));



CREATE INDEX "supplier_payment_accounts_org_supplier_idx" ON "public"."supplier_payment_accounts" USING "btree" ("org_id", "supplier_id", "is_active", "created_at" DESC);



CREATE INDEX "supplier_payments_org_branch_idx" ON "public"."supplier_payments" USING "btree" ("org_id", "branch_id", "paid_at" DESC);



CREATE INDEX "supplier_payments_payable_paid_at_idx" ON "public"."supplier_payments" USING "btree" ("payable_id", "paid_at" DESC);



CREATE OR REPLACE VIEW "public"."v_products_admin" AS
 SELECT "p"."id" AS "product_id",
    "p"."org_id",
    "p"."name",
    "p"."internal_code",
    "p"."barcode",
    "p"."sell_unit_type",
    "p"."uom",
    "p"."unit_price",
    "p"."is_active",
    "p"."created_at",
    "p"."updated_at",
    COALESCE("sum"(COALESCE("si"."quantity_on_hand", (0)::numeric)), (0)::numeric) AS "stock_total",
    "jsonb_agg"("jsonb_build_object"('branch_id', "b"."id", 'branch_name', "b"."name", 'quantity_on_hand', COALESCE("si"."quantity_on_hand", (0)::numeric)) ORDER BY "b"."name") AS "stock_by_branch",
    "p"."shelf_life_days"
   FROM (("public"."products" "p"
     JOIN "public"."branches" "b" ON (("b"."org_id" = "p"."org_id")))
     LEFT JOIN "public"."stock_items" "si" ON ((("si"."product_id" = "p"."id") AND ("si"."branch_id" = "b"."id") AND ("si"."org_id" = "p"."org_id"))))
  GROUP BY "p"."id";



CREATE OR REPLACE TRIGGER "set_branch_memberships_updated_at" BEFORE UPDATE ON "public"."branch_memberships" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_branches_updated_at" BEFORE UPDATE ON "public"."branches" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_client_special_order_items_updated_at" BEFORE UPDATE ON "public"."client_special_order_items" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_client_special_orders_updated_at" BEFORE UPDATE ON "public"."client_special_orders" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_clients_updated_at" BEFORE UPDATE ON "public"."clients" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_expiration_batches_updated_at" BEFORE UPDATE ON "public"."expiration_batches" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_org_preferences_updated_at" BEFORE UPDATE ON "public"."org_preferences" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_org_users_updated_at" BEFORE UPDATE ON "public"."org_users" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_orgs_updated_at" BEFORE UPDATE ON "public"."orgs" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_products_updated_at" BEFORE UPDATE ON "public"."products" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_staff_module_access_updated_at" BEFORE UPDATE ON "public"."staff_module_access" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_stock_items_updated_at" BEFORE UPDATE ON "public"."stock_items" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_supplier_orders_updated_at" BEFORE UPDATE ON "public"."supplier_orders" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_suppliers_updated_at" BEFORE UPDATE ON "public"."suppliers" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_branches_seed_pos_payment_devices" AFTER INSERT ON "public"."branches" FOR EACH ROW EXECUTE FUNCTION "public"."trg_seed_pos_payment_devices_for_branch"();



CREATE OR REPLACE TRIGGER "trg_supplier_orders_sync_payable" AFTER INSERT OR UPDATE OF "status", "supplier_id", "branch_id", "received_at", "reconciled_at" ON "public"."supplier_orders" FOR EACH ROW EXECUTE FUNCTION "public"."trg_sync_supplier_payable_from_order"();



ALTER TABLE ONLY "public"."audit_log"
    ADD CONSTRAINT "audit_log_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."audit_log"
    ADD CONSTRAINT "audit_log_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."audit_log"
    ADD CONSTRAINT "audit_log_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."branch_memberships"
    ADD CONSTRAINT "branch_memberships_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."branch_memberships"
    ADD CONSTRAINT "branch_memberships_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."branch_memberships"
    ADD CONSTRAINT "branch_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."branches"
    ADD CONSTRAINT "branches_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cash_session_count_lines"
    ADD CONSTRAINT "cash_session_count_lines_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cash_session_count_lines"
    ADD CONSTRAINT "cash_session_count_lines_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cash_session_count_lines"
    ADD CONSTRAINT "cash_session_count_lines_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."cash_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cash_session_movements"
    ADD CONSTRAINT "cash_session_movements_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cash_session_movements"
    ADD CONSTRAINT "cash_session_movements_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."cash_session_movements"
    ADD CONSTRAINT "cash_session_movements_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cash_session_movements"
    ADD CONSTRAINT "cash_session_movements_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."cash_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cash_session_movements"
    ADD CONSTRAINT "cash_session_movements_supplier_payment_id_fkey" FOREIGN KEY ("supplier_payment_id") REFERENCES "public"."supplier_payments"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."cash_sessions"
    ADD CONSTRAINT "cash_sessions_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cash_sessions"
    ADD CONSTRAINT "cash_sessions_closed_by_fkey" FOREIGN KEY ("closed_by") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."cash_sessions"
    ADD CONSTRAINT "cash_sessions_opened_by_fkey" FOREIGN KEY ("opened_by") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."cash_sessions"
    ADD CONSTRAINT "cash_sessions_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_special_order_items"
    ADD CONSTRAINT "client_special_order_items_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_special_order_items"
    ADD CONSTRAINT "client_special_order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."client_special_order_items"
    ADD CONSTRAINT "client_special_order_items_special_order_id_fkey" FOREIGN KEY ("special_order_id") REFERENCES "public"."client_special_orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_special_order_items"
    ADD CONSTRAINT "client_special_order_items_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."client_special_order_items"
    ADD CONSTRAINT "client_special_order_items_supplier_order_id_fkey" FOREIGN KEY ("supplier_order_id") REFERENCES "public"."supplier_orders"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."client_special_orders"
    ADD CONSTRAINT "client_special_orders_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."client_special_orders"
    ADD CONSTRAINT "client_special_orders_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_special_orders"
    ADD CONSTRAINT "client_special_orders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."client_special_orders"
    ADD CONSTRAINT "client_special_orders_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."expiration_batches"
    ADD CONSTRAINT "expiration_batches_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."expiration_batches"
    ADD CONSTRAINT "expiration_batches_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."expiration_batches"
    ADD CONSTRAINT "expiration_batches_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."expiration_waste"
    ADD CONSTRAINT "expiration_waste_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "public"."expiration_batches"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."expiration_waste"
    ADD CONSTRAINT "expiration_waste_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."expiration_waste"
    ADD CONSTRAINT "expiration_waste_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."expiration_waste"
    ADD CONSTRAINT "expiration_waste_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."expiration_waste"
    ADD CONSTRAINT "expiration_waste_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."org_preferences"
    ADD CONSTRAINT "org_preferences_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."org_users"
    ADD CONSTRAINT "org_users_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."org_users"
    ADD CONSTRAINT "org_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."platform_admins"
    ADD CONSTRAINT "platform_admins_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."platform_admins"
    ADD CONSTRAINT "platform_admins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pos_payment_devices"
    ADD CONSTRAINT "pos_payment_devices_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pos_payment_devices"
    ADD CONSTRAINT "pos_payment_devices_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."pos_payment_devices"
    ADD CONSTRAINT "pos_payment_devices_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pos_payment_devices"
    ADD CONSTRAINT "pos_payment_devices_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sale_items"
    ADD CONSTRAINT "sale_items_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sale_items"
    ADD CONSTRAINT "sale_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."sale_items"
    ADD CONSTRAINT "sale_items_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sale_payments"
    ADD CONSTRAINT "sale_payments_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sale_payments"
    ADD CONSTRAINT "sale_payments_payment_device_id_fkey" FOREIGN KEY ("payment_device_id") REFERENCES "public"."pos_payment_devices"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."sale_payments"
    ADD CONSTRAINT "sale_payments_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sales"
    ADD CONSTRAINT "sales_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sales"
    ADD CONSTRAINT "sales_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."sales"
    ADD CONSTRAINT "sales_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."staff_module_access"
    ADD CONSTRAINT "staff_module_access_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."staff_module_access"
    ADD CONSTRAINT "staff_module_access_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stock_items"
    ADD CONSTRAINT "stock_items_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stock_items"
    ADD CONSTRAINT "stock_items_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stock_items"
    ADD CONSTRAINT "stock_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."supplier_order_items"
    ADD CONSTRAINT "supplier_order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."supplier_orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."supplier_order_items"
    ADD CONSTRAINT "supplier_order_items_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."supplier_order_items"
    ADD CONSTRAINT "supplier_order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."supplier_orders"
    ADD CONSTRAINT "supplier_orders_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."supplier_orders"
    ADD CONSTRAINT "supplier_orders_controlled_by_user_id_fkey" FOREIGN KEY ("controlled_by_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."supplier_orders"
    ADD CONSTRAINT "supplier_orders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."supplier_orders"
    ADD CONSTRAINT "supplier_orders_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."supplier_orders"
    ADD CONSTRAINT "supplier_orders_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."supplier_payables"
    ADD CONSTRAINT "supplier_payables_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."supplier_payables"
    ADD CONSTRAINT "supplier_payables_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."supplier_payables"
    ADD CONSTRAINT "supplier_payables_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."supplier_orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."supplier_payables"
    ADD CONSTRAINT "supplier_payables_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."supplier_payables"
    ADD CONSTRAINT "supplier_payables_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."supplier_payables"
    ADD CONSTRAINT "supplier_payables_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."supplier_payment_accounts"
    ADD CONSTRAINT "supplier_payment_accounts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."supplier_payment_accounts"
    ADD CONSTRAINT "supplier_payment_accounts_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."supplier_payment_accounts"
    ADD CONSTRAINT "supplier_payment_accounts_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."supplier_payment_accounts"
    ADD CONSTRAINT "supplier_payment_accounts_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."supplier_payments"
    ADD CONSTRAINT "supplier_payments_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."supplier_payments"
    ADD CONSTRAINT "supplier_payments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."supplier_payments"
    ADD CONSTRAINT "supplier_payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."supplier_orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."supplier_payments"
    ADD CONSTRAINT "supplier_payments_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."supplier_payments"
    ADD CONSTRAINT "supplier_payments_payable_id_fkey" FOREIGN KEY ("payable_id") REFERENCES "public"."supplier_payables"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."supplier_payments"
    ADD CONSTRAINT "supplier_payments_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."supplier_payments"
    ADD CONSTRAINT "supplier_payments_transfer_account_id_fkey" FOREIGN KEY ("transfer_account_id") REFERENCES "public"."supplier_payment_accounts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."supplier_products"
    ADD CONSTRAINT "supplier_products_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."supplier_products"
    ADD CONSTRAINT "supplier_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."supplier_products"
    ADD CONSTRAINT "supplier_products_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."suppliers"
    ADD CONSTRAINT "suppliers_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_active_orgs"
    ADD CONSTRAINT "user_active_orgs_active_org_id_fkey" FOREIGN KEY ("active_org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_active_orgs"
    ADD CONSTRAINT "user_active_orgs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE "public"."audit_log" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "audit_log_select" ON "public"."audit_log" FOR SELECT USING ("public"."is_org_admin_or_superadmin"("org_id"));



ALTER TABLE "public"."branch_memberships" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "branch_memberships_select" ON "public"."branch_memberships" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR "public"."is_org_admin"("org_id")));



CREATE POLICY "branch_memberships_update" ON "public"."branch_memberships" FOR UPDATE USING ("public"."is_org_admin"("org_id"));



CREATE POLICY "branch_memberships_write" ON "public"."branch_memberships" FOR INSERT WITH CHECK ("public"."is_org_admin"("org_id"));



ALTER TABLE "public"."branches" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "branches_select" ON "public"."branches" FOR SELECT USING ("public"."is_org_member"("org_id"));



CREATE POLICY "branches_select_platform_admin" ON "public"."branches" FOR SELECT USING ("public"."is_platform_admin"());



CREATE POLICY "branches_update" ON "public"."branches" FOR UPDATE USING ("public"."is_org_admin"("org_id"));



CREATE POLICY "branches_write" ON "public"."branches" FOR INSERT WITH CHECK ("public"."is_org_admin"("org_id"));



ALTER TABLE "public"."cash_session_count_lines" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "cash_session_count_lines_select" ON "public"."cash_session_count_lines" FOR SELECT USING ("public"."is_org_member"("org_id"));



CREATE POLICY "cash_session_count_lines_write" ON "public"."cash_session_count_lines" FOR INSERT WITH CHECK ("public"."is_org_member"("org_id"));



ALTER TABLE "public"."cash_session_movements" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "cash_session_movements_select" ON "public"."cash_session_movements" FOR SELECT USING ("public"."is_org_member"("org_id"));



CREATE POLICY "cash_session_movements_write" ON "public"."cash_session_movements" FOR INSERT WITH CHECK ("public"."is_org_member"("org_id"));



ALTER TABLE "public"."cash_sessions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "cash_sessions_select" ON "public"."cash_sessions" FOR SELECT USING ("public"."is_org_member"("org_id"));



CREATE POLICY "cash_sessions_update" ON "public"."cash_sessions" FOR UPDATE USING ("public"."is_org_member"("org_id"));



CREATE POLICY "cash_sessions_write" ON "public"."cash_sessions" FOR INSERT WITH CHECK ("public"."is_org_member"("org_id"));



ALTER TABLE "public"."client_special_order_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "client_special_order_items_select" ON "public"."client_special_order_items" FOR SELECT USING ("public"."is_org_member"("org_id"));



CREATE POLICY "client_special_order_items_update" ON "public"."client_special_order_items" FOR UPDATE USING ("public"."is_org_member"("org_id"));



CREATE POLICY "client_special_order_items_write" ON "public"."client_special_order_items" FOR INSERT WITH CHECK ("public"."is_org_member"("org_id"));



ALTER TABLE "public"."client_special_orders" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "client_special_orders_select" ON "public"."client_special_orders" FOR SELECT USING ("public"."is_org_member"("org_id"));



CREATE POLICY "client_special_orders_update" ON "public"."client_special_orders" FOR UPDATE USING ("public"."is_org_member"("org_id"));



CREATE POLICY "client_special_orders_write" ON "public"."client_special_orders" FOR INSERT WITH CHECK ("public"."is_org_member"("org_id"));



ALTER TABLE "public"."clients" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "clients_select" ON "public"."clients" FOR SELECT USING ("public"."is_org_member"("org_id"));



CREATE POLICY "clients_update" ON "public"."clients" FOR UPDATE USING ("public"."is_org_member"("org_id"));



CREATE POLICY "clients_write" ON "public"."clients" FOR INSERT WITH CHECK ("public"."is_org_member"("org_id"));



ALTER TABLE "public"."expiration_batches" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "expiration_batches_select" ON "public"."expiration_batches" FOR SELECT USING ("public"."is_org_member"("org_id"));



CREATE POLICY "expiration_batches_update" ON "public"."expiration_batches" FOR UPDATE USING ("public"."is_org_admin"("org_id"));



CREATE POLICY "expiration_batches_write" ON "public"."expiration_batches" FOR INSERT WITH CHECK ("public"."is_org_admin"("org_id"));



ALTER TABLE "public"."expiration_waste" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "expiration_waste_select" ON "public"."expiration_waste" FOR SELECT USING ("public"."is_org_member"("org_id"));



ALTER TABLE "public"."org_preferences" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "org_preferences_select" ON "public"."org_preferences" FOR SELECT USING ("public"."is_org_member"("org_id"));



CREATE POLICY "org_preferences_update" ON "public"."org_preferences" FOR UPDATE USING ("public"."is_org_admin"("org_id"));



CREATE POLICY "org_preferences_write" ON "public"."org_preferences" FOR INSERT WITH CHECK ("public"."is_org_admin"("org_id"));



ALTER TABLE "public"."org_users" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "org_users_select" ON "public"."org_users" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR "public"."is_org_admin"("org_id")));



CREATE POLICY "org_users_select_platform_admin" ON "public"."org_users" FOR SELECT USING ("public"."is_platform_admin"());



CREATE POLICY "org_users_update" ON "public"."org_users" FOR UPDATE USING ("public"."is_org_admin"("org_id"));



CREATE POLICY "org_users_write" ON "public"."org_users" FOR INSERT WITH CHECK ("public"."is_org_admin"("org_id"));



ALTER TABLE "public"."orgs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "orgs_select" ON "public"."orgs" FOR SELECT USING ("public"."is_org_member"("id"));



CREATE POLICY "orgs_select_platform_admin" ON "public"."orgs" FOR SELECT USING ("public"."is_platform_admin"());



CREATE POLICY "orgs_update" ON "public"."orgs" FOR UPDATE USING ("public"."is_org_admin"("id"));



ALTER TABLE "public"."platform_admins" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "platform_admins_delete" ON "public"."platform_admins" FOR DELETE USING ("public"."is_platform_admin"());



CREATE POLICY "platform_admins_select" ON "public"."platform_admins" FOR SELECT USING ("public"."is_platform_admin"());



CREATE POLICY "platform_admins_update" ON "public"."platform_admins" FOR UPDATE USING ("public"."is_platform_admin"()) WITH CHECK ("public"."is_platform_admin"());



CREATE POLICY "platform_admins_write" ON "public"."platform_admins" FOR INSERT WITH CHECK ("public"."is_platform_admin"());



ALTER TABLE "public"."pos_payment_devices" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "pos_payment_devices_select" ON "public"."pos_payment_devices" FOR SELECT USING ("public"."is_org_member"("org_id"));



CREATE POLICY "pos_payment_devices_update" ON "public"."pos_payment_devices" FOR UPDATE USING ("public"."is_org_member"("org_id"));



CREATE POLICY "pos_payment_devices_write" ON "public"."pos_payment_devices" FOR INSERT WITH CHECK ("public"."is_org_member"("org_id"));



ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "products_select" ON "public"."products" FOR SELECT USING ("public"."is_org_member"("org_id"));



CREATE POLICY "products_update" ON "public"."products" FOR UPDATE USING ("public"."is_org_admin"("org_id"));



CREATE POLICY "products_write" ON "public"."products" FOR INSERT WITH CHECK ("public"."is_org_admin"("org_id"));



ALTER TABLE "public"."sale_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sale_items_select" ON "public"."sale_items" FOR SELECT USING ("public"."is_org_member"("org_id"));



CREATE POLICY "sale_items_write" ON "public"."sale_items" FOR INSERT WITH CHECK ("public"."is_org_member"("org_id"));



ALTER TABLE "public"."sale_payments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sale_payments_select" ON "public"."sale_payments" FOR SELECT USING ("public"."is_org_member"("org_id"));



CREATE POLICY "sale_payments_write" ON "public"."sale_payments" FOR INSERT WITH CHECK ("public"."is_org_member"("org_id"));



ALTER TABLE "public"."sales" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sales_select" ON "public"."sales" FOR SELECT USING ("public"."is_org_member"("org_id"));



CREATE POLICY "sales_write" ON "public"."sales" FOR INSERT WITH CHECK ("public"."is_org_member"("org_id"));



ALTER TABLE "public"."staff_module_access" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "staff_module_access_select" ON "public"."staff_module_access" FOR SELECT USING ("public"."is_org_admin"("org_id"));



CREATE POLICY "staff_module_access_update" ON "public"."staff_module_access" FOR UPDATE USING ("public"."is_org_admin"("org_id"));



CREATE POLICY "staff_module_access_write" ON "public"."staff_module_access" FOR INSERT WITH CHECK ("public"."is_org_admin"("org_id"));



ALTER TABLE "public"."stock_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "stock_items_select" ON "public"."stock_items" FOR SELECT USING ("public"."is_org_member"("org_id"));



CREATE POLICY "stock_items_update" ON "public"."stock_items" FOR UPDATE USING ("public"."is_org_admin"("org_id"));



CREATE POLICY "stock_items_write" ON "public"."stock_items" FOR INSERT WITH CHECK ("public"."is_org_admin"("org_id"));



ALTER TABLE "public"."stock_movements" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "stock_movements_select" ON "public"."stock_movements" FOR SELECT USING ("public"."is_org_member"("org_id"));



CREATE POLICY "stock_movements_write" ON "public"."stock_movements" FOR INSERT WITH CHECK ("public"."is_org_member"("org_id"));



ALTER TABLE "public"."supplier_order_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "supplier_order_items_select" ON "public"."supplier_order_items" FOR SELECT USING ("public"."is_org_member"("org_id"));



CREATE POLICY "supplier_order_items_update" ON "public"."supplier_order_items" FOR UPDATE USING ("public"."is_org_admin"("org_id"));



CREATE POLICY "supplier_order_items_write" ON "public"."supplier_order_items" FOR INSERT WITH CHECK ("public"."is_org_admin"("org_id"));



ALTER TABLE "public"."supplier_orders" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "supplier_orders_select" ON "public"."supplier_orders" FOR SELECT USING ("public"."is_org_member"("org_id"));



CREATE POLICY "supplier_orders_update" ON "public"."supplier_orders" FOR UPDATE USING ("public"."is_org_admin"("org_id"));



CREATE POLICY "supplier_orders_write" ON "public"."supplier_orders" FOR INSERT WITH CHECK ("public"."is_org_admin"("org_id"));



ALTER TABLE "public"."supplier_payables" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "supplier_payables_select" ON "public"."supplier_payables" FOR SELECT USING ("public"."is_org_member"("org_id"));



CREATE POLICY "supplier_payables_update" ON "public"."supplier_payables" FOR UPDATE USING ("public"."is_org_admin_or_superadmin"("org_id"));



CREATE POLICY "supplier_payables_write" ON "public"."supplier_payables" FOR INSERT WITH CHECK ("public"."is_org_admin_or_superadmin"("org_id"));



ALTER TABLE "public"."supplier_payment_accounts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "supplier_payment_accounts_select" ON "public"."supplier_payment_accounts" FOR SELECT USING ("public"."is_org_member"("org_id"));



CREATE POLICY "supplier_payment_accounts_update" ON "public"."supplier_payment_accounts" FOR UPDATE USING ("public"."is_org_admin_or_superadmin"("org_id"));



CREATE POLICY "supplier_payment_accounts_write" ON "public"."supplier_payment_accounts" FOR INSERT WITH CHECK ("public"."is_org_admin_or_superadmin"("org_id"));



ALTER TABLE "public"."supplier_payments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "supplier_payments_select" ON "public"."supplier_payments" FOR SELECT USING ("public"."is_org_member"("org_id"));



CREATE POLICY "supplier_payments_update" ON "public"."supplier_payments" FOR UPDATE USING ("public"."is_org_admin_or_superadmin"("org_id"));



CREATE POLICY "supplier_payments_write" ON "public"."supplier_payments" FOR INSERT WITH CHECK ("public"."is_org_admin_or_superadmin"("org_id"));



ALTER TABLE "public"."supplier_products" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "supplier_products_select" ON "public"."supplier_products" FOR SELECT USING ("public"."is_org_member"("org_id"));



CREATE POLICY "supplier_products_update" ON "public"."supplier_products" FOR UPDATE USING ("public"."is_org_admin"("org_id"));



CREATE POLICY "supplier_products_write" ON "public"."supplier_products" FOR INSERT WITH CHECK ("public"."is_org_admin"("org_id"));



ALTER TABLE "public"."suppliers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "suppliers_select" ON "public"."suppliers" FOR SELECT USING ("public"."is_org_member"("org_id"));



CREATE POLICY "suppliers_update" ON "public"."suppliers" FOR UPDATE USING ("public"."is_org_admin"("org_id"));



CREATE POLICY "suppliers_write" ON "public"."suppliers" FOR INSERT WITH CHECK ("public"."is_org_admin"("org_id"));



ALTER TABLE "public"."user_active_orgs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_active_orgs_select" ON "public"."user_active_orgs" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR "public"."is_platform_admin"()));



CREATE POLICY "user_active_orgs_update" ON "public"."user_active_orgs" FOR UPDATE USING ((("user_id" = "auth"."uid"()) OR "public"."is_platform_admin"())) WITH CHECK ((("user_id" = "auth"."uid"()) OR "public"."is_platform_admin"()));



CREATE POLICY "user_active_orgs_write" ON "public"."user_active_orgs" FOR INSERT WITH CHECK ((("user_id" = "auth"."uid"()) OR "public"."is_platform_admin"()));



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_recompute_supplier_payable"("p_payable_id" "uuid", "p_actor_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_recompute_supplier_payable"("p_payable_id" "uuid", "p_actor_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_recompute_supplier_payable"("p_payable_id" "uuid", "p_actor_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_sync_supplier_payable_from_order"("p_org_id" "uuid", "p_order_id" "uuid", "p_actor_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_sync_supplier_payable_from_order"("p_org_id" "uuid", "p_order_id" "uuid", "p_actor_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_sync_supplier_payable_from_order"("p_org_id" "uuid", "p_order_id" "uuid", "p_actor_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_org_admin"("check_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_org_admin"("check_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_org_admin"("check_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_org_admin_or_superadmin"("check_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_org_admin_or_superadmin"("check_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_org_admin_or_superadmin"("check_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_org_member"("check_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_org_member"("check_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_org_member"("check_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_platform_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_platform_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_platform_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_add_cash_session_movement"("p_org_id" "uuid", "p_session_id" "uuid", "p_movement_type" "text", "p_category_key" "text", "p_amount" numeric, "p_note" "text", "p_movement_at" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_add_cash_session_movement"("p_org_id" "uuid", "p_session_id" "uuid", "p_movement_type" "text", "p_category_key" "text", "p_amount" numeric, "p_note" "text", "p_movement_at" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_add_cash_session_movement"("p_org_id" "uuid", "p_session_id" "uuid", "p_movement_type" "text", "p_category_key" "text", "p_amount" numeric, "p_note" "text", "p_movement_at" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_adjust_expiration_batch"("p_org_id" "uuid", "p_batch_id" "uuid", "p_new_quantity" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_adjust_expiration_batch"("p_org_id" "uuid", "p_batch_id" "uuid", "p_new_quantity" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_adjust_expiration_batch"("p_org_id" "uuid", "p_batch_id" "uuid", "p_new_quantity" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_adjust_stock_manual"("p_org_id" "uuid", "p_branch_id" "uuid", "p_product_id" "uuid", "p_new_quantity_on_hand" numeric, "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_adjust_stock_manual"("p_org_id" "uuid", "p_branch_id" "uuid", "p_product_id" "uuid", "p_new_quantity_on_hand" numeric, "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_adjust_stock_manual"("p_org_id" "uuid", "p_branch_id" "uuid", "p_product_id" "uuid", "p_new_quantity_on_hand" numeric, "p_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_bootstrap_platform_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_bootstrap_platform_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_bootstrap_platform_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_close_cash_session"("p_org_id" "uuid", "p_session_id" "uuid", "p_close_note" "text", "p_closed_controlled_by_name" "text", "p_close_confirmed" boolean, "p_closing_drawer_count_lines" "jsonb", "p_closing_reserve_count_lines" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_close_cash_session"("p_org_id" "uuid", "p_session_id" "uuid", "p_close_note" "text", "p_closed_controlled_by_name" "text", "p_close_confirmed" boolean, "p_closing_drawer_count_lines" "jsonb", "p_closing_reserve_count_lines" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_close_cash_session"("p_org_id" "uuid", "p_session_id" "uuid", "p_close_note" "text", "p_closed_controlled_by_name" "text", "p_close_confirmed" boolean, "p_closing_drawer_count_lines" "jsonb", "p_closing_reserve_count_lines" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_correct_sale_payment_method"("p_org_id" "uuid", "p_sale_payment_id" "uuid", "p_payment_method" "public"."payment_method", "p_payment_device_id" "uuid", "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_correct_sale_payment_method"("p_org_id" "uuid", "p_sale_payment_id" "uuid", "p_payment_method" "public"."payment_method", "p_payment_device_id" "uuid", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_correct_sale_payment_method"("p_org_id" "uuid", "p_sale_payment_id" "uuid", "p_payment_method" "public"."payment_method", "p_payment_device_id" "uuid", "p_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_create_expiration_batch_manual"("p_org_id" "uuid", "p_branch_id" "uuid", "p_product_id" "uuid", "p_expires_on" "date", "p_quantity" numeric, "p_source_ref_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_create_expiration_batch_manual"("p_org_id" "uuid", "p_branch_id" "uuid", "p_product_id" "uuid", "p_expires_on" "date", "p_quantity" numeric, "p_source_ref_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_create_expiration_batch_manual"("p_org_id" "uuid", "p_branch_id" "uuid", "p_product_id" "uuid", "p_expires_on" "date", "p_quantity" numeric, "p_source_ref_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_create_sale"("p_org_id" "uuid", "p_branch_id" "uuid", "p_payment_method" "public"."payment_method", "p_items" "jsonb", "p_special_order_id" "uuid", "p_close_special_order" boolean, "p_apply_cash_discount" boolean, "p_cash_discount_pct" numeric, "p_payments" "jsonb", "p_payment_device_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_create_sale"("p_org_id" "uuid", "p_branch_id" "uuid", "p_payment_method" "public"."payment_method", "p_items" "jsonb", "p_special_order_id" "uuid", "p_close_special_order" boolean, "p_apply_cash_discount" boolean, "p_cash_discount_pct" numeric, "p_payments" "jsonb", "p_payment_device_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_create_sale"("p_org_id" "uuid", "p_branch_id" "uuid", "p_payment_method" "public"."payment_method", "p_items" "jsonb", "p_special_order_id" "uuid", "p_close_special_order" boolean, "p_apply_cash_discount" boolean, "p_cash_discount_pct" numeric, "p_payments" "jsonb", "p_payment_device_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_create_special_order"("p_org_id" "uuid", "p_branch_id" "uuid", "p_client_id" "uuid", "p_items" "jsonb", "p_notes" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_create_special_order"("p_org_id" "uuid", "p_branch_id" "uuid", "p_client_id" "uuid", "p_items" "jsonb", "p_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_create_special_order"("p_org_id" "uuid", "p_branch_id" "uuid", "p_client_id" "uuid", "p_items" "jsonb", "p_notes" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_create_supplier_order"("p_org_id" "uuid", "p_branch_id" "uuid", "p_supplier_id" "uuid", "p_notes" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_create_supplier_order"("p_org_id" "uuid", "p_branch_id" "uuid", "p_supplier_id" "uuid", "p_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_create_supplier_order"("p_org_id" "uuid", "p_branch_id" "uuid", "p_supplier_id" "uuid", "p_notes" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_get_active_org_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_get_active_org_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_get_active_org_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_get_cash_session_payment_breakdown"("p_org_id" "uuid", "p_session_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_get_cash_session_payment_breakdown"("p_org_id" "uuid", "p_session_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_get_cash_session_payment_breakdown"("p_org_id" "uuid", "p_session_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_get_cash_session_summary"("p_org_id" "uuid", "p_session_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_get_cash_session_summary"("p_org_id" "uuid", "p_session_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_get_cash_session_summary"("p_org_id" "uuid", "p_session_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_get_client_detail"("p_org_id" "uuid", "p_client_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_get_client_detail"("p_org_id" "uuid", "p_client_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_get_client_detail"("p_org_id" "uuid", "p_client_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_get_dashboard_admin"("p_org_id" "uuid", "p_branch_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_get_dashboard_admin"("p_org_id" "uuid", "p_branch_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_get_dashboard_admin"("p_org_id" "uuid", "p_branch_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_get_special_order_for_pos"("p_org_id" "uuid", "p_special_order_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_get_special_order_for_pos"("p_org_id" "uuid", "p_special_order_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_get_special_order_for_pos"("p_org_id" "uuid", "p_special_order_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_get_staff_effective_modules"() TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_get_staff_effective_modules"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_get_staff_effective_modules"() TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_get_staff_module_access"("p_org_id" "uuid", "p_branch_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_get_staff_module_access"("p_org_id" "uuid", "p_branch_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_get_staff_module_access"("p_org_id" "uuid", "p_branch_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_invite_user_to_org"("p_org_id" "uuid", "p_email" "text", "p_role" "public"."user_role", "p_branch_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_invite_user_to_org"("p_org_id" "uuid", "p_email" "text", "p_role" "public"."user_role", "p_branch_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_invite_user_to_org"("p_org_id" "uuid", "p_email" "text", "p_role" "public"."user_role", "p_branch_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_list_clients"("p_org_id" "uuid", "p_branch_id" "uuid", "p_search" "text", "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_list_clients"("p_org_id" "uuid", "p_branch_id" "uuid", "p_search" "text", "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_list_clients"("p_org_id" "uuid", "p_branch_id" "uuid", "p_search" "text", "p_limit" integer, "p_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_log_audit_event"("p_org_id" "uuid", "p_action_key" "text", "p_entity_type" "text", "p_entity_id" "uuid", "p_branch_id" "uuid", "p_metadata" "jsonb", "p_actor_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_log_audit_event"("p_org_id" "uuid", "p_action_key" "text", "p_entity_type" "text", "p_entity_id" "uuid", "p_branch_id" "uuid", "p_metadata" "jsonb", "p_actor_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_log_audit_event"("p_org_id" "uuid", "p_action_key" "text", "p_entity_type" "text", "p_entity_id" "uuid", "p_branch_id" "uuid", "p_metadata" "jsonb", "p_actor_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_mark_special_order_items_ordered"("p_org_id" "uuid", "p_item_ids" "uuid"[], "p_supplier_order_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_mark_special_order_items_ordered"("p_org_id" "uuid", "p_item_ids" "uuid"[], "p_supplier_order_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_mark_special_order_items_ordered"("p_org_id" "uuid", "p_item_ids" "uuid"[], "p_supplier_order_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_move_expiration_batch_to_waste"("p_org_id" "uuid", "p_batch_id" "uuid", "p_expected_qty" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_move_expiration_batch_to_waste"("p_org_id" "uuid", "p_batch_id" "uuid", "p_expected_qty" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_move_expiration_batch_to_waste"("p_org_id" "uuid", "p_batch_id" "uuid", "p_expected_qty" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_open_cash_session"("p_org_id" "uuid", "p_branch_id" "uuid", "p_period_type" "text", "p_session_label" "text", "p_opening_drawer_count_lines" "jsonb", "p_opening_reserve_count_lines" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_open_cash_session"("p_org_id" "uuid", "p_branch_id" "uuid", "p_period_type" "text", "p_session_label" "text", "p_opening_drawer_count_lines" "jsonb", "p_opening_reserve_count_lines" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_open_cash_session"("p_org_id" "uuid", "p_branch_id" "uuid", "p_period_type" "text", "p_session_label" "text", "p_opening_drawer_count_lines" "jsonb", "p_opening_reserve_count_lines" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_receive_supplier_order"("p_org_id" "uuid", "p_order_id" "uuid", "p_items" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_receive_supplier_order"("p_org_id" "uuid", "p_order_id" "uuid", "p_items" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_receive_supplier_order"("p_org_id" "uuid", "p_order_id" "uuid", "p_items" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_receive_supplier_order"("p_org_id" "uuid", "p_order_id" "uuid", "p_items" "jsonb", "p_received_at" timestamp with time zone, "p_controlled_by_user_id" "uuid", "p_controlled_by_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_receive_supplier_order"("p_org_id" "uuid", "p_order_id" "uuid", "p_items" "jsonb", "p_received_at" timestamp with time zone, "p_controlled_by_user_id" "uuid", "p_controlled_by_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_receive_supplier_order"("p_org_id" "uuid", "p_order_id" "uuid", "p_items" "jsonb", "p_received_at" timestamp with time zone, "p_controlled_by_user_id" "uuid", "p_controlled_by_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_reconcile_supplier_order"("p_org_id" "uuid", "p_order_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_reconcile_supplier_order"("p_org_id" "uuid", "p_order_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_reconcile_supplier_order"("p_org_id" "uuid", "p_order_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_reconcile_supplier_order"("p_org_id" "uuid", "p_order_id" "uuid", "p_controlled_by_user_id" "uuid", "p_controlled_by_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_reconcile_supplier_order"("p_org_id" "uuid", "p_order_id" "uuid", "p_controlled_by_user_id" "uuid", "p_controlled_by_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_reconcile_supplier_order"("p_org_id" "uuid", "p_order_id" "uuid", "p_controlled_by_user_id" "uuid", "p_controlled_by_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_register_supplier_payment"("p_org_id" "uuid", "p_payable_id" "uuid", "p_amount" numeric, "p_payment_method" "public"."payment_method", "p_paid_at" timestamp with time zone, "p_transfer_account_id" "uuid", "p_reference" "text", "p_note" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_register_supplier_payment"("p_org_id" "uuid", "p_payable_id" "uuid", "p_amount" numeric, "p_payment_method" "public"."payment_method", "p_paid_at" timestamp with time zone, "p_transfer_account_id" "uuid", "p_reference" "text", "p_note" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_register_supplier_payment"("p_org_id" "uuid", "p_payable_id" "uuid", "p_amount" numeric, "p_payment_method" "public"."payment_method", "p_paid_at" timestamp with time zone, "p_transfer_account_id" "uuid", "p_reference" "text", "p_note" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_remove_supplier_order_item"("p_org_id" "uuid", "p_order_id" "uuid", "p_product_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_remove_supplier_order_item"("p_org_id" "uuid", "p_order_id" "uuid", "p_product_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_remove_supplier_order_item"("p_org_id" "uuid", "p_order_id" "uuid", "p_product_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_remove_supplier_product"("p_org_id" "uuid", "p_supplier_id" "uuid", "p_product_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_remove_supplier_product"("p_org_id" "uuid", "p_supplier_id" "uuid", "p_product_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_remove_supplier_product"("p_org_id" "uuid", "p_supplier_id" "uuid", "p_product_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_remove_supplier_product_relation"("p_org_id" "uuid", "p_product_id" "uuid", "p_relation_type" "public"."supplier_product_relation_type") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_remove_supplier_product_relation"("p_org_id" "uuid", "p_product_id" "uuid", "p_relation_type" "public"."supplier_product_relation_type") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_remove_supplier_product_relation"("p_org_id" "uuid", "p_product_id" "uuid", "p_relation_type" "public"."supplier_product_relation_type") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_set_safety_stock"("p_org_id" "uuid", "p_branch_id" "uuid", "p_product_id" "uuid", "p_safety_stock" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_set_safety_stock"("p_org_id" "uuid", "p_branch_id" "uuid", "p_product_id" "uuid", "p_safety_stock" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_set_safety_stock"("p_org_id" "uuid", "p_branch_id" "uuid", "p_product_id" "uuid", "p_safety_stock" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_set_special_order_status"("p_org_id" "uuid", "p_special_order_id" "uuid", "p_status" "public"."special_order_status") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_set_special_order_status"("p_org_id" "uuid", "p_special_order_id" "uuid", "p_status" "public"."special_order_status") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_set_special_order_status"("p_org_id" "uuid", "p_special_order_id" "uuid", "p_status" "public"."special_order_status") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_set_staff_module_access"("p_org_id" "uuid", "p_branch_id" "uuid", "p_module_key" "text", "p_is_enabled" boolean, "p_role" "public"."user_role") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_set_staff_module_access"("p_org_id" "uuid", "p_branch_id" "uuid", "p_module_key" "text", "p_is_enabled" boolean, "p_role" "public"."user_role") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_set_staff_module_access"("p_org_id" "uuid", "p_branch_id" "uuid", "p_module_key" "text", "p_is_enabled" boolean, "p_role" "public"."user_role") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_set_supplier_order_expected_receive_on"("p_org_id" "uuid", "p_order_id" "uuid", "p_expected_receive_on" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_set_supplier_order_expected_receive_on"("p_org_id" "uuid", "p_order_id" "uuid", "p_expected_receive_on" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_set_supplier_order_expected_receive_on"("p_org_id" "uuid", "p_order_id" "uuid", "p_expected_receive_on" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_set_supplier_order_status"("p_org_id" "uuid", "p_order_id" "uuid", "p_status" "public"."supplier_order_status") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_set_supplier_order_status"("p_org_id" "uuid", "p_order_id" "uuid", "p_status" "public"."supplier_order_status") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_set_supplier_order_status"("p_org_id" "uuid", "p_order_id" "uuid", "p_status" "public"."supplier_order_status") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_set_supplier_payment_account_active"("p_org_id" "uuid", "p_account_id" "uuid", "p_is_active" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_set_supplier_payment_account_active"("p_org_id" "uuid", "p_account_id" "uuid", "p_is_active" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_set_supplier_payment_account_active"("p_org_id" "uuid", "p_account_id" "uuid", "p_is_active" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_superadmin_create_org"("p_org_name" "text", "p_timezone" "text", "p_initial_branch_name" "text", "p_initial_branch_address" "text", "p_owner_user_id" "uuid", "p_owner_display_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_superadmin_create_org"("p_org_name" "text", "p_timezone" "text", "p_initial_branch_name" "text", "p_initial_branch_address" "text", "p_owner_user_id" "uuid", "p_owner_display_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_superadmin_create_org"("p_org_name" "text", "p_timezone" "text", "p_initial_branch_name" "text", "p_initial_branch_address" "text", "p_owner_user_id" "uuid", "p_owner_display_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_superadmin_set_active_org"("p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_superadmin_set_active_org"("p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_superadmin_set_active_org"("p_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_superadmin_upsert_branch"("p_org_id" "uuid", "p_branch_id" "uuid", "p_name" "text", "p_address" "text", "p_is_active" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_superadmin_upsert_branch"("p_org_id" "uuid", "p_branch_id" "uuid", "p_name" "text", "p_address" "text", "p_is_active" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_superadmin_upsert_branch"("p_org_id" "uuid", "p_branch_id" "uuid", "p_name" "text", "p_address" "text", "p_is_active" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_sync_supplier_payable_from_order"("p_org_id" "uuid", "p_order_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_sync_supplier_payable_from_order"("p_org_id" "uuid", "p_order_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_sync_supplier_payable_from_order"("p_org_id" "uuid", "p_order_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_update_expiration_batch_date"("p_org_id" "uuid", "p_batch_id" "uuid", "p_new_expires_on" "date", "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_update_expiration_batch_date"("p_org_id" "uuid", "p_batch_id" "uuid", "p_new_expires_on" "date", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_update_expiration_batch_date"("p_org_id" "uuid", "p_batch_id" "uuid", "p_new_expires_on" "date", "p_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_update_supplier_payable"("p_org_id" "uuid", "p_payable_id" "uuid", "p_invoice_amount" numeric, "p_due_on" "date", "p_invoice_reference" "text", "p_invoice_photo_url" "text", "p_invoice_note" "text", "p_selected_payment_method" "public"."payment_method") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_update_supplier_payable"("p_org_id" "uuid", "p_payable_id" "uuid", "p_invoice_amount" numeric, "p_due_on" "date", "p_invoice_reference" "text", "p_invoice_photo_url" "text", "p_invoice_note" "text", "p_selected_payment_method" "public"."payment_method") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_update_supplier_payable"("p_org_id" "uuid", "p_payable_id" "uuid", "p_invoice_amount" numeric, "p_due_on" "date", "p_invoice_reference" "text", "p_invoice_photo_url" "text", "p_invoice_note" "text", "p_selected_payment_method" "public"."payment_method") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_update_user_membership"("p_org_id" "uuid", "p_user_id" "uuid", "p_role" "public"."user_role", "p_is_active" boolean, "p_display_name" "text", "p_branch_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_update_user_membership"("p_org_id" "uuid", "p_user_id" "uuid", "p_role" "public"."user_role", "p_is_active" boolean, "p_display_name" "text", "p_branch_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_update_user_membership"("p_org_id" "uuid", "p_user_id" "uuid", "p_role" "public"."user_role", "p_is_active" boolean, "p_display_name" "text", "p_branch_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_upsert_branch"("p_branch_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_address" "text", "p_is_active" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_upsert_branch"("p_branch_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_address" "text", "p_is_active" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_upsert_branch"("p_branch_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_address" "text", "p_is_active" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_upsert_client"("p_client_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_phone" "text", "p_email" "text", "p_notes" "text", "p_is_active" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_upsert_client"("p_client_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_phone" "text", "p_email" "text", "p_notes" "text", "p_is_active" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_upsert_client"("p_client_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_phone" "text", "p_email" "text", "p_notes" "text", "p_is_active" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_upsert_product"("p_product_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_internal_code" "text", "p_barcode" "text", "p_sell_unit_type" "public"."sell_unit_type", "p_uom" "text", "p_unit_price" numeric, "p_is_active" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_upsert_product"("p_product_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_internal_code" "text", "p_barcode" "text", "p_sell_unit_type" "public"."sell_unit_type", "p_uom" "text", "p_unit_price" numeric, "p_is_active" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_upsert_product"("p_product_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_internal_code" "text", "p_barcode" "text", "p_sell_unit_type" "public"."sell_unit_type", "p_uom" "text", "p_unit_price" numeric, "p_is_active" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_upsert_product"("p_product_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_internal_code" "text", "p_barcode" "text", "p_sell_unit_type" "public"."sell_unit_type", "p_uom" "text", "p_unit_price" numeric, "p_is_active" boolean, "p_shelf_life_days" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_upsert_product"("p_product_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_internal_code" "text", "p_barcode" "text", "p_sell_unit_type" "public"."sell_unit_type", "p_uom" "text", "p_unit_price" numeric, "p_is_active" boolean, "p_shelf_life_days" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_upsert_product"("p_product_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_internal_code" "text", "p_barcode" "text", "p_sell_unit_type" "public"."sell_unit_type", "p_uom" "text", "p_unit_price" numeric, "p_is_active" boolean, "p_shelf_life_days" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_upsert_supplier"("p_supplier_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_contact_name" "text", "p_phone" "text", "p_email" "text", "p_notes" "text", "p_is_active" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_upsert_supplier"("p_supplier_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_contact_name" "text", "p_phone" "text", "p_email" "text", "p_notes" "text", "p_is_active" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_upsert_supplier"("p_supplier_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_contact_name" "text", "p_phone" "text", "p_email" "text", "p_notes" "text", "p_is_active" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_upsert_supplier"("p_supplier_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_contact_name" "text", "p_phone" "text", "p_email" "text", "p_notes" "text", "p_is_active" boolean, "p_order_frequency" "public"."order_frequency", "p_order_day" "public"."weekday", "p_receive_day" "public"."weekday") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_upsert_supplier"("p_supplier_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_contact_name" "text", "p_phone" "text", "p_email" "text", "p_notes" "text", "p_is_active" boolean, "p_order_frequency" "public"."order_frequency", "p_order_day" "public"."weekday", "p_receive_day" "public"."weekday") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_upsert_supplier"("p_supplier_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_contact_name" "text", "p_phone" "text", "p_email" "text", "p_notes" "text", "p_is_active" boolean, "p_order_frequency" "public"."order_frequency", "p_order_day" "public"."weekday", "p_receive_day" "public"."weekday") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_upsert_supplier"("p_supplier_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_contact_name" "text", "p_phone" "text", "p_email" "text", "p_notes" "text", "p_is_active" boolean, "p_order_frequency" "public"."order_frequency", "p_order_day" "public"."weekday", "p_receive_day" "public"."weekday", "p_payment_terms_days" integer, "p_preferred_payment_method" "public"."payment_method", "p_accepts_cash" boolean, "p_accepts_transfer" boolean, "p_payment_note" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_upsert_supplier"("p_supplier_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_contact_name" "text", "p_phone" "text", "p_email" "text", "p_notes" "text", "p_is_active" boolean, "p_order_frequency" "public"."order_frequency", "p_order_day" "public"."weekday", "p_receive_day" "public"."weekday", "p_payment_terms_days" integer, "p_preferred_payment_method" "public"."payment_method", "p_accepts_cash" boolean, "p_accepts_transfer" boolean, "p_payment_note" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_upsert_supplier"("p_supplier_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_contact_name" "text", "p_phone" "text", "p_email" "text", "p_notes" "text", "p_is_active" boolean, "p_order_frequency" "public"."order_frequency", "p_order_day" "public"."weekday", "p_receive_day" "public"."weekday", "p_payment_terms_days" integer, "p_preferred_payment_method" "public"."payment_method", "p_accepts_cash" boolean, "p_accepts_transfer" boolean, "p_payment_note" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_upsert_supplier_order_item"("p_org_id" "uuid", "p_order_id" "uuid", "p_product_id" "uuid", "p_ordered_qty" numeric, "p_unit_cost" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_upsert_supplier_order_item"("p_org_id" "uuid", "p_order_id" "uuid", "p_product_id" "uuid", "p_ordered_qty" numeric, "p_unit_cost" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_upsert_supplier_order_item"("p_org_id" "uuid", "p_order_id" "uuid", "p_product_id" "uuid", "p_ordered_qty" numeric, "p_unit_cost" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_upsert_supplier_payment_account"("p_org_id" "uuid", "p_supplier_id" "uuid", "p_account_id" "uuid", "p_account_label" "text", "p_bank_name" "text", "p_account_holder_name" "text", "p_account_identifier" "text", "p_is_active" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_upsert_supplier_payment_account"("p_org_id" "uuid", "p_supplier_id" "uuid", "p_account_id" "uuid", "p_account_label" "text", "p_bank_name" "text", "p_account_holder_name" "text", "p_account_identifier" "text", "p_is_active" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_upsert_supplier_payment_account"("p_org_id" "uuid", "p_supplier_id" "uuid", "p_account_id" "uuid", "p_account_label" "text", "p_bank_name" "text", "p_account_holder_name" "text", "p_account_identifier" "text", "p_is_active" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_upsert_supplier_product"("p_org_id" "uuid", "p_supplier_id" "uuid", "p_product_id" "uuid", "p_supplier_sku" "text", "p_supplier_product_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_upsert_supplier_product"("p_org_id" "uuid", "p_supplier_id" "uuid", "p_product_id" "uuid", "p_supplier_sku" "text", "p_supplier_product_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_upsert_supplier_product"("p_org_id" "uuid", "p_supplier_id" "uuid", "p_product_id" "uuid", "p_supplier_sku" "text", "p_supplier_product_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_upsert_supplier_product"("p_org_id" "uuid", "p_supplier_id" "uuid", "p_product_id" "uuid", "p_supplier_sku" "text", "p_supplier_product_name" "text", "p_relation_type" "public"."supplier_product_relation_type") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_upsert_supplier_product"("p_org_id" "uuid", "p_supplier_id" "uuid", "p_product_id" "uuid", "p_supplier_sku" "text", "p_supplier_product_name" "text", "p_relation_type" "public"."supplier_product_relation_type") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_upsert_supplier_product"("p_org_id" "uuid", "p_supplier_id" "uuid", "p_product_id" "uuid", "p_supplier_sku" "text", "p_supplier_product_name" "text", "p_relation_type" "public"."supplier_product_relation_type") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_seed_pos_payment_devices_for_branch"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_seed_pos_payment_devices_for_branch"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_seed_pos_payment_devices_for_branch"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_sync_supplier_payable_from_order"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_sync_supplier_payable_from_order"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_sync_supplier_payable_from_order"() TO "service_role";



GRANT ALL ON TABLE "public"."audit_log" TO "anon";
GRANT ALL ON TABLE "public"."audit_log" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_log" TO "service_role";



GRANT ALL ON TABLE "public"."branch_memberships" TO "anon";
GRANT ALL ON TABLE "public"."branch_memberships" TO "authenticated";
GRANT ALL ON TABLE "public"."branch_memberships" TO "service_role";



GRANT ALL ON TABLE "public"."branches" TO "anon";
GRANT ALL ON TABLE "public"."branches" TO "authenticated";
GRANT ALL ON TABLE "public"."branches" TO "service_role";



GRANT ALL ON TABLE "public"."cash_session_count_lines" TO "anon";
GRANT ALL ON TABLE "public"."cash_session_count_lines" TO "authenticated";
GRANT ALL ON TABLE "public"."cash_session_count_lines" TO "service_role";



GRANT ALL ON TABLE "public"."cash_session_movements" TO "anon";
GRANT ALL ON TABLE "public"."cash_session_movements" TO "authenticated";
GRANT ALL ON TABLE "public"."cash_session_movements" TO "service_role";



GRANT ALL ON TABLE "public"."cash_sessions" TO "anon";
GRANT ALL ON TABLE "public"."cash_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."cash_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."client_special_order_items" TO "anon";
GRANT ALL ON TABLE "public"."client_special_order_items" TO "authenticated";
GRANT ALL ON TABLE "public"."client_special_order_items" TO "service_role";



GRANT ALL ON TABLE "public"."client_special_orders" TO "anon";
GRANT ALL ON TABLE "public"."client_special_orders" TO "authenticated";
GRANT ALL ON TABLE "public"."client_special_orders" TO "service_role";



GRANT ALL ON TABLE "public"."clients" TO "anon";
GRANT ALL ON TABLE "public"."clients" TO "authenticated";
GRANT ALL ON TABLE "public"."clients" TO "service_role";



GRANT ALL ON TABLE "public"."expiration_batches" TO "anon";
GRANT ALL ON TABLE "public"."expiration_batches" TO "authenticated";
GRANT ALL ON TABLE "public"."expiration_batches" TO "service_role";



GRANT ALL ON TABLE "public"."expiration_waste" TO "anon";
GRANT ALL ON TABLE "public"."expiration_waste" TO "authenticated";
GRANT ALL ON TABLE "public"."expiration_waste" TO "service_role";



GRANT ALL ON TABLE "public"."org_preferences" TO "anon";
GRANT ALL ON TABLE "public"."org_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."org_preferences" TO "service_role";



GRANT ALL ON TABLE "public"."org_users" TO "anon";
GRANT ALL ON TABLE "public"."org_users" TO "authenticated";
GRANT ALL ON TABLE "public"."org_users" TO "service_role";



GRANT ALL ON TABLE "public"."orgs" TO "anon";
GRANT ALL ON TABLE "public"."orgs" TO "authenticated";
GRANT ALL ON TABLE "public"."orgs" TO "service_role";



GRANT ALL ON TABLE "public"."platform_admins" TO "anon";
GRANT ALL ON TABLE "public"."platform_admins" TO "authenticated";
GRANT ALL ON TABLE "public"."platform_admins" TO "service_role";



GRANT ALL ON TABLE "public"."pos_payment_devices" TO "anon";
GRANT ALL ON TABLE "public"."pos_payment_devices" TO "authenticated";
GRANT ALL ON TABLE "public"."pos_payment_devices" TO "service_role";



GRANT ALL ON TABLE "public"."products" TO "anon";
GRANT ALL ON TABLE "public"."products" TO "authenticated";
GRANT ALL ON TABLE "public"."products" TO "service_role";



GRANT ALL ON TABLE "public"."sale_items" TO "anon";
GRANT ALL ON TABLE "public"."sale_items" TO "authenticated";
GRANT ALL ON TABLE "public"."sale_items" TO "service_role";



GRANT ALL ON TABLE "public"."sale_payments" TO "anon";
GRANT ALL ON TABLE "public"."sale_payments" TO "authenticated";
GRANT ALL ON TABLE "public"."sale_payments" TO "service_role";



GRANT ALL ON TABLE "public"."sales" TO "anon";
GRANT ALL ON TABLE "public"."sales" TO "authenticated";
GRANT ALL ON TABLE "public"."sales" TO "service_role";



GRANT ALL ON TABLE "public"."staff_module_access" TO "anon";
GRANT ALL ON TABLE "public"."staff_module_access" TO "authenticated";
GRANT ALL ON TABLE "public"."staff_module_access" TO "service_role";



GRANT ALL ON TABLE "public"."stock_items" TO "anon";
GRANT ALL ON TABLE "public"."stock_items" TO "authenticated";
GRANT ALL ON TABLE "public"."stock_items" TO "service_role";



GRANT ALL ON TABLE "public"."stock_movements" TO "anon";
GRANT ALL ON TABLE "public"."stock_movements" TO "authenticated";
GRANT ALL ON TABLE "public"."stock_movements" TO "service_role";



GRANT ALL ON TABLE "public"."supplier_order_items" TO "anon";
GRANT ALL ON TABLE "public"."supplier_order_items" TO "authenticated";
GRANT ALL ON TABLE "public"."supplier_order_items" TO "service_role";



GRANT ALL ON TABLE "public"."supplier_orders" TO "anon";
GRANT ALL ON TABLE "public"."supplier_orders" TO "authenticated";
GRANT ALL ON TABLE "public"."supplier_orders" TO "service_role";



GRANT ALL ON TABLE "public"."supplier_payables" TO "anon";
GRANT ALL ON TABLE "public"."supplier_payables" TO "authenticated";
GRANT ALL ON TABLE "public"."supplier_payables" TO "service_role";



GRANT ALL ON TABLE "public"."supplier_payment_accounts" TO "anon";
GRANT ALL ON TABLE "public"."supplier_payment_accounts" TO "authenticated";
GRANT ALL ON TABLE "public"."supplier_payment_accounts" TO "service_role";



GRANT ALL ON TABLE "public"."supplier_payments" TO "anon";
GRANT ALL ON TABLE "public"."supplier_payments" TO "authenticated";
GRANT ALL ON TABLE "public"."supplier_payments" TO "service_role";



GRANT ALL ON TABLE "public"."supplier_products" TO "anon";
GRANT ALL ON TABLE "public"."supplier_products" TO "authenticated";
GRANT ALL ON TABLE "public"."supplier_products" TO "service_role";



GRANT ALL ON TABLE "public"."suppliers" TO "anon";
GRANT ALL ON TABLE "public"."suppliers" TO "authenticated";
GRANT ALL ON TABLE "public"."suppliers" TO "service_role";



GRANT ALL ON TABLE "public"."user_active_orgs" TO "anon";
GRANT ALL ON TABLE "public"."user_active_orgs" TO "authenticated";
GRANT ALL ON TABLE "public"."user_active_orgs" TO "service_role";



GRANT ALL ON TABLE "public"."v_audit_log_admin" TO "anon";
GRANT ALL ON TABLE "public"."v_audit_log_admin" TO "authenticated";
GRANT ALL ON TABLE "public"."v_audit_log_admin" TO "service_role";



GRANT ALL ON TABLE "public"."v_branches_admin" TO "anon";
GRANT ALL ON TABLE "public"."v_branches_admin" TO "authenticated";
GRANT ALL ON TABLE "public"."v_branches_admin" TO "service_role";



GRANT ALL ON TABLE "public"."v_cashbox_session_current" TO "anon";
GRANT ALL ON TABLE "public"."v_cashbox_session_current" TO "authenticated";
GRANT ALL ON TABLE "public"."v_cashbox_session_current" TO "service_role";



GRANT ALL ON TABLE "public"."v_dashboard_admin" TO "anon";
GRANT ALL ON TABLE "public"."v_dashboard_admin" TO "authenticated";
GRANT ALL ON TABLE "public"."v_dashboard_admin" TO "service_role";



GRANT ALL ON TABLE "public"."v_expiration_batch_detail" TO "anon";
GRANT ALL ON TABLE "public"."v_expiration_batch_detail" TO "authenticated";
GRANT ALL ON TABLE "public"."v_expiration_batch_detail" TO "service_role";



GRANT ALL ON TABLE "public"."v_expiration_waste_detail" TO "anon";
GRANT ALL ON TABLE "public"."v_expiration_waste_detail" TO "authenticated";
GRANT ALL ON TABLE "public"."v_expiration_waste_detail" TO "service_role";



GRANT ALL ON TABLE "public"."v_expiration_waste_summary" TO "anon";
GRANT ALL ON TABLE "public"."v_expiration_waste_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."v_expiration_waste_summary" TO "service_role";



GRANT ALL ON TABLE "public"."v_expirations_due" TO "anon";
GRANT ALL ON TABLE "public"."v_expirations_due" TO "authenticated";
GRANT ALL ON TABLE "public"."v_expirations_due" TO "service_role";



GRANT ALL ON TABLE "public"."v_expirations_expired" TO "anon";
GRANT ALL ON TABLE "public"."v_expirations_expired" TO "authenticated";
GRANT ALL ON TABLE "public"."v_expirations_expired" TO "service_role";



GRANT ALL ON TABLE "public"."v_order_detail_admin" TO "anon";
GRANT ALL ON TABLE "public"."v_order_detail_admin" TO "authenticated";
GRANT ALL ON TABLE "public"."v_order_detail_admin" TO "service_role";



GRANT ALL ON TABLE "public"."v_orders_admin" TO "anon";
GRANT ALL ON TABLE "public"."v_orders_admin" TO "authenticated";
GRANT ALL ON TABLE "public"."v_orders_admin" TO "service_role";



GRANT ALL ON TABLE "public"."v_pos_product_catalog" TO "anon";
GRANT ALL ON TABLE "public"."v_pos_product_catalog" TO "authenticated";
GRANT ALL ON TABLE "public"."v_pos_product_catalog" TO "service_role";



GRANT ALL ON TABLE "public"."v_products_admin" TO "anon";
GRANT ALL ON TABLE "public"."v_products_admin" TO "authenticated";
GRANT ALL ON TABLE "public"."v_products_admin" TO "service_role";



GRANT ALL ON TABLE "public"."v_products_typeahead_admin" TO "anon";
GRANT ALL ON TABLE "public"."v_products_typeahead_admin" TO "authenticated";
GRANT ALL ON TABLE "public"."v_products_typeahead_admin" TO "service_role";



GRANT ALL ON TABLE "public"."v_sale_detail_admin" TO "anon";
GRANT ALL ON TABLE "public"."v_sale_detail_admin" TO "authenticated";
GRANT ALL ON TABLE "public"."v_sale_detail_admin" TO "service_role";



GRANT ALL ON TABLE "public"."v_sales_admin" TO "anon";
GRANT ALL ON TABLE "public"."v_sales_admin" TO "authenticated";
GRANT ALL ON TABLE "public"."v_sales_admin" TO "service_role";



GRANT ALL ON TABLE "public"."v_settings_users_admin" TO "anon";
GRANT ALL ON TABLE "public"."v_settings_users_admin" TO "authenticated";
GRANT ALL ON TABLE "public"."v_settings_users_admin" TO "service_role";



GRANT ALL ON TABLE "public"."v_special_order_items_pending" TO "anon";
GRANT ALL ON TABLE "public"."v_special_order_items_pending" TO "authenticated";
GRANT ALL ON TABLE "public"."v_special_order_items_pending" TO "service_role";



GRANT ALL ON TABLE "public"."v_staff_effective_modules" TO "anon";
GRANT ALL ON TABLE "public"."v_staff_effective_modules" TO "authenticated";
GRANT ALL ON TABLE "public"."v_staff_effective_modules" TO "service_role";



GRANT ALL ON TABLE "public"."v_stock_by_branch" TO "anon";
GRANT ALL ON TABLE "public"."v_stock_by_branch" TO "authenticated";
GRANT ALL ON TABLE "public"."v_stock_by_branch" TO "service_role";



GRANT ALL ON TABLE "public"."v_superadmin_org_detail" TO "anon";
GRANT ALL ON TABLE "public"."v_superadmin_org_detail" TO "authenticated";
GRANT ALL ON TABLE "public"."v_superadmin_org_detail" TO "service_role";



GRANT ALL ON TABLE "public"."v_superadmin_orgs" TO "anon";
GRANT ALL ON TABLE "public"."v_superadmin_orgs" TO "authenticated";
GRANT ALL ON TABLE "public"."v_superadmin_orgs" TO "service_role";



GRANT ALL ON TABLE "public"."v_supplier_detail_admin" TO "anon";
GRANT ALL ON TABLE "public"."v_supplier_detail_admin" TO "authenticated";
GRANT ALL ON TABLE "public"."v_supplier_detail_admin" TO "service_role";



GRANT ALL ON TABLE "public"."v_supplier_payables_admin" TO "anon";
GRANT ALL ON TABLE "public"."v_supplier_payables_admin" TO "authenticated";
GRANT ALL ON TABLE "public"."v_supplier_payables_admin" TO "service_role";



GRANT ALL ON TABLE "public"."v_supplier_product_suggestions" TO "anon";
GRANT ALL ON TABLE "public"."v_supplier_product_suggestions" TO "authenticated";
GRANT ALL ON TABLE "public"."v_supplier_product_suggestions" TO "service_role";



GRANT ALL ON TABLE "public"."v_suppliers_admin" TO "anon";
GRANT ALL ON TABLE "public"."v_suppliers_admin" TO "authenticated";
GRANT ALL ON TABLE "public"."v_suppliers_admin" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







