import React, { useEffect, useState } from 'react';
import { GarmentCategory, ProductColorway } from '../types';
import { getCachedStudioGarment, renderStudioGarment } from '../utils/garmentStudio';

interface SmartGarmentImageProps {
  src: string;
  category: GarmentCategory;
  designId: string;
  alt: string;
  colorway: ProductColorway;
  className?: string;
  style?: React.CSSProperties;
}

export const SmartGarmentImage: React.FC<SmartGarmentImageProps> = ({
  src,
  category,
  designId,
  alt,
  colorway,
  className = '',
  style,
}) => {
  const cachedInit = getCachedStudioGarment(src, category, designId, colorway);
  const [displaySrc, setDisplaySrc] = useState<string>(cachedInit || src);
  const [isReady, setIsReady] = useState<boolean>(Boolean(cachedInit));

  useEffect(() => {
    let active = true;
    const hit = getCachedStudioGarment(src, category, designId, colorway);
    if (hit) {
      setDisplaySrc(hit);
      setIsReady(true);
      return;
    }

    renderStudioGarment(src, category, designId, colorway)
      .then((url) => {
        if (active) {
          setDisplaySrc(url);
          setIsReady(true);
        }
      })
      .catch(() => {
        if (active) {
          setDisplaySrc(src);
          setIsReady(true);
        }
      });

    return () => {
      active = false;
    };
  }, [src, category, designId, colorway]);

  return (
    <img
      src={displaySrc}
      alt={alt}
      className={className}
      style={{
        ...style,
        opacity: isReady ? 1 : 0.72,
        transition: 'opacity 0.22s ease, transform 0.55s cubic-bezier(0.22, 1, 0.36, 1)',
      }}
      loading="lazy"
    />
  );
};
