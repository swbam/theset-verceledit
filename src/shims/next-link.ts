
import React from 'react';
import { Link as ReactRouterLink } from 'react-router-dom';

interface LinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  prefetch?: boolean;
  replace?: boolean;
  scroll?: boolean;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  target?: string;
  rel?: string;
  style?: React.CSSProperties;
  [key: string]: any;
}

// This is a simple shim for Next.js Link component
const Link = ({ 
  href, 
  children, 
  className,
  prefetch,
  replace,
  scroll,
  onClick,
  target,
  rel,
  style,
  ...props 
}: LinkProps) => {
  // External links should use regular anchor tags
  const isExternal = href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:');

  if (isExternal) {
    return (
      <a 
        href={href} 
        className={className}
        onClick={onClick}
        target={target || '_blank'} 
        rel={rel || 'noopener noreferrer'}
        style={style}
        {...props}
      >
        {children}
      </a>
    );
  }

  return (
    <ReactRouterLink 
      to={href} 
      className={className}
      onClick={onClick}
      style={style}
      {...props}
    >
      {children}
    </ReactRouterLink>
  );
};

export default Link;
