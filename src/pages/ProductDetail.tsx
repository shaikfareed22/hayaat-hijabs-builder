import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { ProductGallery } from '@/components/product/ProductGallery';
import { AddToCartButton } from '@/components/cart/AddToCartButton';
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
        const first = typed.product_variants[0];
        setSelectedColor(first?.color ?? '');
        setSelectedSize(first?.size ?? '');
      }

      setLoading(false);
    };

    fetchProduct();
  }, [slug]);

  const variantsForColor = useMemo(
    () => product?.product_variants.filter((variant) => variant.color === selectedColor) ?? [],
    [product, selectedColor]
  );

  const selectedVariant = useMemo(
    () =>
      variantsForColor.find((variant) => (variant.size ?? '') === selectedSize) || variantsForColor[0] || product?.product_variants[0] || null,
    [variantsForColor, selectedSize, product]
  );

  const imagesForGallery = useMemo(() => {
    if (!product) return [];
    if (selectedVariant?.product_images?.length) return selectedVariant.product_images;
    return product.product_variants
      .filter((variant) => variant.color === selectedColor)
      .flatMap((variant) => variant.product_images);
  }, [product, selectedVariant, selectedColor]);

  const colors = useMemo(() => Array.from(new Set(product?.product_variants.map((variant) => variant.color) ?? [])), [product]);
  const sizes = useMemo(
    () => Array.from(new Set((product?.product_variants ?? []).filter((variant) => variant.color === selectedColor).map((variant) => variant.size || ''))),
    [product, selectedColor]
  );

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-10 grid grid-cols-1 md:grid-cols-2 gap-8">
        <Skeleton className="w-full aspect-[3/4] rounded-xl" />
        <div className="space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-10 w-40" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-luxury">Product not found</h1>
        <Link to="/" className="text-primary hover:underline mt-3 inline-block">
          Back to home
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <ProductGallery images={imagesForGallery} productName={product.name} />

        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-luxury font-semibold">{product.name}</h1>
            {product.fabric_type && <p className="text-muted-foreground mt-1">{product.fabric_type}</p>}
            <p className="text-2xl font-semibold mt-3">${Number(selectedVariant?.price || 0).toFixed(2)}</p>
            {selectedVariant && (selectedVariant.stock_quantity || 0) < 5 && (
              <Badge variant="secondary" className="mt-2">
                Low stock
              </Badge>
            )}
          </div>

          {product.short_description && <p className="text-muted-foreground">{product.short_description}</p>}

          {colors.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Color</p>
              <div className="flex flex-wrap gap-2">
                {colors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => {
                      setSelectedColor(color);
                      const nextSize =
                        product.product_variants.find((variant) => variant.color === color)?.size || '';
                      setSelectedSize(nextSize);
                    }}
                    className={`px-3 py-2 rounded-md border text-sm transition-colors ${selectedColor === color ? 'border-primary bg-muted' : 'border-border hover:bg-muted'}`}
                  >
                    {color}
                  </button>
                ))}
              </div>
            </div>
          )}

          {sizes.some((size) => size) && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Size</p>
              <div className="flex flex-wrap gap-2">
                {sizes.map((size) => (
                  <button
                    key={size || 'default'}
                    type="button"
                    onClick={() => setSelectedSize(size)}
                    className={`px-3 py-2 rounded-md border text-sm transition-colors ${selectedSize === size ? 'border-primary bg-muted' : 'border-border hover:bg-muted'}`}
                  >
                    {size || 'Standard'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {selectedVariant && (
            <AddToCartButton
              productId={product.id}
              variantId={selectedVariant.id}
              disabled={(selectedVariant.stock_quantity || 0) <= 0}
              className="w-full md:w-auto"
            />
          )}

          <div className="pt-4 border-t space-y-3">
            {product.description && (
              <div>
                <p className="font-medium">Description</p>
                <p className="text-muted-foreground text-sm mt-1">{product.description}</p>
              </div>
            )}
            {product.care_instructions && (
              <div>
                <p className="font-medium">Care Instructions</p>
                <p className="text-muted-foreground text-sm mt-1">{product.care_instructions}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
