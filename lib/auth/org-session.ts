import { createServerSupabaseClient } from '@/lib/supabase/server';

type UserRole = 'org_admin' | 'staff' | 'superadmin';

export type OrgSession = {
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>;
  userId: string;
  orgId: string | null;
  role: UserRole | null;
  effectiveRole: 'org_admin' | 'staff' | null;
  isPlatformAdmin: boolean;
};

export const getOrgSession = async (): Promise<OrgSession | null> => {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: isPlatformAdminData } = await supabase.rpc('is_platform_admin');
  const isPlatformAdmin = Boolean(isPlatformAdminData);

  if (isPlatformAdmin) {
    const { data: activeOrgId } = await supabase.rpc('rpc_get_active_org_id');
    return {
      supabase,
      userId: user.id,
      orgId: typeof activeOrgId === 'string' ? activeOrgId : null,
      role: 'superadmin',
      effectiveRole: 'org_admin',
      isPlatformAdmin: true,
    };
  }

  const { data: membership } = await supabase
    .from('org_users')
    .select('org_id, role')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!membership?.org_id || !membership.role) {
    return {
      supabase,
      userId: user.id,
      orgId: null,
      role: null,
      effectiveRole: null,
      isPlatformAdmin: false,
    };
  }

  const role = membership.role as UserRole;

  return {
    supabase,
    userId: user.id,
    orgId: membership.org_id,
    role,
    effectiveRole: role === 'staff' ? 'staff' : 'org_admin',
    isPlatformAdmin: false,
  };
};

export const getOrgAdminSession = async () => {
  const session = await getOrgSession();
  if (!session) return null;
  if (!session.orgId) return session;
  if (session.effectiveRole !== 'org_admin') return null;
  return session;
};

export const getOrgMemberSession = async () => {
  const session = await getOrgSession();
  if (!session) return null;
  if (!session.orgId || !session.effectiveRole) return null;
  return session;
};
