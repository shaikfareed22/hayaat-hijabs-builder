import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Plus, Check } from "lucide-react";
import { useAddToCart } from "@/hooks/useCart";
import { useAuth } from "@/contexts/AuthContext";
import { useCartContext } from "@/contexts/CartContext";

interface AddToCartButtonProps {
  productId: string;
  variantId: string;
  quantity?: number;
  disabled?: boolean;
  children?: React.ReactNode;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  // Product info for guest cart
  productName?: string;
  productPrice?: number;
  productImage?: string;
  productColor?: string;
  productSize?: string | null;
}

export function AddToCartButton({
  productId,
  variantId,
  quantity = 1,
  disabled = false,
  children,
  variant = "default",
  size = "default",
  className,
  productName = '',
  productPrice = 0,
  productImage = '/placeholder.svg',
  productColor = '',
  productSize = null,
}: AddToCartButtonProps) {
  const { user } = useAuth();
  const { addToGuestCart } = useCartContext();
  const [isAdded, setIsAdded] = useState(false);
  const addToCart = useAddToCart();

  const handleAddToCart = async () => {
    try {
      if (user) {
        // Authenticated user - use API
        await addToCart.mutateAsync({
          product_id: productId,
          variant_id: variantId,
          quantity,
        });
      } else {
        // Guest user - use localStorage
        addToGuestCart({
          product_id: productId,
          variant_id: variantId,
          name: productName,
          price: productPrice,
          quantity,
          image_url: productImage,
          color: productColor,
          size: productSize,
        });
      }
      
      // Show success state briefly
      setIsAdded(true);
      setTimeout(() => setIsAdded(false), 2000);
    } catch (error) {
      // Error handling is done in the hook/context
    }
  };

  const isPending = addToCart.isPending;

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleAddToCart}
      disabled={disabled || isPending}
    >
      {children || (
        <>
          {isPending ? (
            <>
              <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              Adding...
            </>
          ) : isAdded ? (
            <>
              <Check className="h-4 w-4 mr-2" />
              Added!
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-2" />
              Add to Cart
            </>
          )}
        </>
      )}
    </Button>
  );
}
