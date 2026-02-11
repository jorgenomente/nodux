-- Allow correcting expiration dates for batches (approximate -> exact)

create or replace function public.rpc_update_expiration_batch_date(
  p_org_id uuid,
  p_batch_id uuid,
  p_new_expires_on date,
  p_reason text
)
returns void
language plpgsql
as $$
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
