import { NextRequest, NextResponse } from 'next/server';

import { getOrgMemberSession } from '@/lib/auth/org-session';
import { triggerFiscalWorker } from '@/lib/fiscal/worker/trigger-worker';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const session = await getOrgMemberSession();
  if (!session?.orgId || !session.effectiveRole) {
    return NextResponse.json(
      { ok: false, error: 'Unauthorized' },
      { status: 401 },
    );
  }

  const result = await triggerFiscalWorker({
    baseUrl: request.nextUrl.origin,
    executionMode: 'live',
    batchSize: 5,
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
