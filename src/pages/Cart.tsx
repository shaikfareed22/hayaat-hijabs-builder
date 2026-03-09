import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ShoppingBag, Minus, Plus, Trash2, ArrowRight } from 'lucide-react';
import { useCartContext } from '@/contexts/CartContext';
import { useUpdateCartItem, useRemoveFromCart } from '@/hooks/useCart';
import { useAuth } from '@/contexts/AuthContext';
import type { GuestCartItem } from '@/services/guestCartService';
import type { CartItem as AuthCartItem } from '@/services/cartService';

export default function Cart() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { cartData, isLoading, isGuest, updateGuestCartItem, removeFromGuestCart } = useCartContext();
  const updateCartItem = useUpdateCartItem();
  const removeFromCart = useRemoveFromCart();

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center py-12">Loading cart...</div>
      </div>
    );
  }

  const items = cartData?.items || [];
  const subtotal = cartData?.subtotal || '0.00';
  const isEmpty = items.length === 0;

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
      const primaryImage = authItem.product_variants.product_images?.find(
        img => img.is_primary
      ) || authItem.product_variants.product_images?.[0];
      
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
    if (!user) {
      // Redirect to login with return path
      navigate('/login', { state: { from: { pathname: '/checkout' } } });
    } else {
      navigate('/checkout');
    }
  };

  if (isEmpty) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-luxury mb-8">Shopping Cart</h1>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <ShoppingBag className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-medium mb-2">Your cart is empty</h3>
              <p className="text-muted-foreground mb-6">
                Discover our beautiful collection of premium hijabs
              </p>
              <Button asChild>
                <Link to="/">
                  Continue Shopping
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate additional costs
  const subtotalNum = parseFloat(subtotal);
  const shipping = subtotalNum >= 50 ? 0 : 5.99;
  const tax = subtotalNum * 0.08; // 8% tax
  const total = subtotalNum + shipping + tax;

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <h1 className="text-3xl font-luxury mb-8">Shopping Cart</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => {
            const props = getItemProps(item);
            return (
              <Card key={props.id}>
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    <img
                      src={props.image}
                      alt={props.name}
                      className="w-24 h-24 object-cover rounded-md"
                    />
                    <div className="flex-1">
                      <h3 className="font-medium text-lg">{props.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline">{props.color}</Badge>
                        {props.size && (
                          <Badge variant="outline">Size {props.size}</Badge>
                        )}
                      </div>
                      <p className="text-lg font-semibold mt-2">
                        ₹{props.price.toFixed(2)}
                      </p>
                    </div>
                    
                    <div className="flex flex-col items-end justify-between">
                      {/* Quantity Controls */}
                      <div className="flex items-center gap-2 border rounded-md">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleUpdateQuantity(props.id, props.quantity - 1)}
                          disabled={props.quantity <= 1}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-8 text-center">{props.quantity}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleUpdateQuantity(props.id, props.quantity + 1)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      {/* Remove Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleRemove(props.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Remove
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>₹{subtotal}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span>{shipping === 0 ? 'Free' : `₹${shipping.toFixed(2)}`}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax (8%)</span>
                <span>₹{tax.toFixed(2)}</span>
              </div>
              
              <Separator />
              
              <div className="flex justify-between text-lg font-semibold">
                <span>Total</span>
                <span>₹{total.toFixed(2)}</span>
              </div>

              {shipping > 0 && (
                <p className="text-sm text-muted-foreground">
                  Add ₹{(50 - subtotalNum).toFixed(2)} more for free shipping
                </p>
              )}

              <Button 
                className="w-full h-12" 
                size="lg"
                onClick={handleCheckout}
              >
                {user ? 'Proceed to Checkout' : 'Login to Checkout'}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>

              {!user && (
                <p className="text-sm text-muted-foreground text-center">
                  You'll need to sign in to complete your purchase
                </p>
              )}

              <Button variant="outline" className="w-full" asChild>
                <Link to="/">Continue Shopping</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
