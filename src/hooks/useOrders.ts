import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { orderService, type ShippingAddress, type Order } from '@/services/orderService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

const ORDERS_QUERY_KEY = ['orders'] as const;

export function useOrders() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ORDERS_QUERY_KEY,
    queryFn: () => orderService.getOrders(),
    enabled: !!user,
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useOrder(orderId: string | undefined) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['order', orderId],
    queryFn: () => orderService.getOrder(orderId!),
    enabled: !!user && !!orderId,
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (shippingAddress: ShippingAddress) => 
      orderService.createOrder(shippingAddress),
    onSuccess: (data) => {
      // Invalidate both orders and cart queries
      queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      
      toast({
        title: 'Order placed successfully!',
        description: `Order #${data.data.id.slice(-8)} has been created.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to place order',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}