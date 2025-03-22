import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  
  // Add cache-control headers for static assets
  const url = req.nextUrl.pathname;
  if (
    url.includes('/images/') ||
    url.includes('/_next/static/') ||
    url.includes('/fonts/') ||
    url.endsWith('.ico') ||
    url.endsWith('.svg') ||
    url.endsWith('.jpg') ||
    url.endsWith('.png')
  ) {
    // Cache static assets for 30 days
    res.headers.set(
      'Cache-Control',
      'public, max-age=2592000, stale-while-revalidate=86400'
    );
  }

  // Add Supabase auth functionality
  const supabase = createMiddlewareClient({ req, res });
  
  // Refresh session if needed
  await supabase.auth.getSession();
  
  return res;
}

// Specify which paths this middleware should run for
export const config = {
  matcher: [
    // Apply to all routes except API routes, Next.js internals, and static files
    '/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}; 