// Middleware for language detection and routing

import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  // Get the pathname
  const pathname = request.nextUrl.pathname;

  // Skip middleware for API routes, static files, and Next.js internals
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.includes('.') ||
    pathname.startsWith('/icon')
  ) {
    return NextResponse.next();
  }

  // Get language from various sources
  const acceptLanguage = request.headers.get('accept-language') || '';
  const cookieLanguage = request.cookies.get('language')?.value;
  
  // Determine preferred language
  let preferredLanguage: 'en' | 'zh' = 'en'; // default
  
  if (cookieLanguage && ['en', 'zh'].includes(cookieLanguage)) {
    preferredLanguage = cookieLanguage as 'en' | 'zh';
  } else if (acceptLanguage.toLowerCase().includes('zh')) {
    preferredLanguage = 'zh';
  }

  // Special case: Do NOT redirect the root path; just set cookie/header
  if (pathname === '/') {
    const response = NextResponse.next();
    response.cookies.set('language', preferredLanguage, {
      maxAge: 60 * 60 * 24 * 365,
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });
    response.headers.set('x-language', preferredLanguage);
    return response;
  }

  // Handle bare locale roots to avoid 404: redirect to a concrete page
  if (pathname === '/en' || pathname === '/zh') {
    const target = pathname === '/en' ? '/en/about' : '/zh/about';
    const redirectUrl = new URL(target + (request.nextUrl.search || ''), request.url);
    const response = NextResponse.redirect(redirectUrl);
    response.cookies.set('language', preferredLanguage, {
      maxAge: 60 * 60 * 24 * 365,
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });
    response.headers.set('x-language', preferredLanguage);
    return response;
  }

  // Skip if already on a language-specific route (with a subpath)
  if (
    pathname.startsWith('/en/') ||
    pathname.startsWith('/zh/')
  ) {
    const response = NextResponse.next();
    response.cookies.set('language', preferredLanguage, {
      maxAge: 60 * 60 * 24 * 365,
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });
    response.headers.set('x-language', preferredLanguage);
    return response;
  }

  // Only redirect for routes that are implemented with language prefixes
  const localizedRoots = ['/about', '/contact'];
  const shouldRedirect = localizedRoots.some((root) => pathname === root || pathname.startsWith(`${root}/`));

  if (shouldRedirect) {
    const search = request.nextUrl.search || '';
    const targetPath = `/${preferredLanguage}${pathname}`;
    const redirectUrl = new URL(`${targetPath}${search}`, request.url);

    const response = NextResponse.redirect(redirectUrl);
    response.cookies.set('language', preferredLanguage, {
      maxAge: 60 * 60 * 24 * 365,
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });
    response.headers.set('x-language', preferredLanguage);
    return response;
  }

  // Fallback: don't redirect; just set cookie/header for other routes
  const response = NextResponse.next();
  response.cookies.set('language', preferredLanguage, {
    maxAge: 60 * 60 * 24 * 365,
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });
  response.headers.set('x-language', preferredLanguage);
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};