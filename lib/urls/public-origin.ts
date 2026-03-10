import type { NextRequest } from 'next/server';

export const resolvePublicAppOrigin = (request: NextRequest) => {
  const origin = request.nextUrl.origin;
  const hostname = request.nextUrl.hostname;

  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `http://127.0.0.1:${request.nextUrl.port || '3000'}`;
  }

  return origin;
};
