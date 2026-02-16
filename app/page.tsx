import { redirect } from 'next/navigation';

import { createServerSupabaseClient } from '@/lib/supabase/server';

export default async function Home() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: isPlatformAdmin } = await supabase.rpc('is_platform_admin');
  if (isPlatformAdmin) {
    redirect('/superadmin');
  }

  const { data: membership } = await supabase
    .from('org_users')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  if (membership?.role === 'superadmin') {
    redirect('/superadmin');
  }

  if (membership?.role === 'staff') {
    const { data: modules } = await supabase.rpc(
      'rpc_get_staff_effective_modules',
    );
    const firstEnabled = (modules ?? []).find((module) => module.is_enabled);
    if (firstEnabled?.module_key === 'products_lookup') {
      redirect('/products/lookup');
    }
    if (firstEnabled?.module_key === 'clients') {
      redirect('/clients');
    }
    if (firstEnabled?.module_key === 'expirations') {
      redirect('/expirations');
    }
    redirect('/pos');
  }

  redirect('/dashboard');
}
