-- Extend special_order_status enum

alter type public.special_order_status add value if not exists 'partial';
alter type public.special_order_status add value if not exists 'cancelled';
