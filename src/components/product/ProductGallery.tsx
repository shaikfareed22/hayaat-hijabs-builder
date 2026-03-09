import { useEffect, useMemo, useState } from 'react';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { cn } from '@/lib/utils';

interface ProductGalleryImage {
  id: string;
  image_url: string;
  alt_text?: string | null;
  is_primary?: boolean | null;
  display_order?: number | null;
}

interface ProductGalleryProps {
  images: ProductGalleryImage[];
  productName: string;
}

export function ProductGallery({ images, productName }: ProductGalleryProps) {
  const sortedImages = useMemo(
    () =>
      [...images].sort(
        (a, b) => Number(b.is_primary) - Number(a.is_primary) || (a.display_order || 0) - (b.display_order || 0)
      ),
    [images]
  );

  const [selectedImageId, setSelectedImageId] = useState<string | null>(sortedImages[0]?.id ?? null);

  useEffect(() => {
    setSelectedImageId(sortedImages[0]?.id ?? null);
  }, [sortedImages]);

  const selectedImage = sortedImages.find((image) => image.id === selectedImageId) ?? sortedImages[0];

  if (sortedImages.length === 0) {
    return (
      <AspectRatio ratio={3 / 4} className="rounded-xl border bg-muted flex items-center justify-center">
        <p className="text-muted-foreground text-sm">No images available</p>
      </AspectRatio>
    );
  }

  return (
    <div className="space-y-3">
      <AspectRatio ratio={3 / 4} className="rounded-xl overflow-hidden bg-muted border">
        <img
          key={selectedImage.id}
          src={selectedImage.image_url}
          alt={selectedImage.alt_text || `${productName} image`}
          className="h-full w-full object-cover transition-opacity duration-300"
          loading="lazy"
        />
      </AspectRatio>

      {sortedImages.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {sortedImages.map((image) => (
            <button
              key={image.id}
              type="button"
              onClick={() => setSelectedImageId(image.id)}
              className={cn(
                'h-16 w-16 rounded-md overflow-hidden border-2 shrink-0 transition-colors',
                selectedImage.id === image.id ? 'border-primary' : 'border-border'
              )}
              aria-label="Select product image"
            >
              <img src={image.image_url} alt={image.alt_text || `${productName} thumbnail`} className="h-full w-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
