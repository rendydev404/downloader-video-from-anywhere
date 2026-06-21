import { NextRequest, NextResponse } from 'next/server';
import { isValidSessionToken, ADMIN_SESSION_COOKIE } from '@/lib/adminAuth';

// Next.js 16 Proxy (formerly Middleware) defaults to the Node.js runtime,
// so this can reuse the same Node `crypto`-based check as the API routes.
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!pathname.startsWith('/admin') || pathname === '/admin/login') {
    return NextResponse.next();
  }

  const token = req.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (!isValidSessionToken(token)) {
    return NextResponse.redirect(new URL('/admin/login', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
