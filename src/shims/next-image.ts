import React from 'react';

// Define types similar to Next.js Image component
interface ImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  fill?: boolean;
  style?: React.CSSProperties;
  className?: string;
  priority?: boolean;
  quality?: number;
  loading?: 'eager' | 'lazy';
  unoptimized?: boolean;
  onLoad?: () => void;
  onError?: () => void;
}

/**
 * Simple shim for Next.js Image component
 */
const Image = ({ 
  src, 
  alt, 
  width, 
  height, 
  fill, 
  style = {}, 
  className = '', 
  onLoad, 
  onError, 
  ...props 
}: ImageProps) => {
  const imgStyle: React.CSSProperties = {
    ...(fill ? { width: '100%', height: '100%', objectFit: 'cover' } : {}),
    ...style,
  };

  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      style={imgStyle}
      onLoad={onLoad}
      onError={onError}
      {...props}
    />
  );
};

export default Image;
