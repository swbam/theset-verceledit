
import React from 'react';
import { Link as RouterLink } from 'react-router-dom';

interface LinkProps {
  href: string;
  as?: string;
  replace?: boolean;
  scroll?: boolean;
  prefetch?: boolean;
  className?: string;
  children: React.ReactNode;
  target?: string;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  rel?: string;
  style?: React.CSSProperties;
  [key: string]: any;
}

/**
 * This is a simple shim for Next.js Link component to allow using it in non-Next.js projects
 * It wraps React Router's Link component
 */
const NextLink: React.FC<LinkProps> = ({
  href,
  as,
  replace,
  scroll,
  prefetch,
  children,
  className,
  target,
  onClick,
  rel,
  style,
  ...props
}) => {
  // External links should use regular anchor tags
  const isExternal = 
    typeof href === 'string' && 
    (href.startsWith('http') || 
     href.startsWith('mailto:') || 
     href.startsWith('tel:'));

  // Handle non-HTTP URLs or target="_blank" with anchor tags
  if (isExternal || target === '_blank') {
    return (
      <a
        href={href}
        className={className}
        target={target}
        onClick={onClick}
        rel={rel || (target === '_blank' ? 'noopener noreferrer' : undefined)}
        style={style}
        {...props}
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
      {...props}
    >
      {children}
    </RouterLink>
  );
};

export default NextLink;
