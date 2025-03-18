
// Simple implementation of Next.js navigation hooks for React Router DOM
import { useNavigate, useLocation, useParams } from 'react-router-dom';

// Simulate the useRouter hook from Next.js
export function useRouter() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();

  return {
    pathname: location.pathname,
    query: Object.fromEntries(new URLSearchParams(location.search)),
    asPath: location.pathname + location.search,
    push: (url: string) => navigate(url),
    replace: (url: string) => navigate(url, { replace: true }),
    back: () => navigate(-1),
    prefetch: async () => {}, // No-op in React Router
    params,
  };
}

// Simulate the usePathname hook
export function usePathname() {
  const location = useLocation();
  return location.pathname;
}

// Simulate the useSearchParams hook
export function useSearchParams() {
  const location = useLocation();
  return new URLSearchParams(location.search);
}

// Export the hooks
export { useParams };
