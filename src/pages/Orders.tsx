import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { Skeleton } from '@/components/ui/skeleton';
import { OrderTimeline } from '@/components/order/OrderTimeline';

type Order = Tables<'orders'> & {
  order_items: Array<Tables<'order_items'> & {
    products: Tables<'products'> | null;
    product_variants: Tables<'product_variants'> | null;
  }>;
};

export default function Orders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('orders')
          .select(`
            *,
            order_items (
              *,
              products (name, slug),
              product_variants (color, size, sku)
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setOrders(data as Order[]);
      } catch (error) {
        console.error('Error fetching orders:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [user]);

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'default';
      case 'pending': return 'outline';
      case 'failed': case 'refunded': return 'destructive';
      default: return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-luxury mb-8">My Orders</h1>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader><Skeleton className="h-6 w-32" /><Skeleton className="h-4 w-48" /></CardHeader>
              <CardContent><Skeleton className="h-20 w-full" /></CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-luxury mb-8">My Orders</h1>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">You haven't placed any orders yet.</p>
            <a href="/products" className="text-primary hover:underline mt-2 inline-block">Start shopping →</a>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-luxury mb-8">My Orders</h1>
      <div className="space-y-6">
        {orders.map((order) => (
          <Card key={order.id}>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                <div>
                  <CardTitle className="text-lg">Order #{order.id.slice(0, 8).toUpperCase()}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Placed on {new Date(order.created_at!).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
                <Badge variant={getPaymentStatusColor(order.payment_status!) as any} className="capitalize">
                  {order.payment_status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Order Timeline */}
              <OrderTimeline
                status={order.order_status}
                trackingNumber={(order as any).tracking_number}
                shippedDate={(order as any).shipped_date}
                deliveredDate={(order as any).delivered_date}
                createdAt={order.created_at}
              />

              {/* Items */}
              <div className="space-y-3 mt-4">
                {order.order_items.map((item) => (
                  <div key={item.id} className="flex justify-between items-center py-2 border-b last:border-b-0">
                    <div>
                      <p className="font-medium">{item.products?.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.product_variants?.color}
                        {item.product_variants?.size && ` • ${item.product_variants.size}`}
                        {` • Qty: ${item.quantity}`}
                      </p>
                    </div>
                    <p className="font-medium">₹{Number(item.price).toFixed(2)}</p>
                  </div>
                ))}

                <div className="flex justify-between items-center pt-3 border-t">
                  <div className="space-y-0.5">
                    <span className="font-semibold">Total</span>
                    {((order as any).shipping_amount > 0 || (order as any).discount_amount > 0) && (
                      <div className="flex gap-3 text-xs text-muted-foreground">
                        {(order as any).shipping_amount > 0 && <span>Shipping: ₹{Number((order as any).shipping_amount).toFixed(2)}</span>}
                        {(order as any).discount_amount > 0 && <span className="text-primary">Discount: −₹{Number((order as any).discount_amount).toFixed(2)}</span>}
                      </div>
                    )}
                  </div>
                  <span className="text-lg font-bold">₹{Number(order.total_price).toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
