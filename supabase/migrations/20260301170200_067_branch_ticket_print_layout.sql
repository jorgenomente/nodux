alter table public.branches
  add column if not exists ticket_paper_width_mm numeric(5,2) not null default 80,
  add column if not exists ticket_margin_top_mm numeric(5,2) not null default 2,
  add column if not exists ticket_margin_right_mm numeric(5,2) not null default 2,
  add column if not exists ticket_margin_bottom_mm numeric(5,2) not null default 2,
  add column if not exists ticket_margin_left_mm numeric(5,2) not null default 2,
  add column if not exists ticket_font_size_px integer not null default 12,
  add column if not exists ticket_line_height numeric(4,2) not null default 1.35;

update public.branches
set
  ticket_paper_width_mm = coalesce(ticket_paper_width_mm, 80),
  ticket_margin_top_mm = coalesce(ticket_margin_top_mm, 2),
  ticket_margin_right_mm = coalesce(ticket_margin_right_mm, 2),
  ticket_margin_bottom_mm = coalesce(ticket_margin_bottom_mm, 2),
  ticket_margin_left_mm = coalesce(ticket_margin_left_mm, 2),
  ticket_font_size_px = coalesce(ticket_font_size_px, 12),
  ticket_line_height = coalesce(ticket_line_height, 1.35);

alter table public.branches
  drop constraint if exists branches_ticket_paper_width_mm_chk,
  drop constraint if exists branches_ticket_margin_top_mm_chk,
  drop constraint if exists branches_ticket_margin_right_mm_chk,
  drop constraint if exists branches_ticket_margin_bottom_mm_chk,
  drop constraint if exists branches_ticket_margin_left_mm_chk,
  drop constraint if exists branches_ticket_font_size_px_chk,
  drop constraint if exists branches_ticket_line_height_chk;

alter table public.branches
  add constraint branches_ticket_paper_width_mm_chk
    check (ticket_paper_width_mm >= 48 and ticket_paper_width_mm <= 80),
  add constraint branches_ticket_margin_top_mm_chk
    check (ticket_margin_top_mm >= 0 and ticket_margin_top_mm <= 20),
  add constraint branches_ticket_margin_right_mm_chk
    check (ticket_margin_right_mm >= 0 and ticket_margin_right_mm <= 20),
  add constraint branches_ticket_margin_bottom_mm_chk
    check (ticket_margin_bottom_mm >= 0 and ticket_margin_bottom_mm <= 20),
  add constraint branches_ticket_margin_left_mm_chk
    check (ticket_margin_left_mm >= 0 and ticket_margin_left_mm <= 20),
  add constraint branches_ticket_font_size_px_chk
    check (ticket_font_size_px >= 8 and ticket_font_size_px <= 24),
  add constraint branches_ticket_line_height_chk
    check (ticket_line_height >= 1 and ticket_line_height <= 2.5);

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
  b.fiscal_ticket_note_text,
  b.ticket_paper_width_mm,
  b.ticket_margin_top_mm,
  b.ticket_margin_right_mm,
  b.ticket_margin_bottom_mm,
  b.ticket_margin_left_mm,
  b.ticket_font_size_px,
  b.ticket_line_height
from public.branches b
left join (
  select
    branch_memberships.branch_id,
    count(*) as members_count
  from public.branch_memberships
  where branch_memberships.is_active = true
  group by branch_memberships.branch_id
) m on m.branch_id = b.id;
