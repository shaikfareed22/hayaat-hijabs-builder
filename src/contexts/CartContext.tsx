import { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react';
import { useCart, useAddToCart } from '@/hooks/useCart';
import { useAuth } from '@/contexts/AuthContext';
import { guestCartService, GuestCartItem, GuestCart } from '@/services/guestCartService';
import { cartService } from '@/services/cartService';
import { toast } from '@/hooks/use-toast';

interface CartContextType {
  cartData: ReturnType<typeof useCart>['data'] | GuestCart | null;
  cartItemCount: number;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  // Guest cart methods
  addToGuestCart: (item: Omit<GuestCartItem, 'id'>) => void;
  updateGuestCartItem: (id: string, quantity: number) => void;
  removeFromGuestCart: (id: string) => void;
  isGuest: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { data: authCartData, isLoading: authLoading, error, refetch } = useCart();
  const addToCartMutation = useAddToCart();
  
  const [guestCart, setGuestCart] = useState<GuestCart>(() => guestCartService.getGuestCart());
  const [isMerging, setIsMerging] = useState(false);

  // Merge guest cart when user logs in
  useEffect(() => {
    const mergeGuestCart = async () => {
      if (user && guestCartService.hasItems() && !isMerging) {
        setIsMerging(true);
        const guestItems = guestCartService.getGuestCart().items;
        
        try {
          // Add each guest cart item to the authenticated cart
          for (const item of guestItems) {
            await cartService.addToCart({
              product_id: item.product_id,
              variant_id: item.variant_id,
              quantity: item.quantity,
            });
          }
          
          // Clear guest cart after successful merge
          guestCartService.clearCart();
          setGuestCart({ items: [], itemCount: 0, subtotal: '0.00' });
          
          // Refetch authenticated cart
          refetch();
          
          toast({
            title: 'Cart synced',
            description: 'Your shopping cart has been updated.',
          });
        } catch (error) {
          console.error('Failed to merge guest cart:', error);
        } finally {
          setIsMerging(false);
        }
      }
    };

    mergeGuestCart();
  }, [user, refetch, isMerging]);

  // Guest cart methods
  const addToGuestCart = useCallback((item: Omit<GuestCartItem, 'id'>) => {
    const updatedCart = guestCartService.addToCart(item);
    setGuestCart(updatedCart);
    toast({
      title: 'Added to cart',
      description: `${item.name} has been added to your cart.`,
    });
  }, []);

  const updateGuestCartItem = useCallback((id: string, quantity: number) => {
    const updatedCart = guestCartService.updateQuantity(id, quantity);
    setGuestCart(updatedCart);
  }, []);

  const removeFromGuestCart = useCallback((id: string) => {
    const updatedCart = guestCartService.removeFromCart(id);
    setGuestCart(updatedCart);
    toast({
      title: 'Removed from cart',
      description: 'Item has been removed from your cart.',
    });
  }, []);

  // Determine which cart to use
  const isGuest = !user;
  const cartData = isGuest ? guestCart : authCartData;
  const cartItemCount = cartData?.itemCount || 0;
  const isLoading = isGuest ? false : (authLoading || isMerging);

  return (
    <CartContext.Provider value={{
      cartData,
      cartItemCount,
      isLoading,
      error,
      refetch,
      addToGuestCart,
      updateGuestCartItem,
      removeFromGuestCart,
      isGuest,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCartContext() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCartContext must be used within a CartProvider');
  }
  return context;
}
