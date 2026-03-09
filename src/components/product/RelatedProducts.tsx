import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { AddToCartButton } from '@/components/cart/AddToCartButton';
import { WishlistButton } from '@/components/product/WishlistButton';

interface RelatedProduct {
  id: string;
  name: string;
  slug: string;
  short_description: string | null;
  product_variants: Array<{
    id: string;
    price: number;
    color: string;
    size: string | null;
    stock_quantity: number | null;
    product_images: Array<{
      image_url: string;
      alt_text: string | null;
      is_primary: boolean | null;
    }>;
  }>;
}

interface RelatedProductsProps {
  productId: string;
  categoryId: string | null;
}

export function RelatedProducts({ productId, categoryId }: RelatedProductsProps) {
  const [products, setProducts] = useState<RelatedProduct[]>([]);

  useEffect(() => {
    if (!categoryId) return;

    const fetch = async () => {
      const { data } = await supabase
        .from('products')
        .select('id, name, slug, short_description, product_variants(id, price, color, size, stock_quantity, product_images(image_url, alt_text, is_primary))')
        .eq('category_id', categoryId)
        .eq('is_active', true)
        .neq('id', productId)
        .limit(4);

      if (data) setProducts(data as unknown as RelatedProduct[]);
    };
    fetch();
  }, [productId, categoryId]);

  if (products.length === 0) return null;

  return (
    <section className="mt-12 sm:mt-16">
      <h2 className="text-xl sm:text-2xl font-luxury font-semibold mb-6">You May Also Like</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {products.map((product) => {
          const variant = product.product_variants[0];
          if (!variant) return null;
          const image = variant.product_images?.find(i => i.is_primary) || variant.product_images?.[0];

          return (
            <Card key={product.id} className="group overflow-hidden border-border">
              <div className="relative aspect-[3/4] overflow-hidden">
                <Link to={`/products/${product.slug}`}>
                  <img
                    src={image?.image_url || '/placeholder.svg'}
                    alt={image?.alt_text || product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                </Link>
                <div className="absolute top-2 right-2">
                  <WishlistButton productId={product.id} />
                </div>
              </div>
              <CardContent className="p-3">
                <Link to={`/products/${product.slug}`}>
                  <h3 className="font-medium text-sm truncate hover:text-primary transition-colors">{product.name}</h3>
                </Link>
                <p className="text-sm font-semibold mt-1">₹{Number(variant.price).toFixed(2)}</p>
                <div className="mt-2">
                  <AddToCartButton
                    productId={product.id}
                    variantId={variant.id}
                    disabled={(variant.stock_quantity || 0) <= 0}
                    className="w-full h-8 text-xs"
                    productName={product.name}
                    productPrice={Number(variant.price)}
                    productImage={image?.image_url || '/placeholder.svg'}
                    productColor={variant.color}
                    productSize={variant.size}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
