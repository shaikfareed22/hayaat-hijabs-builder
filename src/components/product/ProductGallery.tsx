import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { ZoomIn, ZoomOut, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
  const [zoomOpen, setZoomOpen] = useState(false);
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0, tx: 0, ty: 0 });

  useEffect(() => {
    setSelectedImageId(sortedImages[0]?.id ?? null);
  }, [sortedImages]);

  const selectedImage = sortedImages.find((image) => image.id === selectedImageId) ?? sortedImages[0];

  const resetZoom = useCallback(() => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  }, []);

  const handleOpenZoom = () => {
    resetZoom();
    setZoomOpen(true);
  };

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setScale((prev) => Math.min(5, Math.max(1, prev + (e.deltaY > 0 ? -0.3 : 0.3))));
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (scale <= 1) return;
    isPanning.current = true;
    panStart.current = { x: e.clientX, y: e.clientY, tx: translate.x, ty: translate.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [scale, translate]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isPanning.current) return;
    setTranslate({
      x: panStart.current.tx + (e.clientX - panStart.current.x),
      y: panStart.current.ty + (e.clientY - panStart.current.y),
    });
  }, []);

  const handlePointerUp = useCallback(() => {
    isPanning.current = false;
  }, []);

  // Reset translate when scale goes back to 1
  useEffect(() => {
    if (scale <= 1) setTranslate({ x: 0, y: 0 });
  }, [scale]);

  if (sortedImages.length === 0) {
    return (
      <AspectRatio ratio={3 / 4} className="rounded-xl border bg-muted flex items-center justify-center">
        <p className="text-muted-foreground text-sm">No images available</p>
      </AspectRatio>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative group cursor-zoom-in" onClick={handleOpenZoom}>
        <AspectRatio ratio={3 / 4} className="rounded-xl overflow-hidden bg-muted border">
          <img
            key={selectedImage.id}
            src={selectedImage.image_url}
            alt={selectedImage.alt_text || `${productName} image`}
            className="h-full w-full object-cover transition-opacity duration-300"
            loading="lazy"
          />
        </AspectRatio>
        <div className="absolute inset-0 rounded-xl flex items-center justify-center bg-foreground/0 group-hover:bg-foreground/10 transition-colors">
          <div className="rounded-full bg-background/80 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <ZoomIn className="h-5 w-5 text-foreground" />
          </div>
        </div>
      </div>

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

      <Dialog open={zoomOpen} onOpenChange={(open) => { setZoomOpen(open); if (!open) resetZoom(); }}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] w-auto h-auto p-0 border-0 bg-transparent shadow-none [&>button]:hidden">
          <div className="relative w-[95vw] h-[95vh] flex items-center justify-center bg-background/95 rounded-lg overflow-hidden">
            {/* Controls */}
            <div className="absolute top-3 right-3 z-10 flex gap-1.5">
              <Button size="icon" variant="secondary" onClick={() => setScale((s) => Math.min(5, s + 0.5))}>
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="secondary" onClick={() => setScale((s) => Math.max(1, s - 0.5))}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="secondary" onClick={() => setZoomOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Zoomable image */}
            <div
              className="w-full h-full flex items-center justify-center select-none touch-none"
              onWheel={handleWheel}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              style={{ cursor: scale > 1 ? 'grab' : 'default' }}
            >
              <img
                src={selectedImage.image_url}
                alt={selectedImage.alt_text || `${productName} zoomed`}
                className="max-w-full max-h-full object-contain transition-transform duration-100"
                style={{
                  transform: `scale(${scale}) translate(${translate.x / scale}px, ${translate.y / scale}px)`,
                }}
                draggable={false}
              />
            </div>

            {/* Thumbnail strip */}
            {sortedImages.length > 1 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 bg-background/80 rounded-lg p-2">
                {sortedImages.map((image) => (
                  <button
                    key={image.id}
                    type="button"
                    onClick={() => { setSelectedImageId(image.id); resetZoom(); }}
                    className={cn(
                      'h-12 w-12 rounded overflow-hidden border-2 shrink-0 transition-colors',
                      selectedImage.id === image.id ? 'border-primary' : 'border-border'
                    )}
                  >
                    <img src={image.image_url} alt="" className="h-full w-full object-cover" loading="lazy" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
