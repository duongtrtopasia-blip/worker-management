import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  
  // Kiểm tra cookie xác thực của Administrator
  const isAdminLoggedIn = req.cookies.get('admin_auth')?.value === 'true';

  const isAuthRoute = req.nextUrl.pathname.startsWith('/login');
  // Loại trừ các API nội bộ và Webhook của Telegram khỏi yêu cầu đăng nhập
  const isPublicRoute = req.nextUrl.pathname.startsWith('/scan') || 
                        req.nextUrl.pathname.startsWith('/api/telegram/webhook') ||
                        req.nextUrl.pathname.startsWith('/api/qr');

  if (!isAdminLoggedIn && !isAuthRoute && !isPublicRoute) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = '/login';
    return NextResponse.redirect(redirectUrl);
  }

  if (isAdminLoggedIn && isAuthRoute) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = '/';
    return NextResponse.redirect(redirectUrl);
  }

  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
