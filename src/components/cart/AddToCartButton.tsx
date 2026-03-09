import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Plus, Check } from "lucide-react";
import { useAddToCart } from "@/hooks/useCart";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";

interface AddToCartButtonProps {
  productId: string;
  variantId: string;
  quantity?: number;
  disabled?: boolean;
  children?: React.ReactNode;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
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
}: AddToCartButtonProps) {
  const { user } = useAuth();
  const [isAdded, setIsAdded] = useState(false);
  const addToCart = useAddToCart();

  const handleAddToCart = async () => {
    if (!user) return;

    try {
      await addToCart.mutateAsync({
        product_id: productId,
        variant_id: variantId,
        quantity,
      });
      
      // Show success state briefly
      setIsAdded(true);
      setTimeout(() => setIsAdded(false), 2000);
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  if (!user) {
    return (
      <Button 
        variant={variant} 
        size={size} 
        className={className}
        asChild
      >
        <Link to="/login">
          {children || (
            <>
              <ShoppingCart className="h-4 w-4 mr-2" />
              Sign in to Add to Cart
            </>
          )}
        </Link>
      </Button>
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleAddToCart}
      disabled={disabled || addToCart.isPending}
    >
      {children || (
        <>
          {addToCart.isPending ? (
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