import NextAuth from 'next-auth';
import { authConfig } from './auth.config.js';
import { NextResponse } from 'next/server';

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { nextUrl } = req;

  const isAuthPage = ['/login', '/forgot-password', '/reset-password'].some((path) =>
    nextUrl.pathname.startsWith(path)
  );
  
  // Dynamic whitelist checks
  const isApiAuthRoute = nextUrl.pathname.startsWith('/api/auth');
  const isApiVerifyRoute = nextUrl.pathname.startsWith('/api/verify');
  const isStaticDoc = nextUrl.pathname.match(/\.(svg|png|jpg|jpeg|ico|json)$/);
  const isNotFound = nextUrl.pathname === '/_not-found';

  if (isApiAuthRoute || isApiVerifyRoute || isStaticDoc || isNotFound) {
    return NextResponse.next();
  }

  if (isAuthPage) {
    if (isLoggedIn) {
      const role = req.auth?.user?.roleCode;
      if (role === 'MEMBER') {
        return NextResponse.redirect(new URL('/member/dashboard', nextUrl));
      }
      return NextResponse.redirect(new URL('/dashboard', nextUrl));
    }
    return NextResponse.next();
  }

  if (!isLoggedIn) {
    let callbackUrl = nextUrl.pathname;
    if (nextUrl.search) {
      callbackUrl += nextUrl.search;
    }
    const encodedCallback = encodeURIComponent(callbackUrl);
    return NextResponse.redirect(
      new URL(`/login?callbackUrl=${encodedCallback}`, nextUrl)
    );
  }

  // Enforce portal isolation for logged-in users
  if (isLoggedIn) {
    const role = req.auth?.user?.roleCode;
    const isMemberPath = nextUrl.pathname.startsWith('/member');
    
    if (role === 'MEMBER' && !isMemberPath) {
      return NextResponse.redirect(new URL('/member/dashboard', nextUrl));
    }
    if (role !== 'MEMBER' && isMemberPath) {
      return NextResponse.redirect(new URL('/dashboard', nextUrl));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files
     */
    '/((?!_next/static|_next/image|favicon.ico|vercel.svg|next.svg|file.svg|globe.svg|window.svg).*)',
  ],
};
