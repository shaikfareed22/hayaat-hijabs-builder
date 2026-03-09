import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Package, Truck, Wallet } from 'lucide-react';
import { useOrder } from '@/hooks/useOrders';
import { OrderTimeline } from '@/components/order/OrderTimeline';

export default function OrderConfirmation() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { data: orderData, isLoading, error } = useOrder(orderId);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (error || !orderData) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <p className="text-destructive">Order not found or failed to load.</p>
              <Button variant="outline" className="mt-4" onClick={() => navigate('/')}>Return Home</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const order = orderData.data;
  const shippingAddress = order.shipping_address as any;

  const getStatusColor = (status: string | null) => {
    switch (status?.toLowerCase()) {
      case 'paid': case 'completed': return 'default';
      case 'processing': case 'shipped': return 'secondary';
      default: return 'outline';
    }
  };

  const getPaymentStatusText = (status: string | null) => {
    switch (status?.toLowerCase()) {
      case 'paid': return 'Paid';
      case 'pending': case 'pending_payment': return 'Awaiting Payment';
      default: return status || 'Pending';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Success Header */}
      <div className="text-center mb-8">
        <CheckCircle className="w-16 h-16 text-primary mx-auto mb-4" />
        <h1 className="text-3xl font-luxury mb-2">Your order has been placed successfully!</h1>
        <p className="text-muted-foreground">Thank you for shopping with Hayaat Hijabs. We'll notify you when your order ships.</p>
      </div>

      {/* Order Timeline */}
      <Card className="mb-8">
        <CardContent className="pt-6">
          <OrderTimeline
            status={order.order_status}
            trackingNumber={(order as any).tracking_number}
            shippedDate={(order as any).shipped_date}
            deliveredDate={(order as any).delivered_date}
            createdAt={order.created_at}
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Package className="w-5 h-5" /> Order Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium">Order ID</p>
              <p className="text-muted-foreground font-mono text-lg">#{order.id.slice(-8).toUpperCase()}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Order Date</p>
              <p className="text-muted-foreground">
                {order.created_at ? new Date(order.created_at).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Order Status:</span>
              <Badge variant={getStatusColor(order.order_status)}>{order.order_status || 'Pending'}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4" />
              <span className="text-sm font-medium">Payment:</span>
              <Badge variant={getStatusColor(order.payment_status)}>{getPaymentStatusText(order.payment_status)}</Badge>
            </div>
            <div className="pt-4 border-t space-y-1">
              {(order as any).discount_amount > 0 && (
                <div className="flex justify-between text-sm text-primary">
                  <span>Discount</span>
                  <span>−₹{Number((order as any).discount_amount).toFixed(2)}</span>
                </div>
              )}
              {(order as any).shipping_amount > 0 && (
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Shipping</span>
                  <span>₹{Number((order as any).shipping_amount).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-xl font-semibold">
                <span>Total Amount:</span>
                <span>₹{Number(order.total_price).toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Truck className="w-5 h-5" /> Shipping Address</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <p className="font-medium text-lg">{shippingAddress?.name}</p>
              <p className="text-muted-foreground">{shippingAddress?.address}</p>
              <p className="text-muted-foreground">{shippingAddress?.city}, {shippingAddress?.state} {shippingAddress?.zip}</p>
              <p className="text-muted-foreground">{shippingAddress?.country}</p>
              <p className="text-muted-foreground mt-2">📞 {shippingAddress?.phone}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Order Items */}
      <Card className="mb-8">
        <CardHeader><CardTitle>Products Purchased</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-4">
            {order.order_items?.map((item: any) => {
              const images = item.product_variants?.product_images || item.product_variants?.products?.product_images || [];
              const primaryImage = images.find((img: any) => img.is_primary) || images[0];

              return (
                <div key={item.id} className="flex items-center space-x-4 border-b pb-4 last:border-b-0">
                  {primaryImage && (
                    <img src={primaryImage.image_url} alt={primaryImage.alt_text || 'Product'} className="w-20 h-20 object-cover rounded-md" loading="lazy" />
                  )}
                  <div className="flex-1">
                    <h4 className="font-medium">{item.product_variants?.products?.name || 'Product'}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline">{item.product_variants?.color}</Badge>
                      {item.product_variants?.size && <Badge variant="outline">Size {item.product_variants.size}</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">Quantity: {item.quantity}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">₹{(Number(item.price) * item.quantity).toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">₹{Number(item.price).toFixed(2)} each</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button variant="outline" onClick={() => navigate('/')}>Continue Shopping</Button>
        <Button onClick={() => navigate('/orders')}>View All Orders</Button>
      </div>
    </div>
  );
}
