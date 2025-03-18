
// Export all shims for Next.js components/functions
import Image from './next-image';
import Link from './next-link';
import { useRouter, usePathname, useSearchParams, useParams } from './next-navigation';
import NextResponse, { NextRequest, GET, POST, PUT, DELETE, PATCH } from './next-server';

export {
  Image,
  Link,
  useRouter,
  usePathname,
  useSearchParams,
  useParams,
  NextResponse,
  NextRequest,
  GET,
  POST,
  PUT,
  DELETE,
  PATCH
};
