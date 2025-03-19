
import React from 'react';
import { Link as RouterLink } from 'react-router-dom';

interface LinkProps {
  href: string;
  as?: string;
  replace?: boolean;
  scroll?: boolean;
  shallow?: boolean;
  prefetch?: boolean;
  className?: string;
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  [key: string]: any;
}

/**
 * Mock implementation of Next.js Link component
 * This is a simplified version that emulates the Next.js Link component
 * for compatibility purposes, using React Router's Link.
 */
const Link = ({ 
  href, 
  as, 
  className, 
  children, 
  onClick,
  ...props 
}: LinkProps) => {
  // Convert Next.js dynamic routes to React Router format if needed
  const to = as || href;
  
  return (
    <RouterLink 
      to={to} 
      className={className}
      onClick={onClick}
      {...props}
    >
      {children}
    </RouterLink>
  );
};

export default Link;
