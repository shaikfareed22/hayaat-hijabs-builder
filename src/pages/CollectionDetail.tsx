import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AddToCartButton } from '@/components/cart/AddToCartButton';
import { WishlistButton } from '@/components/product/WishlistButton';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ShoppingCart, ArrowLeft } from 'lucide-react';

export default function CollectionDetail() {
  const { slug } = useParams<{ slug: string }>();

  const { data: collection, isLoading: loadingCollection } = useQuery({
    queryKey: ['collection', slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('collections')
        .select('*')
        .eq('slug', slug!)
        .eq('is_active', true)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: products, isLoading: loadingProducts } = useQuery({
    queryKey: ['collection-products', collection?.id],
    enabled: !!collection?.id,
    queryFn: async () => {
      const { data: pcs, error: pcError } = await supabase
        .from('product_collections')
        .select('product_id, display_order')
        .eq('collection_id', collection!.id)
        .order('display_order');
      if (pcError) throw pcError;

      const productIds = pcs.map((pc) => pc.product_id);
      if (productIds.length === 0) return [];

      const { data, error } = await supabase
        .from('products')
        .select(`
          id, name, slug, short_description, fabric_type,
          product_variants (
            id, color, size, price, stock_quantity,
            product_images ( id, image_url, alt_text, is_primary, display_order )
          )
        `)
        .in('id', productIds)
        .eq('is_active', true);
      if (error) throw error;
      return data;
    },
  });

  const getImage = (product: any) => {
    const variant = product?.product_variants?.[0];
    const img = variant?.product_images?.find((i: any) => i.is_primary) || variant?.product_images?.[0];
    return img?.image_url || '/placeholder.svg';
  };

  const getPrice = (product: any) => product?.product_variants?.[0]?.price || 0;

  const isLoading = loadingCollection || loadingProducts;

  if (!loadingCollection && !collection) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-luxury">Collection not found</h1>
        <Button asChild variant="outline" className="mt-4"><Link to="/collections"><ArrowLeft className="h-4 w-4 mr-2" />All Collections</Link></Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8">
      {/* Hero */}
      {collection && (
        <div className="mb-8">
          {collection.image_url && (
            <div className="relative rounded-2xl overflow-hidden aspect-[21/9] mb-6">
              <img src={collection.image_url} alt={collection.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-foreground/50 to-transparent" />
              <div className="absolute bottom-6 left-6 text-background">
                <h1 className="font-luxury text-3xl sm:text-5xl">{collection.name}</h1>
                {collection.description && <p className="text-sm sm:text-base mt-1 opacity-90">{collection.description}</p>}
              </div>
            </div>
          )}
          {!collection.image_url && (
            <div className="mb-6">
              <Button asChild variant="ghost" size="sm" className="mb-2"><Link to="/collections"><ArrowLeft className="h-4 w-4 mr-1" />Collections</Link></Button>
              <h1 className="font-luxury text-3xl sm:text-5xl">{collection.name}</h1>
              {collection.description && <p className="text-muted-foreground mt-2">{collection.description}</p>}
            </div>
          )}
        </div>
      )}

      {isLoading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          {[...Array(4)].map((_, i) => <Card key={i}><Skeleton className="aspect-[3/4]" /></Card>)}
        </div>
      )}

      {!isLoading && (!products || products.length === 0) && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No products in this collection yet.</p>
        </div>
      )}

      {!isLoading && products && products.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          {products.map((product: any) => {
            const image = getImage(product);
            const price = getPrice(product);
            const variant = product.product_variants?.[0];

            return (
              <Card key={product.id} className="group overflow-hidden">
                <Link to={`/products/${product.slug}`}>
                  <div className="aspect-[3/4] overflow-hidden bg-muted relative">
                    <img src={image} alt={product.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <WishlistButton productId={product.id} className="h-8 w-8" />
                    </div>
                  </div>
                </Link>
                <CardContent className="p-3 sm:p-4">
                  <Link to={`/products/${product.slug}`}>
                    <h3 className="font-medium text-sm sm:text-base mb-1 hover:text-primary transition-colors line-clamp-1">{product.name}</h3>
                  </Link>
                  {product.fabric_type && <p className="text-xs text-muted-foreground mb-2">{product.fabric_type}</p>}
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-semibold text-sm sm:text-lg">₹{Number(price).toLocaleString()}</span>
                    {variant && (
                      <AddToCartButton
                        productId={product.id}
                        variantId={variant.id}
                        productName={product.name}
                        productPrice={Number(price)}
                        productImage={image}
                        productColor={variant.color}
                        productSize={variant.size}
                        size="icon"
                        className="h-9 w-9 rounded-full shrink-0"
                      >
                        <ShoppingCart className="h-4 w-4" />
                      </AddToCartButton>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
