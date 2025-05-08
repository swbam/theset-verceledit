// This file is intentionally empty to avoid Next.js dependency errors
// The original Next.js middleware functionality has been disabled for Vite compatibility

// For Vite/React projects, middleware functionality should be implemented differently,
// such as using React Router's route guards or a custom auth provider

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Simple pass-through middleware.  
// Later we can extend this (e.g. protect /admin routes) but for now we just satisfy
// Next.js requirement that the file exports a middleware or default function.

export function middleware (_req: NextRequest) {
  return NextResponse.next()
}

// No matchers yet – run on every request (cheap because it's a no-op)
export const config = {
  matcher: [
    /* Add route patterns like '/admin/:path*' when auth guard is ready */
  ]
}