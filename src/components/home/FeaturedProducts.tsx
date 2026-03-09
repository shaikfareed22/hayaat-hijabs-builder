import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ShoppingCart, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { WishlistButton } from "@/components/product/WishlistButton";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const FeaturedProducts = () => {
  const { data: products, isLoading } = useQuery({
    queryKey: ['featured-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select(`
          id, name, slug, fabric_type, is_featured,
          product_variants (
            id, color, size, price, stock_quantity,
            product_images ( id, image_url, alt_text, is_primary, display_order )
          )
        `)
        .eq('is_active', true)
        .eq('is_featured', true)
        .limit(4);
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

  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <p className="text-sm tracking-[0.3em] uppercase text-muted-foreground mb-2">Curated Selection</p>
          <h2 className="font-luxury text-4xl md:text-5xl">Featured Hijabs</h2>
        </motion.div>

        {isLoading && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
            {[...Array(4)].map((_, i) => (
              <div key={i}>
                <Skeleton className="aspect-[3/4] rounded-xl mb-4" />
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        )}

        {!isLoading && products && products.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
            {products.map((product: any, index: number) => {
              const image = getImage(product);
              const price = getPrice(product);
              const variant = product.product_variants?.[0];

              return (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="group"
                >
                  <div className="relative overflow-hidden rounded-xl bg-muted aspect-[3/4] mb-4">
                    <Link to={`/products/${product.slug}`}>
                      <img
                        src={image}
                        alt={product.name}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        loading="lazy"
                      />
                    </Link>
                    <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/10 transition-colors duration-300 pointer-events-none" />
                    <div className="absolute bottom-3 left-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex gap-2">
                      {variant && (
                        <AddToCartButton
                          productId={product.id}
                          variantId={variant.id}
                          productName={product.name}
                          productPrice={Number(price)}
                          productImage={image}
                          productColor={variant.color}
                          productSize={variant.size}
                          size="sm"
                          className="flex-1 rounded-full text-xs tracking-wider"
                        >
                          <ShoppingCart className="h-3 w-3 mr-1" /> Add to Cart
                        </AddToCartButton>
                      )}
                      <WishlistButton productId={product.id} className="h-8 w-8" />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground tracking-wider uppercase mb-1">{product.fabric_type}</p>
                    <Link to={`/products/${product.slug}`} className="font-medium text-foreground hover:text-muted-foreground transition-colors">
                      {product.name}
                    </Link>
                    <div className="flex items-center justify-between mt-2">
                      <span className="font-medium">₹{Number(price).toLocaleString()}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {!isLoading && (!products || products.length === 0) && (
          <div className="text-center py-8 text-muted-foreground">
            <p>No featured products yet. Check back soon!</p>
          </div>
        )}

        <div className="text-center mt-12">
          <Button asChild variant="outline" size="lg" className="tracking-wider uppercase text-xs px-8 rounded-full">
            <Link to="/products">View All Products</Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default FeaturedProducts;
