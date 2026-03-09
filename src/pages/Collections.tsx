import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Collections() {
  const { data: collections, isLoading } = useQuery({
    queryKey: ['collections'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('collections')
        .select('*')
        .eq('is_active', true)
        .order('display_order');
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="font-luxury text-3xl sm:text-4xl md:text-5xl mb-2">Collections</h1>
        <p className="text-muted-foreground text-sm sm:text-base">Browse our curated hijab collections.</p>
      </div>

      {isLoading && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="aspect-[3/4] rounded-2xl" />)}
        </div>
      )}

      {!isLoading && (!collections || collections.length === 0) && (
        <div className="text-center py-16">
          <p className="text-muted-foreground">No collections available yet.</p>
        </div>
      )}

      {!isLoading && collections && collections.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {collections.map((collection, index) => (
            <motion.div
              key={collection.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Link to={`/collections/${collection.slug}`}>
                <Card className="group relative overflow-hidden rounded-2xl aspect-[3/4]">
                  <img
                    src={collection.image_url || '/placeholder.svg'}
                    alt={collection.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 via-foreground/10 to-transparent" />
                  <div className="absolute bottom-6 left-6 right-6 text-background">
                    <p className="text-xs tracking-wider uppercase opacity-80 mb-1">{collection.description}</p>
                    <div className="flex items-center justify-between">
                      <h3 className="font-luxury text-2xl">{collection.name}</h3>
                      <ArrowRight className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
