import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingBag, Minus, Plus, Trash2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useUpdateCartItem, useRemoveFromCart } from "@/hooks/useCart";
import { useAuth } from "@/contexts/AuthContext";
import { useCartContext } from "@/contexts/CartContext";
import type { GuestCartItem } from "@/services/guestCartService";
import type { CartItem as AuthCartItem } from "@/services/cartService";

interface CartDrawerProps {
  children: React.ReactNode;
}

export function CartDrawer({ children }: CartDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { cartData, isLoading, isGuest, updateGuestCartItem, removeFromGuestCart } = useCartContext();
  const updateCartItem = useUpdateCartItem();
  const removeFromCart = useRemoveFromCart();

  const items = cartData?.items || [];
  const subtotal = cartData?.subtotal || "0.00";

  // Helper to determine item properties based on guest or auth
  const getItemProps = (item: GuestCartItem | AuthCartItem) => {
    if (isGuest) {
      const guestItem = item as GuestCartItem;
      return {
        id: guestItem.id,
        name: guestItem.name,
        color: guestItem.color,
        size: guestItem.size,
        price: guestItem.price,
        quantity: guestItem.quantity,
        image: guestItem.image_url,
      };
    } else {
      const authItem = item as AuthCartItem;
      const primaryImage = authItem.product_variants.products.product_images.find(
        img => img.is_primary
      ) || authItem.product_variants.products.product_images[0];
      
      return {
        id: authItem.id,
        name: authItem.product_variants.products.name,
        color: authItem.product_variants.color,
        size: authItem.product_variants.size,
        price: authItem.product_variants.price,
        quantity: authItem.quantity,
        image: primaryImage?.image_url || '/placeholder.svg',
      };
    }
  };

  const handleUpdateQuantity = (id: string, quantity: number) => {
    if (isGuest) {
      updateGuestCartItem(id, quantity);
    } else {
      updateCartItem.mutate({ cart_item_id: id, quantity });
    }
  };

  const handleRemove = (id: string) => {
    if (isGuest) {
      removeFromGuestCart(id);
    } else {
      removeFromCart.mutate({ cart_item_id: id });
    }
  };

  const handleCheckout = () => {
    setIsOpen(false);
    if (!user) {
      navigate('/login', { state: { from: { pathname: '/checkout' } } });
    } else {
      navigate('/checkout');
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <button className="relative p-2 hover:text-foreground text-muted-foreground transition-colors">
          {children}
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            Shopping Cart
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="flex gap-4">
                    <div className="h-16 w-16 bg-muted rounded-md" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded" />
                      <div className="h-3 bg-muted rounded w-3/4" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingBag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Your cart is empty</h3>
              <p className="text-muted-foreground text-sm mb-6">
                Add some beautiful hijabs to get started
              </p>
              <Button 
                onClick={() => setIsOpen(false)} 
                className="w-full"
                asChild
              >
                <Link to="/">Continue Shopping</Link>
              </Button>
            </div>
          ) : (
            <>
              {/* Cart Items */}
              <div className="flex-1 space-y-4 max-h-96 overflow-y-auto">
                {items.map((item) => {
                  const props = getItemProps(item);
                  return (
                    <div key={props.id} className="flex gap-3 border-b pb-4">
                      <img
                        src={props.image}
                        alt={props.name}
                        className="w-16 h-16 object-cover rounded-md"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate">{props.name}</h4>
                        <div className="flex items-center gap-1 mt-1">
                          <Badge variant="outline" className="text-xs">{props.color}</Badge>
                          {props.size && (
                            <Badge variant="outline" className="text-xs">{props.size}</Badge>
                          )}
                        </div>
                        <p className="font-semibold text-sm mt-1">₹{props.price.toFixed(2)}</p>
                        
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-1 border rounded">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleUpdateQuantity(props.id, props.quantity - 1)}
                              disabled={props.quantity <= 1}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-6 text-center text-sm">{props.quantity}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleUpdateQuantity(props.id, props.quantity + 1)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive"
                            onClick={() => handleRemove(props.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Cart Summary */}
              <div className="space-y-4 pt-4 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-base font-medium">Subtotal</span>
                  <span className="text-lg font-semibold">₹{subtotal}</span>
                </div>
                
                <p className="text-sm text-muted-foreground">
                  Shipping and taxes calculated at checkout
                </p>

                <div className="space-y-3">
                  <Button 
                    className="w-full h-12" 
                    size="lg"
                    onClick={handleCheckout}
                  >
                    {user ? 'Checkout' : 'Login to Checkout'}
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    onClick={() => setIsOpen(false)}
                    asChild
                  >
                    <Link to="/cart">View Cart</Link>
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
