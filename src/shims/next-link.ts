
import React from 'react';
import { Link as RouterLink } from 'react-router-dom';

interface NextLinkProps {
  href: string;
  as?: string;
  replace?: boolean;
  scroll?: boolean;
  prefetch?: boolean;
  target?: string;
  className?: string;
  children?: React.ReactNode;
  [key: string]: any;
}

/**
 * Mock implementation of Next.js Link component for React Router
 * This is a simplified version that emulates the Next.js Link component
 * for compatibility purposes.
 */
const Link = ({ 
  href, 
  as, 
  replace = false, 
  scroll = true, 
  prefetch, 
  children,
  ...props 
}: NextLinkProps) => {
  // Handle external links (starting with http/https)
  if (href.startsWith('http')) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
        {children}
      </a>
    );
  }

  // For internal links, use React Router's Link
  return (
    <RouterLink to={as || href} replace={replace} {...props}>
      {children}
    </RouterLink>
  );
};

/**
 * Export module components
 */
export default Link;
