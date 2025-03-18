import { useParams, useSearchParams } from 'react-router-dom';

// Type definition for the NextResponse-like object
interface NextResponse {
  json: <T extends Record<string, unknown>>(data: T) => Response;
  redirect: (url: string) => Response;
  status: (statusCode: number) => NextResponse;
}

// Simple implementation of Next.js server-related functions
const NextResponse: NextResponse = {
  json: (data) => new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' }
  }),
  redirect: (url) => new Response(null, {
    status: 302,
    headers: { Location: url }
  }),
  status: (statusCode) => {
    return NextResponse;
  }
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

// This is a shim for Next.js's useRouter
export function useRouter() {
  const params = useParams<Record<string, string>>();
  const [searchParams] = useSearchParams();

  return {
    query: {
      ...Object.fromEntries(searchParams.entries()),
      ...params
    },
    pathname: window.location.pathname,
    push: (path: string) => {
      window.location.href = path;
    },
    replace: (path: string) => {
      window.location.replace(path);
    }
  };
}

// Dummy function to match Next.js API
export function getServerSideProps() {
  return {
    props: {}
  };
}
