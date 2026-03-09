import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { Upload, Star, Trash2, ImagePlus, GripVertical } from 'lucide-react';

type ImageRow = Pick<Tables<'product_images'>, 'id' | 'image_url' | 'alt_text' | 'is_primary' | 'display_order' | 'variant_id'>;

type VariantWithImages = Pick<Tables<'product_variants'>, 'id' | 'color' | 'size' | 'sku'> & {
  product_images: ImageRow[];
};

interface ProductImageManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  productName: string;
  onUpdated?: () => void;
}

function getStoragePathFromPublicUrl(url: string): string | null {
  const marker = '/product-images/';
  const index = url.indexOf(marker);
  if (index === -1) return null;
  return decodeURIComponent(url.slice(index + marker.length));
}

export function ProductImageManager({ open, onOpenChange, productId, productName, onUpdated }: ProductImageManagerProps) {
  const [variants, setVariants] = useState<VariantWithImages[]>([]);
  const [activeVariantId, setActiveVariantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [draggedImageId, setDraggedImageId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const activeVariant = useMemo(
    () => variants.find((variant) => variant.id === activeVariantId) ?? null,
    [variants, activeVariantId]
  );

  const sortedImages = useMemo(
    () =>
      activeVariant?.product_images
        ?.slice()
        .sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || (a.display_order || 0) - (b.display_order || 0)) ?? [],
    [activeVariant]
  );

  const loadVariants = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('product_variants')
      .select('id, color, size, sku, product_images(id, image_url, alt_text, is_primary, display_order, variant_id)')
      .eq('product_id', productId)
      .order('created_at', { ascending: true });

    if (error) {
      toast({ title: 'Failed to load variants', description: error.message, variant: 'destructive' });
      setVariants([]);
      setActiveVariantId(null);
      setLoading(false);
      return;
    }

    const next = (data ?? []) as VariantWithImages[];
    setVariants(next);
    setActiveVariantId((prev) => prev && next.some((variant) => variant.id === prev) ? prev : (next[0]?.id ?? null));
    setLoading(false);
  };

  useEffect(() => {
    if (open) loadVariants();
  }, [open, productId]);

  const handleUploadFiles = async (files: FileList | null) => {
    if (!files || !activeVariant) return;

    const fileArray = Array.from(files).filter((file) => file.type.startsWith('image/'));
    if (fileArray.length === 0) {
      toast({ title: 'Please select image files', variant: 'destructive' });
      return;
    }

    setUploading(true);

    for (const file of fileArray) {
      const cleanName = file.name.replace(/\s+/g, '-').toLowerCase();
      const filePath = `${activeVariant.id}/${Date.now()}-${cleanName}`;

      const { error: uploadError } = await supabase.storage.from('product-images').upload(filePath, file);
      if (uploadError) {
        toast({ title: 'Upload failed', description: uploadError.message, variant: 'destructive' });
        continue;
      }

      const { data: publicUrlData } = supabase.storage.from('product-images').getPublicUrl(filePath);

      const nextOrder = (activeVariant.product_images?.length ?? 0) + 1;
      const { error: insertError } = await supabase.from('product_images').insert({
        variant_id: activeVariant.id,
        image_url: publicUrlData.publicUrl,
        alt_text: `${productName} ${activeVariant.color}${activeVariant.size ? ` ${activeVariant.size}` : ''}`,
        display_order: nextOrder,
      });

      if (insertError) {
        toast({ title: 'Image saved failed', description: insertError.message, variant: 'destructive' });
      }
    }

    setUploading(false);
    await loadVariants();
    onUpdated?.();
    toast({ title: 'Images uploaded' });
  };

  const handleDeleteImage = async (image: ImageRow) => {
    const storagePath = getStoragePathFromPublicUrl(image.image_url);

    if (storagePath) {
      const { error: storageError } = await supabase.storage.from('product-images').remove([storagePath]);
      if (storageError) {
        toast({ title: 'Failed to remove file from storage', description: storageError.message, variant: 'destructive' });
        return;
      }
    }

    const { error } = await supabase.from('product_images').delete().eq('id', image.id);
    if (error) {
      toast({ title: 'Failed to delete image', description: error.message, variant: 'destructive' });
      return;
    }

    await loadVariants();
    onUpdated?.();
    toast({ title: 'Image deleted' });
  };

  const handleSetPrimary = async (imageId: string) => {
    if (!activeVariant) return;

    const { error: resetError } = await supabase
      .from('product_images')
      .update({ is_primary: false })
      .eq('variant_id', activeVariant.id);

    if (resetError) {
      toast({ title: 'Failed to update primary image', description: resetError.message, variant: 'destructive' });
      return;
    }

    const { error } = await supabase.from('product_images').update({ is_primary: true }).eq('id', imageId);

    if (error) {
      toast({ title: 'Failed to update primary image', description: error.message, variant: 'destructive' });
      return;
    }

    await loadVariants();
    onUpdated?.();
    toast({ title: 'Primary image updated' });
  };

  const handleReorder = useCallback(
    async (dragId: string, dropId: string) => {
      if (dragId === dropId) return;

      const oldList = [...sortedImages];
      const dragIndex = oldList.findIndex((img) => img.id === dragId);
      const dropIndex = oldList.findIndex((img) => img.id === dropId);
      if (dragIndex === -1 || dropIndex === -1) return;

      const reordered = [...oldList];
      const [moved] = reordered.splice(dragIndex, 1);
      reordered.splice(dropIndex, 0, moved);

      // Optimistic update
      if (activeVariant) {
        setVariants((prev) =>
          prev.map((v) =>
            v.id === activeVariant.id
              ? { ...v, product_images: reordered.map((img, i) => ({ ...img, display_order: i + 1 })) }
              : v
          )
        );
      }

      // Batch update display_order
      const updates = reordered.map((img, i) =>
        supabase.from('product_images').update({ display_order: i + 1 }).eq('id', img.id)
      );

      const results = await Promise.all(updates);
      const failed = results.find((r) => r.error);
      if (failed?.error) {
        toast({ title: 'Failed to reorder', description: failed.error.message, variant: 'destructive' });
        await loadVariants();
        return;
      }

      onUpdated?.();
    },
    [sortedImages, activeVariant, onUpdated]
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-3xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-luxury">Manage Product Images</SheetTitle>
          <SheetDescription>{productName}</SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="mt-6 space-y-3">
            {[1, 2, 3].map((item) => (
              <Skeleton key={item} className="h-16 w-full" />
            ))}
          </div>
        ) : variants.length === 0 ? (
          <div className="mt-6 rounded-lg border border-dashed p-8 text-center text-muted-foreground">
            Add a variant first to upload images.
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            <div className="flex flex-wrap gap-2">
              {variants.map((variant) => (
                <Button
                  key={variant.id}
                  type="button"
                  variant={activeVariantId === variant.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveVariantId(variant.id)}
                >
                  {variant.color}{variant.size ? ` • ${variant.size}` : ''}
                </Button>
              ))}
            </div>

            <div
              className={`rounded-xl border-2 border-dashed p-8 text-center transition-colors ${dragging ? 'border-primary bg-muted/50' : 'border-border'}`}
              onDragOver={(event) => {
                event.preventDefault();
                if (!draggedImageId) setDragging(true);
              }}
              onDragLeave={() => { if (!draggedImageId) setDragging(false); }}
              onDrop={(event) => {
                event.preventDefault();
                if (!draggedImageId) {
                  setDragging(false);
                  handleUploadFiles(event.dataTransfer.files);
                }
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(event) => handleUploadFiles(event.target.files)}
              />
              <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                <Upload className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="font-medium">Drag & drop images here</p>
              <p className="text-sm text-muted-foreground mt-1">or</p>
              <Button type="button" variant="outline" className="mt-3" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                <ImagePlus className="h-4 w-4 mr-2" />
                {uploading ? 'Uploading...' : 'Select Images'}
              </Button>
            </div>

            {activeVariant && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium">Image Gallery</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Drag to reorder</span>
                    <Badge variant="secondary">{activeVariant.product_images.length} images</Badge>
                  </div>
                </div>

                {sortedImages.length === 0 ? (
                  <div className="rounded-lg border p-6 text-sm text-muted-foreground text-center">No images uploaded for this variant yet.</div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {sortedImages.map((image) => (
                      <div
                        key={image.id}
                        draggable
                        onDragStart={(e) => {
                          setDraggedImageId(image.id);
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'move';
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (draggedImageId && draggedImageId !== image.id) {
                            handleReorder(draggedImageId, image.id);
                          }
                          setDraggedImageId(null);
                        }}
                        onDragEnd={() => setDraggedImageId(null)}
                        className={`rounded-lg border overflow-hidden bg-card cursor-grab active:cursor-grabbing transition-opacity ${draggedImageId === image.id ? 'opacity-50' : ''}`}
                      >
                        <div className="relative aspect-[3/4] bg-muted">
                          <img src={image.image_url} alt={image.alt_text || productName} className="w-full h-full object-cover" loading="lazy" />
                          <div className="absolute top-1.5 left-1.5 rounded bg-background/80 p-0.5">
                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                        <div className="p-2 flex items-center justify-between gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant={image.is_primary ? 'default' : 'outline'}
                            onClick={() => handleSetPrimary(image.id)}
                            className="flex-1"
                          >
                            <Star className="h-3.5 w-3.5 mr-1" />
                            {image.is_primary ? 'Primary' : 'Set Primary'}
                          </Button>
                          <Button type="button" size="icon" variant="ghost" onClick={() => handleDeleteImage(image)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
