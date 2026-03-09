import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ShoppingBag, Minus, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { useCart, useUpdateCartItem, useRemoveFromCart } from "@/hooks/useCart";
import { useAuth } from "@/contexts/AuthContext";
import { CartItem } from "./CartItem";

interface CartDrawerProps {
  children: React.ReactNode;
}

export function CartDrawer({ children }: CartDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();
  const { data: cartData, isLoading } = useCart();

  if (!user) {
    return (
      <Link to="/login" className="relative p-2 hover:text-foreground text-muted-foreground transition-colors">
        {children}
      </Link>
    );
  }

  const items = cartData?.items || [];
  const subtotal = cartData?.subtotal || "0.00";

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
                {items.map((item) => (
                  <CartItem key={item.id} item={item} />
                ))}
              </div>

              {/* Cart Summary */}
              <div className="space-y-4 pt-4 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-base font-medium">Subtotal</span>
                  <span className="text-lg font-semibold">${subtotal}</span>
                </div>
                
                <p className="text-sm text-muted-foreground">
                  Shipping and taxes calculated at checkout
                </p>

                <div className="space-y-3">
                  <Button 
                    className="w-full h-12" 
                    size="lg"
                    onClick={() => setIsOpen(false)}
                    asChild
                  >
                    <Link to="/checkout">
                      Checkout
                    </Link>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    onClick={() => setIsOpen(false)}
                    asChild
                  >
                    <Link to="/">
                      Continue Shopping
                    </Link>
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