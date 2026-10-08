import React, { useState } from 'react';
import { Footprints } from 'lucide-react';

interface ProductImageProps {
  src: string;
  alt: string;
  categoryLabel?: string;
  className?: string;
}

export const ProductImage: React.FC<ProductImageProps> = ({
  src,
  alt,
  categoryLabel,
  className = '',
}) => {
  const [hasError, setHasError] = useState(false);

  if (hasError || !src) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-[#EFECE6] text-stone-700 p-6 text-center select-none ${className}`}
        role="img"
        aria-label={alt}
      >
        <Footprints className="w-10 h-10 text-stone-500 mb-3 stroke-[1.5]" />
        <span className="text-sm font-medium text-stone-800 max-w-[20ch] line-clamp-2">
          {alt}
        </span>
        {categoryLabel && (
          <span className="text-xs text-stone-500 mt-1">{categoryLabel}</span>
        )}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={`object-cover ${className}`}
    />
  );
};
