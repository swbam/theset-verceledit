
import React from 'react';

interface ImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  quality?: number;
  placeholder?: 'blur' | 'empty';
  style?: React.CSSProperties;
  fill?: boolean;
  blurDataURL?: string;
  loading?: 'eager' | 'lazy';
  onLoad?: (event: React.SyntheticEvent<HTMLImageElement, Event>) => void;
  onError?: (event: React.SyntheticEvent<HTMLImageElement, Event>) => void;
}

/**
 * Shim for Next.js Image component - reimplemented for non-Next.js environments
 */
const Image = ({
  src,
  alt,
  width,
  height,
  className,
  style,
  fill,
  quality,
  priority,
  onLoad,
  onError,
  ...props
}: ImageProps) => {
  const imgStyle: React.CSSProperties = {
    ...style,
    ...(fill ? { objectFit: 'cover', width: '100%', height: '100%', position: 'absolute' } : {})
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
      onLoad={onLoad}
      onError={onError}
      {...props}
    />
  );
};

export default Image;
