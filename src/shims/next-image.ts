
import React from 'react';

interface ImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  fill?: boolean;
  className?: string;
  style?: React.CSSProperties;
  quality?: number;
  priority?: boolean;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
}

// This is a simple shim for Next.js Image component
const Image = ({ 
  src, 
  alt, 
  width, 
  height, 
  fill, 
  className, 
  style,
  priority,
  ...props 
}: ImageProps) => {
  const imgStyle = {
    ...style,
    ...(fill ? { objectFit: 'cover', width: '100%', height: '100%', position: 'absolute' as const } : {})
  };

  // For local public images, we need to prepend /
  const imgSrc = src.startsWith('/') 
    ? src
    : (src.startsWith('http') ? src : `/${src}`);

  return (
    <img
      src={imgSrc}
      alt={alt}
      width={width}
      height={height}
      className={className}
      style={imgStyle}
      loading={priority ? 'eager' : 'lazy'}
      {...props}
    />
  );
};

export default Image;
