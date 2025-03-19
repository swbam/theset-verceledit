
import React from 'react';

interface ImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  style?: React.CSSProperties;
  fill?: boolean;
  loader?: any;
  quality?: number;
  sizes?: string;
  loading?: 'lazy' | 'eager';
  blurDataURL?: string;
  placeholder?: 'blur' | 'empty';
  onLoad?: () => void;
  onError?: () => void;
  unoptimized?: boolean;
}

/**
 * A simple Next.js Image component shim for React Router
 * Since Next.js Image component isn't available in a React Router app,
 * this provides a compatible API surface that renders as a standard img
 */
const Image = ({
  src,
  alt,
  width,
  height,
  className,
  style,
  fill,
  loading,
  priority,
  ...rest
}: ImageProps) => {
  // Handle file paths from public directory
  const imageSrc = src.startsWith('/') ? src : src;
  
  // Combine any passed style with width, height, and fill properties
  const combinedStyle: React.CSSProperties = {
    ...style,
    ...(width && { width }),
    ...(height && { height }),
    ...(fill && {
      position: 'absolute',
      height: '100%',
      width: '100%',
      top: 0,
      left: 0,
      objectFit: 'cover',
    }),
  };

  // When priority is set, use eager loading
  const imgLoading = priority ? 'eager' : loading || 'lazy';
  
  return (
    <img
      src={imageSrc}
      alt={alt}
      className={className}
      style={combinedStyle}
      loading={imgLoading}
      {...rest}
    />
  );
};

export default Image;
