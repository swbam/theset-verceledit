
import React from 'react';

// This is a simplified shim for Next.js Image component
// It provides basic compatibility for projects transitioning from Next.js to React Router
const NextImage = ({ 
  src, 
  alt, 
  width, 
  height, 
  className, 
  style,
  priority,
  quality,
  loading,
  ...props
}: {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  style?: React.CSSProperties;
  priority?: boolean;
  quality?: number;
  loading?: 'lazy' | 'eager';
  [key: string]: any;
}) => {
  // Convert any relative URLs that would work in Next.js to standard format
  const processedSrc = src.startsWith('/') ? src : src;
  
  return (
    <img
      src={processedSrc}
      alt={alt}
      width={width}
      height={height}
      className={className}
      style={style}
      loading={priority ? 'eager' : loading || 'lazy'}
      {...props}
    />
  );
};

// Also create a placeholder component for next/future/image
const FutureImage = (props: any) => {
  return <NextImage {...props} />;
};

export { FutureImage };
export default NextImage;
