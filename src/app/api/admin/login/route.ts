import { NextResponse } from 'next/server';
import { createSessionToken, isValidPassword, ADMIN_SESSION_COOKIE } from '@/lib/adminAuth';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const { password } = await req.json();

    if (!isValidPassword(password)) {
      return NextResponse.json({ error: 'Password salah.' }, { status: 401 });
    }

    const token = createSessionToken();
    const res = NextResponse.json({ success: true });
    res.cookies.set(ADMIN_SESSION_COOKIE, token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });
    return res;
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan.' }, { status: 500 });
  }
}
