import React from 'react';
import { Link as RouterLink } from 'react-router-dom';

// Define types similar to Next.js Link component
interface LinkProps {
  href: string;
  as?: string;
  replace?: boolean;
  scroll?: boolean;
  prefetch?: boolean;
  className?: string;
  target?: string;
  rel?: string;
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
}

/**
 * Simple shim for Next.js Link component
 */
const Link = ({
  href,
  as,
  replace,
  scroll,
  prefetch,
  children,
  className,
  ...props
}: LinkProps) => {
  // If the link is external (starts with http or https)
  if (href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:')) {
    return (
      <a href={href} className={className} {...props}>
        {children}
      </a>
    );
  }

  // Otherwise use React Router's Link
  return (
    <RouterLink to={href} className={className} {...props}>
      {children}
    </RouterLink>
  );
};

export default Link;
