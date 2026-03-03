import { redirect } from 'next/navigation';

import { resolveStaffHome } from '@/lib/auth/staff-modules';
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
    const home = resolveStaffHome(
      (modules ?? []) as Array<{ module_key: string; is_enabled: boolean }>,
    );
    redirect(home);
  }

  redirect('/dashboard');
}
