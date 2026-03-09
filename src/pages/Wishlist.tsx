import { Link } from 'react-router-dom';
import { useWishlist, useToggleWishlist } from '@/hooks/useWishlist';
import { AddToCartButton } from '@/components/cart/AddToCartButton';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Heart, ShoppingCart, Trash2 } from 'lucide-react';

export default function Wishlist() {
  const { data: items, isLoading } = useWishlist();
  const toggle = useToggleWishlist();

  const getImage = (product: any) => {
    const variant = product?.product_variants?.[0];
    const img = variant?.product_images?.find((i: any) => i.is_primary) || variant?.product_images?.[0];
    return img?.image_url || '/placeholder.svg';
  };

  const getPrice = (product: any) => product?.product_variants?.[0]?.price || 0;
  const getVariant = (product: any) => product?.product_variants?.[0];

  return (
    <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="font-luxury text-3xl sm:text-4xl md:text-5xl mb-2">My Wishlist</h1>
        <p className="text-muted-foreground text-sm sm:text-base">Products you've saved for later.</p>
      </div>

      {isLoading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}><Skeleton className="aspect-[3/4]" /><CardContent className="p-3"><Skeleton className="h-4 w-3/4" /></CardContent></Card>
          ))}
        </div>
      )}

      {!isLoading && (!items || items.length === 0) && (
        <div className="text-center py-16">
          <Heart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">Your wishlist is empty</p>
          <Button asChild><Link to="/products">Browse Products</Link></Button>
        </div>
      )}

      {!isLoading && items && items.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          {items.map((item: any) => {
            const product = item.products;
            if (!product) return null;
            const image = getImage(product);
            const price = getPrice(product);
            const variant = getVariant(product);

            return (
              <Card key={item.id} className="group overflow-hidden">
                <Link to={`/products/${product.slug}`}>
                  <div className="aspect-[3/4] overflow-hidden bg-muted relative">
                    <img src={image} alt={product.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => { e.preventDefault(); toggle.mutate(item.product_id); }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </Link>
                <CardContent className="p-3 sm:p-4">
                  <Link to={`/products/${product.slug}`}>
                    <h3 className="font-medium text-sm sm:text-base mb-1 hover:text-primary transition-colors line-clamp-1">{product.name}</h3>
                  </Link>
                  <div className="flex items-center justify-between gap-1 mt-2">
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
