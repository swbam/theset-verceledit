
// Simple implementation of Next.js server-related functions
export const NextResponse = {
  json: (data: any) => {
    return new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  },
  redirect: (url: string) => {
    return Response.redirect(url);
  },
};

// Type definitions for Next.js request handlers
export type NextRequest = Request;

// Export HTTP methods
export const GET = 'GET';
export const POST = 'POST';
export const PUT = 'PUT';
export const DELETE = 'DELETE';
export const PATCH = 'PATCH';

// Export NextResponse as default
export default NextResponse;
