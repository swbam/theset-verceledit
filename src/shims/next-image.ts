
import React from 'react';

interface ImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  fill?: boolean;
  sizes?: string;
  quality?: number;
  priority?: boolean;
  placeholder?: "blur" | "empty";
  blurDataURL?: string;
  className?: string;
  style?: React.CSSProperties;
  onLoad?: (event: React.SyntheticEvent<HTMLImageElement, Event>) => void;
  onError?: (event: React.SyntheticEvent<HTMLImageElement, Event>) => void;
  loading?: 'lazy' | 'eager';
  [key: string]: any;
}

/**
 * Mock implementation of Next.js Image component
 * This is a simplified version that emulates the Next.js Image component 
 * for compatibility purposes.
 */
const Image = ({ 
  src, 
  alt, 
  width, 
  height, 
  fill, 
  className, 
  style: customStyle,
  onLoad,
  onError,
  loading = 'lazy',
  ...props 
}: ImageProps) => {
  
  // Prepare the style object
  const style: React.CSSProperties = {
    ...(fill ? { objectFit: 'cover', width: '100%', height: '100%' } : {}),
    ...(customStyle || {})
  };
  
  return (
    <img 
      src={src} 
      alt={alt}
      width={width} 
      height={height}
      className={className}
      style={style}
      onLoad={onLoad}
      onError={onError}
      loading={loading}
      {...props}
    />
  );
};

export default Image;
