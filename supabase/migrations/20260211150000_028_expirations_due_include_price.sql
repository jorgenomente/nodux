-- Include pricing info in expirations due view for waste display

drop view if exists public.v_expirations_due;

create or replace view public.v_expirations_due as
select
  eb.id as batch_id,
  eb.org_id,
  eb.branch_id,
  b.name as branch_name,
  eb.product_id,
  p.name as product_name,
  eb.expires_on,
  (eb.expires_on - current_date) as days_left,
  eb.quantity,
  eb.batch_code,
  p.unit_price,
  (eb.quantity * coalesce(p.unit_price, 0)) as total_value,
  op.critical_days,
  op.warning_days,
  case
    when (eb.expires_on - current_date) <= op.critical_days then 'critical'
    when (eb.expires_on - current_date) <= op.warning_days then 'warning'
    else 'info'
  end as severity
from public.expiration_batches eb
left join public.products p
  on p.id = eb.product_id
  and p.org_id = eb.org_id
left join public.branches b
  on b.id = eb.branch_id
  and b.org_id = eb.org_id
left join public.org_preferences op
  on op.org_id = eb.org_id
where eb.quantity > 0;
