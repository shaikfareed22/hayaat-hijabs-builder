import { createContext, useContext, ReactNode } from 'react';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/contexts/AuthContext';

interface CartContextType {
  cartData: ReturnType<typeof useCart>['data'];
  cartItemCount: number;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { data: cartData, isLoading, error, refetch } = useCart();

  const cartItemCount = cartData?.itemCount || 0;

  return (
    <CartContext.Provider value={{
      cartData,
      cartItemCount,
      isLoading: isLoading && !!user,
      error,
      refetch,
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