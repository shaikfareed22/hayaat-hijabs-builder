import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export function useWishlist() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['wishlist', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wishlists')
        .select(`
          id,
          product_id,
          created_at,
          products (
            id, name, slug, fabric_type, short_description, is_featured,
            product_variants (
              id, color, size, price, stock_quantity,
              product_images ( id, image_url, alt_text, is_primary, display_order )
            )
          )
        `)
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });
}

export function useWishlistIds() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['wishlist-ids', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wishlists')
        .select('product_id')
        .eq('user_id', user!.id);

      if (error) throw error;
      return new Set(data.map((w) => w.product_id));
    },
  });
}

export function useToggleWishlist() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (productId: string) => {
      if (!user) throw new Error('Please sign in to use wishlist');

      // Check if already in wishlist
      const { data: existing } = await supabase
        .from('wishlists')
        .select('id')
        .eq('user_id', user.id)
        .eq('product_id', productId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase.from('wishlists').delete().eq('id', existing.id);
        if (error) throw error;
        return { action: 'removed' as const };
      } else {
        const { error } = await supabase.from('wishlists').insert({ user_id: user.id, product_id: productId });
        if (error) throw error;
        return { action: 'added' as const };
      }
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['wishlist'] });
      qc.invalidateQueries({ queryKey: ['wishlist-ids'] });
      toast({
        title: result.action === 'added' ? 'Added to Wishlist' : 'Removed from Wishlist',
        description: result.action === 'added' ? 'Product saved to your wishlist.' : 'Product removed from your wishlist.',
      });
    },
    onError: (error: Error) => {
      toast({ title: 'Wishlist Error', description: error.message, variant: 'destructive' });
    },
  });
}
