
import React from 'react';
import { Link as RouterLink } from 'react-router-dom';

interface LinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  prefetch?: boolean;
  replace?: boolean;
  scroll?: boolean;
  shallow?: boolean;
  passHref?: boolean;
  target?: string;
  rel?: string;
  locale?: string;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  style?: React.CSSProperties;
}

/**
 * A simple Next.js Link component shim for React Router
 * This provides a compatible API surface with the Next.js Link component
 * but uses React Router's Link component underneath
 */
const Link = ({
  href,
  children,
  className,
  target,
  rel,
  onClick,
  style,
  ...rest
}: LinkProps) => {
  // Handle external links (starting with http:// or https://)
  const isExternal = href.startsWith('http://') || href.startsWith('https://');
  
  // For external links, use regular anchor tags
  if (isExternal) {
    return (
      <a
        href={href}
        className={className}
        target={target || '_blank'}
        rel={rel || 'noopener noreferrer'}
        onClick={onClick}
        style={style}
      >
        {children}
      </a>
    );
  }
  
  // For internal links, use React Router's Link
  return (
    <RouterLink
      to={href}
      className={className}
      onClick={onClick}
      style={style}
      target={target}
      rel={rel}
    >
      {children}
    </RouterLink>
  );
};

export default Link;
