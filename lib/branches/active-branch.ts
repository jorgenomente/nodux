import { cookies } from 'next/headers';

export const ACTIVE_BRANCH_COOKIE = 'nodux_active_branch_id';

type ResolveActiveBranchIdParams = {
  requestedBranchId?: string;
  allowedBranchIds: Iterable<string>;
  fallbackBranchId?: string;
  allowExplicitEmpty?: boolean;
};

export const getActiveBranchCookie = async () => {
  const cookieStore = await cookies();
  return cookieStore.get(ACTIVE_BRANCH_COOKIE)?.value?.trim() ?? '';
};

export const resolveActiveBranchId = async (
  params: ResolveActiveBranchIdParams,
) => {
  const requestedBranchId = params.requestedBranchId?.trim() ?? '';
  const allowedBranchIds = new Set(
    Array.from(params.allowedBranchIds).filter(
      (branchId) => typeof branchId === 'string' && branchId.length > 0,
    ),
  );
  const fallbackBranchId = params.fallbackBranchId?.trim() ?? '';

  if (requestedBranchId) {
    return allowedBranchIds.has(requestedBranchId)
      ? requestedBranchId
      : fallbackBranchId;
  }

  if (params.allowExplicitEmpty && params.requestedBranchId !== undefined) {
    return '';
  }

  const cookieBranchId = await getActiveBranchCookie();
  if (cookieBranchId && allowedBranchIds.has(cookieBranchId)) {
    return cookieBranchId;
  }

  return fallbackBranchId;
};
