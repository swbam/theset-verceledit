import React from "react";
import { Link as RouterLink } from "react-router-dom";

type LinkProps = {
  href: string;
  as?: string;
  replace?: boolean;
  scroll?: boolean;
  prefetch?: boolean;
  shallow?: boolean;
  passHref?: boolean;
  children: React.ReactNode;
  className?: string;
  target?: string;
  rel?: string;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
};

const Link = ({ 
  href, 
  children, 
  className,
  target,
  rel,
  onClick,
  ...props 
}: LinkProps) => {
  // Handle external links
  if (href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:')) {
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

  // Otherwise, use React Router's Link
  return (
    <RouterLink 
      to={href} 
      className={className}
      target={target}
      rel={rel}
      onClick={onClick}
    >
      {children}
    </RouterLink>
  );
};

export default Link;
