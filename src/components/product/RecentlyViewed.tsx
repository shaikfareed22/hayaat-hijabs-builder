import { Link } from 'react-router-dom';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import { Card, CardContent } from '@/components/ui/card';

interface RecentlyViewedProps {
  excludeId?: string;
}

export function RecentlyViewed({ excludeId }: RecentlyViewedProps) {
  const products = useRecentlyViewed(excludeId);

  if (products.length === 0) return null;

  return (
    <section className="mt-12 sm:mt-16">
      <h2 className="text-xl sm:text-2xl font-luxury font-semibold mb-6">Recently Viewed</h2>
      <div className="flex gap-4 overflow-x-auto pb-2 -mx-3 px-3 scrollbar-hide">
        {products.map((product) => {
          const variant = product.product_variants[0];
          if (!variant) return null;
          const image = variant.product_images?.find(i => i.is_primary) || variant.product_images?.[0];

          return (
            <Link key={product.id} to={`/products/${product.slug}`} className="flex-shrink-0 w-36 sm:w-44">
              <Card className="overflow-hidden border-border group">
                <div className="aspect-[3/4] overflow-hidden">
                  <img
                    src={image?.image_url || '/placeholder.svg'}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                </div>
                <CardContent className="p-2">
                  <h3 className="text-xs font-medium truncate">{product.name}</h3>
                  <p className="text-xs font-semibold mt-0.5">₹{Number(variant.price).toFixed(2)}</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
