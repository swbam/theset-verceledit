
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
  children: React.ReactNode;
  style?: React.CSSProperties;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  target?: string;
  rel?: string;
}

// Create a simple Link component that works like Next.js Link
const Link = ({ 
  href, 
  children, 
  className,
  style,
  onClick,
  target,
  rel,
  ...props 
}: LinkProps) => {
  // Handle external links
  const isExternal = href.startsWith('http') || href.startsWith('//');
  
  if (isExternal) {
    return (
      <a 
        href={href}
        className={className}
        style={style}
        onClick={onClick}
        target={target || '_blank'}
        rel={rel || 'noopener noreferrer'}
        {...props}
      >
        {children}
      </a>
    );
  }

  return (
    <RouterLink 
      to={href} 
      className={className}
      style={style}
      onClick={onClick}
      {...props}
    >
      {children}
    </RouterLink>
  );
};

export default Link;
