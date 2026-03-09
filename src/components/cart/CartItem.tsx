import { Button } from "@/components/ui/button";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useUpdateCartItem, useRemoveFromCart } from "@/hooks/useCart";
import type { CartItem as CartItemType } from "@/services/cartService";
import { useState } from "react";

interface CartItemProps {
  item: CartItemType;
}

export function CartItem({ item }: CartItemProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const updateCartItem = useUpdateCartItem();
  const removeFromCart = useRemoveFromCart();

  const { product_variants: variant } = item;
  const product = variant.products;
  const primaryImage = variant.product_images?.find(img => img.is_primary) || variant.product_images?.[0];

  const handleQuantityChange = async (newQuantity: number) => {
    if (newQuantity < 1) return;
    
    setIsUpdating(true);
    try {
      await updateCartItem.mutateAsync({
        cart_item_id: item.id,
        quantity: newQuantity,
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRemove = async () => {
    await removeFromCart.mutateAsync({
      cart_item_id: item.id,
    });
  };

  const itemTotal = (parseFloat(variant.price.toString()) * item.quantity).toFixed(2);

  return (
    <div className="flex gap-4 py-4">
      {/* Product Image */}
      <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-md border">
        <img
          src={primaryImage?.image_url || "/placeholder.svg"}
          alt={primaryImage?.alt_text || product.name}
          className="h-full w-full object-cover object-center"
        />
      </div>

      {/* Product Details */}
      <div className="flex-1 flex flex-col justify-between">
        <div>
          <h3 className="text-sm font-medium text-foreground line-clamp-1">
            {product.name}
          </h3>
          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <span>{variant.color}</span>
            {variant.size && (
              <>
                <span>•</span>
                <span>{variant.size}</span>
              </>
            )}
          </div>
        </div>

        {/* Quantity and Price */}
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => handleQuantityChange(item.quantity - 1)}
              disabled={item.quantity <= 1 || isUpdating}
            >
              <Minus className="h-3 w-3" />
            </Button>
            
            <span className="text-sm font-medium min-w-[2ch] text-center">
              {item.quantity}
            </span>
            
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => handleQuantityChange(item.quantity + 1)}
              disabled={isUpdating}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>

          <div className="text-right">
            <p className="text-sm font-medium">${itemTotal}</p>
            <p className="text-xs text-muted-foreground">${variant.price} each</p>
          </div>
        </div>
      </div>

      {/* Remove Button */}
      <div className="flex flex-col justify-start">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={handleRemove}
          disabled={removeFromCart.isPending}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}