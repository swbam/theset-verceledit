
import React from 'react';

// Basic mock for Next.js Image component for use with React Router
const NextImage = ({
  src,
  alt,
  width,
  height,
  fill,
  className,
  priority,
  quality,
  sizes,
  style,
  ...rest
}: {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  fill?: boolean;
  className?: string;
  priority?: boolean;
  quality?: number;
  sizes?: string;
  style?: React.CSSProperties;
  [key: string]: any;
}) => {
  const imgStyle: React.CSSProperties = {
    objectFit: 'cover',
    ...(style || {})
  };

  // If fill is true, use position absolute styling
  if (fill) {
    return (
      <img 
        src={src} 
        alt={alt} 
        className={className} 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          ...imgStyle
        }}
        {...rest}
      />
    );
  }

  // Otherwise use regular img tag with width and height
  return (
    <img 
      src={src} 
      alt={alt} 
      width={width} 
      height={height} 
      className={className}
      style={imgStyle}
      {...rest}
    />
  );
};

export default NextImage;
