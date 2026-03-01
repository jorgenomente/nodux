alter table public.branches
  add column if not exists ticket_header_text text,
  add column if not exists ticket_footer_text text,
  add column if not exists fiscal_ticket_note_text text;

create or replace view public.v_branches_admin as
select
  b.id as branch_id,
  b.org_id,
  b.name,
  b.address,
  b.is_active,
  b.created_at,
  b.updated_at,
  coalesce(m.members_count, 0::bigint) as members_count,
  b.ticket_header_text,
  b.ticket_footer_text,
  b.fiscal_ticket_note_text
from public.branches b
left join (
  select
    branch_memberships.branch_id,
    count(*) as members_count
  from public.branch_memberships
  where branch_memberships.is_active = true
  group by branch_memberships.branch_id
) m on m.branch_id = b.id;
