import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cartService, type CartResponse, type AddToCartRequest, type UpdateCartItemRequest, type RemoveFromCartRequest } from '@/services/cartService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

const CART_QUERY_KEY = ['cart'] as const;

export function useCart() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: CART_QUERY_KEY,
    queryFn: () => cartService.getCart(),
    enabled: !!user,
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useAddToCart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: AddToCartRequest) => cartService.addToCart(request),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
      toast({
        title: 'Added to cart',
        description: data.message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to add to cart',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateCartItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: UpdateCartItemRequest) => cartService.updateCartItem(request),
    onMutate: async (request) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: CART_QUERY_KEY });

      // Snapshot previous value
      const previousCart = queryClient.getQueryData<CartResponse>(CART_QUERY_KEY);

      // Optimistically update cart
      if (previousCart) {
        queryClient.setQueryData<CartResponse>(CART_QUERY_KEY, {
          ...previousCart,
          items: previousCart.items.map(item =>
            item.id === request.cart_item_id
              ? { ...item, quantity: request.quantity }
              : item
          ),
        });
      }

      return { previousCart };
    },
    onError: (error: Error, _, context) => {
      // Rollback optimistic update on error
      if (context?.previousCart) {
        queryClient.setQueryData(CART_QUERY_KEY, context.previousCart);
      }
      toast({
        title: 'Failed to update cart',
        description: error.message,
        variant: 'destructive',
      });
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
    },
  });
}

export function useRemoveFromCart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: RemoveFromCartRequest) => cartService.removeFromCart(request),
    onMutate: async (request) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: CART_QUERY_KEY });

      // Snapshot previous value
      const previousCart = queryClient.getQueryData<CartResponse>(CART_QUERY_KEY);

      // Optimistically remove item from cart
      if (previousCart) {
        queryClient.setQueryData<CartResponse>(CART_QUERY_KEY, {
          ...previousCart,
          items: previousCart.items.filter(item => item.id !== request.cart_item_id),
        });
      }

      return { previousCart };
    },
    onSuccess: (data) => {
      toast({
        title: 'Removed from cart',
        description: data.message,
      });
    },
    onError: (error: Error, _, context) => {
      // Rollback optimistic update on error
      if (context?.previousCart) {
        queryClient.setQueryData(CART_QUERY_KEY, context.previousCart);
      }
      toast({
        title: 'Failed to remove from cart',
        description: error.message,
        variant: 'destructive',
      });
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
    },
  });
}