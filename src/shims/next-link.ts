
import React from 'react';
import { Link } from 'react-router-dom';

// This is a simplified shim for Next.js Link component
// It provides basic compatibility for projects transitioning from Next.js to React Router
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
  className,
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
  className?: string;
  [key: string]: any;
}) => {
  // Convert Next.js dynamic routes to React Router format
  const processedHref = href;
  
  return (
    <Link 
      to={processedHref} 
      className={className}
      replace={replace}
      {...props}
    >
      {children}
    </Link>
  );
};

export default NextLink;
