
import React from 'react';
import { Link as RouterLink } from 'react-router-dom';

interface LinkProps {
  href: string;
  as?: string;
  replace?: boolean;
  scroll?: boolean;
  prefetch?: boolean;
  shallow?: boolean;
  passHref?: boolean;
  className?: string;
  target?: string;
  rel?: string;
  children: React.ReactNode;
  onClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void;
}

/**
 * Shim for Next.js Link component - reimplemented for React Router
 */
const Link = ({
  href,
  className,
  children,
  onClick,
  target,
  rel,
  ...props
}: LinkProps) => {
  // Check if link is external
  const isExternal = href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:');

  if (isExternal) {
    return (
      <a 
        href={href}
        className={className}
        target={target || '_blank'}
        rel={rel || 'noopener noreferrer'}
        onClick={onClick}
      >
        {children}
      </a>
    );
  }

  return (
    <RouterLink
      to={href}
      className={className}
      onClick={onClick}
      target={target}
      rel={rel}
    >
      {children}
    </RouterLink>
  );
};

export default Link;
