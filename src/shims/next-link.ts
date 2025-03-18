
import React from 'react';
import { Link, LinkProps as ReactRouterLinkProps } from 'react-router-dom';

interface NextLinkProps extends Omit<ReactRouterLinkProps, 'to'> {
  href: string;
  as?: string;
  prefetch?: boolean;
  replace?: boolean;
  shallow?: boolean;
  passHref?: boolean;
  className?: string;
  children: React.ReactNode;
}

// Basic shim for Next.js Link component that wraps React Router's Link
const NextLink = ({ 
  href, 
  as, 
  prefetch, 
  replace, 
  shallow, 
  passHref,
  className,
  children,
  ...rest 
}: NextLinkProps) => {
  return (
    <Link 
      to={as || href} 
      replace={replace} 
      className={className}
      {...rest}
    >
      {children}
    </Link>
  );
};

export default NextLink;
