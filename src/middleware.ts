import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const isAuthPage = req.nextUrl.pathname.startsWith('/login') || 
                       req.nextUrl.pathname.startsWith('/register');
    const isAPIRoute = req.nextUrl.pathname.startsWith('/api');
    const isPublicPage = req.nextUrl.pathname === '/';
    
    // If user is authenticated and trying to access auth pages, redirect to dashboard
    if (token && isAuthPage) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    // Allow access to public pages and API routes
    if (isPublicPage || isAPIRoute) {
      return NextResponse.next();
    }

    // If no token and trying to access protected routes, redirect to login
    if (!token && !isAuthPage) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const isAuthPage = req.nextUrl.pathname.startsWith('/login') || 
                          req.nextUrl.pathname.startsWith('/register');
        const isPublicPage = req.nextUrl.pathname === '/';
        const isAPIAuth = req.nextUrl.pathname.startsWith('/api/auth');
        
        // Allow access to auth pages, public pages, and auth API routes
        if (isAuthPage || isPublicPage || isAPIAuth) {
          return true;
        }

        // For protected routes, require a valid token
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (NextAuth.js API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
