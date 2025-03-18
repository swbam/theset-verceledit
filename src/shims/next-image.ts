
import React from 'react';

// Define types similar to Next.js Image component
interface ImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  fill?: boolean;
  quality?: number;
  priority?: boolean;
  loading?: 'lazy' | 'eager';
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  className?: string;
  style?: React.CSSProperties;
  sizes?: string;
  unoptimized?: boolean;
  layout?: 'fill' | 'fixed' | 'intrinsic' | 'responsive';
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  objectPosition?: string;
}

// Create a simple Image component that works like Next.js Image
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
  const imgStyle: React.CSSProperties = {
    ...style,
    ...(fill ? { 
      position: 'absolute',
      height: '100%',
      width: '100%',
      inset: '0px',
      objectFit: 'cover' 
    } : {})
  };

  return (
    <img
      src={src}
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
