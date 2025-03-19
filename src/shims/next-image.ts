
import React from 'react';

interface ImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  placeholder?: 'blur' | 'empty' | 'data:image/...' | undefined;
  blurDataURL?: string;
  style?: React.CSSProperties;
  sizes?: string;
  quality?: number;
  fill?: boolean;
  loading?: 'eager' | 'lazy';
  onLoad?: () => void;
  onError?: () => void;
}

/**
 * This is a simple shim for Next.js Image component to allow using it in non-Next.js projects
 * It behaves like a regular img element with additional React props
 */
const NextImage = ({
  src,
  alt,
  width,
  height,
  className,
  priority,
  placeholder,
  blurDataURL,
  style,
  sizes,
  quality,
  fill,
  loading,
  onLoad,
  onError,
  ...props
}: ImageProps) => {
  const imgRef = React.useRef<HTMLImageElement>(null);

  React.useEffect(() => {
    if (priority) {
      // Simulate priority loading by setting loading to 'eager'
      if (imgRef.current) {
        imgRef.current.loading = 'eager';
      }
    }
  }, [priority]);

  return (
    <img
      ref={imgRef}
      src={src}
      alt={alt || ''}
      width={width}
      height={height}
      className={className}
      style={{
        ...(fill ? { objectFit: 'cover', width: '100%', height: '100%' } : {}),
        ...style
      }}
      loading={priority ? 'eager' : loading || 'lazy'}
      onLoad={onLoad}
      onError={onError}
      {...props}
    />
  );
};

export default NextImage;
