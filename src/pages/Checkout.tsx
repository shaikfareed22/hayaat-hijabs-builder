import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { calculateShipping, getFreeShippingThreshold } from '@/lib/shipping';
import { couponService, type CouponValidation } from '@/services/couponService';
import { Wallet, ChevronDown, ChevronUp, Tag, X, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const shippingSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name too long'),
  address: z.string().trim().min(5, 'Address must be at least 5 characters').max(300, 'Address too long'),
  city: z.string().trim().min(2, 'City is required').max(100, 'City name too long'),
  state: z.string().trim().min(2, 'State is required').max(100, 'State name too long'),
  zip: z.string().trim().min(4, 'PIN code must be at least 4 digits').max(10, 'Invalid PIN code').regex(/^\d{4,10}$/, 'PIN code must be numeric'),
  country: z.string().trim().min(2, 'Country is required').max(100, 'Country name too long'),
  phone: z.string().trim().min(7, 'Phone must be at least 7 digits').max(15, 'Phone too long').regex(/^\+?\d[\d\s\-()]{6,}$/, 'Invalid phone number format'),
});

type ShippingAddress = z.infer<typeof shippingSchema>;

const UPI_ID = 'hayaathijabs@upi';
const MERCHANT_NAME = 'HayaatHijabs';

export default function Checkout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { cartData, isLoading: cartLoading } = useCartContext();
  const createOrder = useCreateOrder();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<CouponValidation | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ShippingAddress>({
    resolver: zodResolver(shippingSchema),
  });

  useEffect(() => {
    if (!user && !cartLoading) {
      navigate('/login', { state: { from: location } });
    }
  }, [user, cartLoading, navigate, location]);

  const subtotalNum = parseFloat(cartData?.subtotal || '0');
  const shipping = calculateShipping(subtotalNum);
  const discountAmount = appliedCoupon?.discount_amount || 0;
  const total = Math.max(0, subtotalNum + shipping - discountAmount);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    try {
      const result = await couponService.validateCoupon(couponCode.trim(), subtotalNum);
      setAppliedCoupon(result);
      toast({ title: 'Coupon applied!', description: `You save ₹${result.discount_amount.toFixed(2)}` });
    } catch (err: any) {
      toast({ title: 'Invalid coupon', description: err.message, variant: 'destructive' });
    } finally {
      setCouponLoading(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
  };

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
      const result = await createOrder.mutateAsync({
        ...data,
        coupon_code: appliedCoupon?.code || undefined,
      } as any);
      const orderId = result.data.id;
      const upiLink = generateUPILink(total, orderId);

      const isAndroid = /android/i.test(navigator.userAgent);
      const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

      if (isAndroid || isIOS) {
        window.location.href = upiLink;
      } else {
        window.location.href = upiLink;
      }

      setTimeout(() => {
        navigate(`/order-confirmation/${orderId}`);
      }, 3000);
    } catch (error) {
      setIsSubmitting(false);
    }
  };

  if (!user) return null;

  if (cartLoading) {
    return (
      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-4xl">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  const isEmpty = !cartData || cartData.items.length === 0;

  if (isEmpty) {
    return (
      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-4xl">
        <h1 className="text-2xl sm:text-3xl font-luxury mb-6 sm:mb-8">Checkout</h1>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <p className="text-muted-foreground">Your cart is empty</p>
              <Button variant="outline" className="mt-4 h-11" onClick={() => navigate('/')}>
                Continue Shopping
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getCartItems = () => {
    if (!cartData?.items) return [];
    return cartData.items.map((item: any) => {
      if ('product_variants' in item) {
        const primaryImage = item.product_variants.product_images?.find(
          (img: any) => img.is_primary
        ) || item.product_variants.product_images?.[0];
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
  const freeShippingThreshold = getFreeShippingThreshold();
  const amountToFreeShipping = Math.max(0, freeShippingThreshold - subtotalNum);

  return (
    <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-6xl">
      <h1 className="text-2xl sm:text-3xl font-luxury mb-6 sm:mb-8">Checkout</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        {/* Shipping Information */}
        <Card>
          <CardHeader className="px-4 sm:px-6">
            <CardTitle className="text-lg sm:text-xl">Shipping Information</CardTitle>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 space-y-4">
            <div>
              <Label htmlFor="name">Full Name *</Label>
              <Input id="name" {...register('name')} placeholder="Enter your full name" className="h-11 mt-1" />
              {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <Label htmlFor="address">Address *</Label>
              <Input id="address" {...register('address')} placeholder="Street address" className="h-11 mt-1" />
              {errors.address && <p className="text-sm text-destructive mt-1">{errors.address.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div>
                <Label htmlFor="city">City *</Label>
                <Input id="city" {...register('city')} placeholder="City" className="h-11 mt-1" />
                {errors.city && <p className="text-sm text-destructive mt-1">{errors.city.message}</p>}
              </div>
              <div>
                <Label htmlFor="state">State *</Label>
                <Input id="state" {...register('state')} placeholder="State" className="h-11 mt-1" />
                {errors.state && <p className="text-sm text-destructive mt-1">{errors.state.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div>
                <Label htmlFor="zip">PIN Code *</Label>
                <Input id="zip" {...register('zip')} placeholder="PIN Code" className="h-11 mt-1" inputMode="numeric" />
                {errors.zip && <p className="text-sm text-destructive mt-1">{errors.zip.message}</p>}
              </div>
              <div>
                <Label htmlFor="country">Country *</Label>
                <Input id="country" {...register('country')} placeholder="Country" defaultValue="India" className="h-11 mt-1" />
                {errors.country && <p className="text-sm text-destructive mt-1">{errors.country.message}</p>}
              </div>
            </div>
            <div>
              <Label htmlFor="phone">Phone Number *</Label>
              <Input id="phone" type="tel" {...register('phone')} placeholder="+91 98765 43210" className="h-11 mt-1" inputMode="tel" />
              {errors.phone && <p className="text-sm text-destructive mt-1">{errors.phone.message}</p>}
            </div>
          </CardContent>
        </Card>

        {/* Order Summary */}
        <Card>
          <CardHeader className="px-4 sm:px-6">
            <button type="button" className="flex items-center justify-between w-full lg:cursor-default" onClick={() => setShowSummary(!showSummary)}>
              <CardTitle className="text-lg sm:text-xl">Order Summary ({items.length} items)</CardTitle>
              <span className="lg:hidden">
                {showSummary ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
              </span>
            </button>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <div className="space-y-4">
              {/* Items */}
              <div className={`space-y-3 ${showSummary ? 'block' : 'hidden lg:block'}`}>
                {items.map((item: any) => (
                  <div key={item.id} className="flex items-center gap-3 border-b pb-3">
                    <img src={item.image} alt={item.name} className="w-14 h-14 sm:w-16 sm:h-16 object-cover rounded-md shrink-0" loading="lazy" />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate">{item.name}</h4>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <Badge variant="outline" className="text-xs">{item.color}</Badge>
                        {item.size && <Badge variant="outline" className="text-xs">Size {item.size}</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                    </div>
                    <p className="font-medium text-sm shrink-0">₹{(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                ))}
              </div>

              <Separator />

              {/* Coupon Code */}
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5" /> Coupon Code
                </Label>
                {appliedCoupon ? (
                  <div className="flex items-center justify-between p-2.5 bg-primary/10 rounded-lg border border-primary/20">
                    <div>
                      <span className="font-mono text-sm font-semibold">{appliedCoupon.code}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        −₹{appliedCoupon.discount_amount.toFixed(2)}
                      </span>
                    </div>
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={removeCoupon}>
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      placeholder="Enter code"
                      className="h-9 font-mono text-sm"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="h-9 px-4 shrink-0"
                      onClick={handleApplyCoupon}
                      disabled={couponLoading || !couponCode.trim()}
                    >
                      {couponLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply'}
                    </Button>
                  </div>
                )}
              </div>

              <Separator />

              {/* Price breakdown */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>₹{subtotalNum.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shipping</span>
                  <span>{shipping === 0 ? <span className="text-primary font-medium">FREE</span> : `₹${shipping.toFixed(2)}`}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-sm text-primary">
                    <span>Discount</span>
                    <span>−₹{discountAmount.toFixed(2)}</span>
                  </div>
                )}
                {amountToFreeShipping > 0 && shipping > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Add ₹{amountToFreeShipping.toFixed(0)} more for free shipping
                  </p>
                )}
              </div>

              <Separator />

              <div className="flex justify-between items-center text-lg font-semibold">
                <span>Total:</span>
                <span>₹{total.toFixed(2)}</span>
              </div>

              <Button
                type="submit"
                className="w-full h-14 text-base sm:text-lg active:scale-[0.98] transition-transform"
                size="lg"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Wallet className="h-5 w-5 mr-2" />
                    Pay Now ₹{total.toFixed(2)}
                  </>
                )}
              </Button>

              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">Pay securely with UPI</p>
                <div className="flex justify-center gap-3 sm:gap-4 text-xs text-muted-foreground flex-wrap">
                  <span>Google Pay</span><span>•</span><span>PhonePe</span><span>•</span><span>Paytm</span><span>•</span><span>BHIM</span>
                </div>
              </div>

              <p className="text-xs text-muted-foreground text-center mt-4">
                By placing this order, you agree to our terms and conditions.
              </p>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
