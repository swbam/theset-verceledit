
import React from 'react';

// Mock Next.js Image component for compatibility
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
  unoptimized,
  placeholder,
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
  loading?: 'eager' | 'lazy';
  unoptimized?: boolean;
  placeholder?: 'blur' | 'empty' | 'data:image/...';
  [key: string]: any;
}) => {
  const imgStyle = {
    ...style,
    maxWidth: '100%',
    height: 'auto',
    objectFit: style?.objectFit || 'contain'
  };

  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      style={imgStyle}
      loading={loading}
      {...props}
    />
  );
};

export default NextImage;
