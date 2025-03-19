
import React from 'react';

interface NextImageProps {
  src: string;
  alt?: string;
  width?: number;
  height?: number;
  fill?: boolean;
  priority?: boolean;
  sizes?: string;
  quality?: number;
  className?: string;
  style?: React.CSSProperties;
  [key: string]: any;
}

/**
 * Mock implementation of Next.js Image component for React
 * This is a simplified version that emulates the Next.js Image component
 * for compatibility purposes.
 */
const Image = ({ 
  src, 
  alt = '',
  width,
  height,
  fill,
  priority,
  sizes,
  quality,
  className,
  style,
  ...props 
}: NextImageProps) => {
  // Convert Next.js Image props to standard img props
  const imgStyle = {
    ...style,
    ...(fill ? { 
      position: 'absolute',
      width: '100%',
      height: '100%',
      top: 0,
      left: 0,
      objectFit: 'cover'
    } : {})
  };

  // Construct the actual img element with the appropriate props
  return (
    <img
      src={src}
      alt={alt}
      width={fill ? undefined : width}
      height={fill ? undefined : height}
      className={className}
      style={imgStyle}
      loading={priority ? 'eager' : 'lazy'}
      {...props}
    />
  );
};

/**
 * Export module components
 */
export default Image;
