
import React from 'react';

interface ImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  layout?: 'fixed' | 'intrinsic' | 'responsive' | 'fill';
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  className?: string;
  priority?: boolean;
  quality?: number;
  loading?: 'lazy' | 'eager';
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  onClick?: () => void;
  onLoad?: () => void;
  onError?: () => void;
  sizes?: string;
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
  layout,
  objectFit,
  className,
  onClick,
  loading = 'lazy',
  ...props 
}: ImageProps) => {
  const imgStyle: React.CSSProperties = {
    objectFit: objectFit as React.CSSProperties['objectFit'],
  };

  if (layout === 'fill') {
    imgStyle.width = '100%';
    imgStyle.height = '100%';
    imgStyle.position = 'absolute';
  }

  return (
    <img 
      src={src} 
      alt={alt} 
      width={width} 
      height={height}
      className={className}
      onClick={onClick}
      loading={loading}
      style={imgStyle}
      {...props}
    />
  );
};

export default Image;
