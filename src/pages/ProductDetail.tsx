import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { ProductGallery } from '@/components/product/ProductGallery';
import { AddToCartButton } from '@/components/cart/AddToCartButton';
import { WishlistButton } from '@/components/product/WishlistButton';
import { RelatedProducts } from '@/components/product/RelatedProducts';
import { RecentlyViewed } from '@/components/product/RecentlyViewed';
import { addToRecentlyViewed } from '@/hooks/useRecentlyViewed';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

type VariantWithImages = Pick<Tables<'product_variants'>, 'id' | 'color' | 'size' | 'price' | 'stock_quantity'> & {
  product_images: Pick<Tables<'product_images'>, 'id' | 'image_url' | 'alt_text' | 'is_primary' | 'display_order' | 'variant_id'>[];
};

type ProductWithVariants = Tables<'products'> & {
  product_variants: VariantWithImages[];
};

export default function ProductDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [product, setProduct] = useState<ProductWithVariants | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');

  useEffect(() => {
    const fetchProduct = async () => {
      if (!slug) return;
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*, product_variants(id, color, size, price, stock_quantity, product_images(id, image_url, alt_text, is_primary, display_order, variant_id))')
        .eq('slug', slug)
        .eq('is_active', true)
        .single();

      if (!error && data) {
        const typed = data as ProductWithVariants;
        setProduct(typed);
        const first = typed.product_variants?.[0];
        if (first) {
          setSelectedColor(first.color ?? '');
          setSelectedSize(first.size ?? '');
        }
        addToRecentlyViewed(typed.id);
      }
      setLoading(false);
    };
    fetchProduct();
  }, [slug]);

  const variantsForColor = useMemo(() => product?.product_variants.filter(v => v.color === selectedColor) ?? [], [product, selectedColor]);
  const selectedVariant = useMemo(() => variantsForColor.find(v => (v.size ?? '') === selectedSize) || variantsForColor[0] || product?.product_variants[0] || null, [variantsForColor, selectedSize, product]);

  const imagesForGallery = useMemo(() => {
    if (!product) return [];
    if (selectedVariant?.product_images?.length) return selectedVariant.product_images;
    return product.product_variants.filter(v => v.color === selectedColor).flatMap(v => v.product_images);
  }, [product, selectedVariant, selectedColor]);

  const primaryImage = useMemo(() => {
    const images = selectedVariant?.product_images || imagesForGallery;
    const primary = images.find(img => img.is_primary) || images[0];
    return primary?.image_url || '/placeholder.svg';
  }, [selectedVariant, imagesForGallery]);

  const colors = useMemo(() => Array.from(new Set(product?.product_variants.map(v => v.color) ?? [])), [product]);
  const sizes = useMemo(() => Array.from(new Set((product?.product_variants ?? []).filter(v => v.color === selectedColor).map(v => v.size || ''))), [product, selectedColor]);

  if (loading) {
    return (
      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-10 grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
        <Skeleton className="w-full aspect-[3/4] rounded-xl" />
        <div className="space-y-4"><Skeleton className="h-8 w-3/4" /><Skeleton className="h-5 w-1/3" /><Skeleton className="h-24 w-full" /><Skeleton className="h-10 w-40" /></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-luxury">Product not found</h1>
        <Link to="/" className="text-primary hover:underline mt-3 inline-block">Back to home</Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-10">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-10">
        <ProductGallery images={imagesForGallery} productName={product.name} />

        <div className="space-y-5 sm:space-y-6">
          <div>
            <div className="flex items-start justify-between">
              <h1 className="text-2xl sm:text-3xl font-luxury font-semibold">{product.name}</h1>
              <WishlistButton productId={product.id} />
            </div>
            {product.fabric_type && <p className="text-muted-foreground mt-1 text-sm sm:text-base">{product.fabric_type}</p>}
            <p className="text-xl sm:text-2xl font-semibold mt-2 sm:mt-3">₹{Number(selectedVariant?.price || 0).toFixed(2)}</p>
            {selectedVariant && (selectedVariant.stock_quantity || 0) < 5 && (selectedVariant.stock_quantity || 0) > 0 && (
              <Badge variant="secondary" className="mt-2">Only {selectedVariant.stock_quantity} left</Badge>
            )}
            {selectedVariant && (selectedVariant.stock_quantity || 0) <= 0 && (
              <Badge variant="destructive" className="mt-2">Out of stock</Badge>
            )}
          </div>

          {product.short_description && <p className="text-muted-foreground text-sm sm:text-base">{product.short_description}</p>}

          {colors.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Color</p>
              <div className="flex flex-wrap gap-2">
                {colors.map(color => (
                  <button key={color} type="button" onClick={() => { setSelectedColor(color); setSelectedSize(product.product_variants.find(v => v.color === color)?.size || ''); }}
                    className={`px-4 py-2.5 rounded-md border text-sm transition-colors active:scale-95 ${selectedColor === color ? 'border-primary bg-muted' : 'border-border hover:bg-muted'}`}>
                    {color}
                  </button>
                ))}
              </div>
            </div>
          )}

          {sizes.some(s => s) && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Size</p>
              <div className="flex flex-wrap gap-2">
                {sizes.map(size => (
                  <button key={size || 'default'} type="button" onClick={() => setSelectedSize(size)}
                    className={`px-4 py-2.5 rounded-md border text-sm transition-colors active:scale-95 ${selectedSize === size ? 'border-primary bg-muted' : 'border-border hover:bg-muted'}`}>
                    {size || 'Standard'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {selectedVariant && (
            <div className="hidden md:block">
              <AddToCartButton productId={product.id} variantId={selectedVariant.id} disabled={(selectedVariant.stock_quantity || 0) <= 0} className="w-full md:w-auto h-12 text-base px-8"
                productName={product.name} productPrice={Number(selectedVariant.price)} productImage={primaryImage} productColor={selectedVariant.color} productSize={selectedVariant.size} />
            </div>
          )}

          <div className="pt-4 border-t space-y-3">
            {product.description && (<div><p className="font-medium">Description</p><p className="text-muted-foreground text-sm mt-1">{product.description}</p></div>)}
            {product.care_instructions && (<div><p className="font-medium">Care Instructions</p><p className="text-muted-foreground text-sm mt-1">{product.care_instructions}</p></div>)}
          </div>
        </div>
      </div>

      {/* Related Products */}
      <RelatedProducts productId={product.id} categoryId={product.category_id} />

      {/* Recently Viewed */}
      <RecentlyViewed excludeId={product.id} />

      {/* Sticky Mobile Add to Cart Bar */}
      {selectedVariant && (
        <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-background/95 backdrop-blur-md border-t border-border px-4 py-3 safe-area-bottom">
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-lg font-semibold">₹{Number(selectedVariant.price).toFixed(2)}</p>
              <p className="text-xs text-muted-foreground truncate">
                {selectedColor}{selectedSize ? ` · ${selectedSize}` : ''}{(selectedVariant.stock_quantity || 0) <= 0 && ' · Out of stock'}
              </p>
            </div>
            <AddToCartButton productId={product.id} variantId={selectedVariant.id} disabled={(selectedVariant.stock_quantity || 0) <= 0} className="h-12 px-6 text-base shrink-0"
              productName={product.name} productPrice={Number(selectedVariant.price)} productImage={primaryImage} productColor={selectedVariant.color} productSize={selectedVariant.size} />
          </div>
        </div>
      )}
      <div className="h-20 md:hidden" />
    </div>
  );
}
