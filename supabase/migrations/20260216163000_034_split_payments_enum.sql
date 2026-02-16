-- Split payments step 1: enum extension in isolated migration transaction.

alter type public.payment_method add value if not exists 'mixed';
