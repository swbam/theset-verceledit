
import React from 'react';
import { Link as RouterLink } from 'react-router-dom';

// Mock Next.js Link component for compatibility with React Router
const NextLink = ({
  href,
  as,
  replace,
  scroll,
  shallow,
  passHref,
  prefetch,
  locale,
  children,
  ...props
}: {
  href: string;
  as?: string;
  replace?: boolean;
  scroll?: boolean;
  shallow?: boolean;
  passHref?: boolean;
  prefetch?: boolean;
  locale?: string;
  children: React.ReactNode;
  [key: string]: any;
}) => {
  // Convert Next.js paths to React Router format (remove base path if needed)
  const to = href.startsWith('/') ? href : `/${href}`;

  return (
    <RouterLink to={to} replace={replace} {...props}>
      {children}
    </RouterLink>
  );
};

export default NextLink;
