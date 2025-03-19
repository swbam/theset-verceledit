
import React from 'react';

type ImageProps = {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  priority?: boolean;
  className?: string;
  style?: React.CSSProperties;
  sizes?: string;
  quality?: number;
  fill?: boolean;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  loading?: 'lazy' | 'eager';
  objectFit?: React.CSSProperties['objectFit'];
  objectPosition?: React.CSSProperties['objectPosition'];
  onLoad?: (event: React.SyntheticEvent<HTMLImageElement, Event>) => void;
  onError?: (event: React.SyntheticEvent<HTMLImageElement, Event>) => void;
};

// Create a polyfill for Next.js Image component
function Image({
  src,
  alt,
  width,
  height,
  priority,
  className,
  style,
  sizes,
  fill,
  ...props
}: ImageProps) {
  const imgStyle = {
    ...style,
    objectFit: props.objectFit,
    objectPosition: props.objectPosition,
    ...(fill ? { position: 'absolute', height: '100%', width: '100%', left: 0, top: 0, right: 0, bottom: 0 } : {})
  };

  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      style={imgStyle}
      loading={priority ? 'eager' : props.loading || 'lazy'}
      onLoad={props.onLoad}
      onError={props.onError}
      sizes={sizes}
    />
  );
}

export default Image;
