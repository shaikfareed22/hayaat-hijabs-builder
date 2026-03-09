import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useCartContext } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCreateOrder } from '@/hooks/useOrders';
import { Wallet } from 'lucide-react';
import type { ShippingAddress } from '@/services/orderService';

// UPI Configuration
const UPI_ID = 'hayaathijabs@upi'; // Replace with actual UPI ID
const MERCHANT_NAME = 'HayaatHijabs';

export default function Checkout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { cartData, isLoading: cartLoading } = useCartContext();
  const createOrder = useCreateOrder();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderCreated, setOrderCreated] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ShippingAddress>();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user && !cartLoading) {
      navigate('/login', { state: { from: location } });
    }
  }, [user, cartLoading, navigate, location]);

  // Generate UPI payment link
  const generateUPILink = (amount: number, orderId: string) => {
    const params = new URLSearchParams({
      pa: UPI_ID,
      pn: MERCHANT_NAME,
      am: amount.toFixed(2),
      cu: 'INR',
      tn: `Order ${orderId.slice(-8)}`,
      tr: orderId,
    });
    return `upi://pay?${params.toString()}`;
  };

  const onSubmit = async (data: ShippingAddress) => {
    setIsSubmitting(true);
    try {
      // Create order with pending_payment status
      const result = await createOrder.mutateAsync(data);
      const orderId = result.data.id;
      setOrderCreated(orderId);
      
      // Generate UPI link and redirect
      const total = calculateTotal();
      const upiLink = generateUPILink(total, orderId);
      
      // Try to open UPI app
      window.location.href = upiLink;
      
      // Fallback: Navigate to order confirmation after a delay
      // In production, you'd verify payment status via webhook
      setTimeout(() => {
        navigate(`/order-confirmation/${orderId}`);
      }, 3000);
      
    } catch (error) {
      // Error is handled by the mutation
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return null; // Will redirect
  }

  if (cartLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  const isEmpty = !cartData || cartData.items.length === 0;

  if (isEmpty) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-luxury mb-8">Checkout</h1>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <p className="text-muted-foreground">Your cart is empty</p>
              <Button 
                variant="outline" 
                className="mt-4" 
                onClick={() => navigate('/')}
              >
                Continue Shopping
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate totals
  const subtotalNum = parseFloat(cartData?.subtotal || '0');
  const shipping = subtotalNum >= 50 ? 0 : 5.99;
  const tax = subtotalNum * 0.08;
  const calculateTotal = () => subtotalNum + shipping + tax;

  // Get cart items for display
  const getCartItems = () => {
    if (!cartData?.items) return [];
    return cartData.items.map((item: any) => {
      // Handle both guest and auth cart items
      if ('product_variants' in item) {
        const primaryImage = item.product_variants.products.product_images?.find(
          (img: any) => img.is_primary
        ) || item.product_variants.products.product_images?.[0];
        return {
          id: item.id,
          name: item.product_variants.products.name,
          color: item.product_variants.color,
          size: item.product_variants.size,
          price: item.product_variants.price,
          quantity: item.quantity,
          image: primaryImage?.image_url || '/placeholder.svg',
        };
      } else {
        return {
          id: item.id,
          name: item.name,
          color: item.color,
          size: item.size,
          price: item.price,
          quantity: item.quantity,
          image: item.image_url,
        };
      }
    });
  };

  const items = getCartItems();

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <h1 className="text-3xl font-luxury mb-8">Checkout</h1>
      
      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Shipping Information */}
        <Card>
          <CardHeader>
            <CardTitle>Shipping Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                {...register('name', { required: 'Name is required' })}
                placeholder="Enter your full name"
              />
              {errors.name && (
                <p className="text-sm text-destructive mt-1">{errors.name.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="address">Address *</Label>
              <Input
                id="address"
                {...register('address', { required: 'Address is required' })}
                placeholder="Street address"
              />
              {errors.address && (
                <p className="text-sm text-destructive mt-1">{errors.address.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  {...register('city', { required: 'City is required' })}
                  placeholder="City"
                />
                {errors.city && (
                  <p className="text-sm text-destructive mt-1">{errors.city.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="state">State/Province *</Label>
                <Input
                  id="state"
                  {...register('state', { required: 'State is required' })}
                  placeholder="State or Province"
                />
                {errors.state && (
                  <p className="text-sm text-destructive mt-1">{errors.state.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="zip">ZIP/Postal Code *</Label>
                <Input
                  id="zip"
                  {...register('zip', { required: 'ZIP code is required' })}
                  placeholder="ZIP or Postal Code"
                />
                {errors.zip && (
                  <p className="text-sm text-destructive mt-1">{errors.zip.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="country">Country *</Label>
                <Input
                  id="country"
                  {...register('country', { required: 'Country is required' })}
                  placeholder="Country"
                  defaultValue="India"
                />
                {errors.country && (
                  <p className="text-sm text-destructive mt-1">{errors.country.message}</p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                type="tel"
                {...register('phone', { required: 'Phone number is required' })}
                placeholder="+91 98765 43210"
              />
              {errors.phone && (
                <p className="text-sm text-destructive mt-1">{errors.phone.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Order Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {items.map((item: any) => (
                <div key={item.id} className="flex items-center space-x-3 border-b pb-3">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-16 h-16 object-cover rounded-md"
                  />
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{item.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {item.color}
                      </Badge>
                      {item.size && (
                        <Badge variant="outline" className="text-xs">
                          Size {item.size}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Qty: {item.quantity}
                    </p>
                  </div>
                  <p className="font-medium text-sm">
                    ₹{(item.price * item.quantity).toFixed(2)}
                  </p>
                </div>
              ))}

              <Separator />

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>₹{subtotalNum.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shipping</span>
                  <span>{shipping === 0 ? 'Free' : `₹${shipping.toFixed(2)}`}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax (8%)</span>
                  <span>₹{tax.toFixed(2)}</span>
                </div>
              </div>

              <Separator />

              <div className="flex justify-between items-center text-lg font-semibold">
                <span>Total:</span>
                <span>₹{calculateTotal().toFixed(2)}</span>
              </div>

              <Button 
                type="submit" 
                className="w-full h-14 text-lg" 
                size="lg"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <div className="h-5 w-5 mr-2 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Wallet className="h-5 w-5 mr-2" />
                    Pay Now ₹{calculateTotal().toFixed(2)}
                  </>
                )}
              </Button>

              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  Pay securely with UPI
                </p>
                <div className="flex justify-center gap-4 text-xs text-muted-foreground">
                  <span>Google Pay</span>
                  <span>•</span>
                  <span>PhonePe</span>
                  <span>•</span>
                  <span>Paytm</span>
                  <span>•</span>
                  <span>BHIM</span>
                </div>
              </div>

              <p className="text-xs text-muted-foreground text-center mt-4">
                By placing this order, you agree to our terms and conditions.
                Your order will be processed securely.
              </p>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
