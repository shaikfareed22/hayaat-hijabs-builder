import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, ShoppingCart, Eye, Truck, Package, CheckCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

type Order = Tables<'orders'> & {
  order_items: Array<Tables<'order_items'> & {
    product_variants: Pick<Tables<'product_variants'>, 'color' | 'size'> & {
      products: Pick<Tables<'products'>, 'name'> | null;
    } | null;
  }>;
};

const ORDER_STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
const PAYMENT_STATUSES = ['pending', 'paid', 'failed', 'refunded'];

const getStatusVariant = (status: string | null) => {
  switch (status) {
    case 'delivered': return 'default';
    case 'shipped': case 'processing': return 'secondary';
    case 'cancelled': return 'destructive';
    default: return 'outline';
  }
};

const getPaymentVariant = (status: string | null) => {
  switch (status) {
    case 'paid': return 'default';
    case 'failed': case 'refunded': return 'destructive';
    default: return 'outline';
  }
};

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [trackingInput, setTrackingInput] = useState('');

  const fetchOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select(`*, order_items (*, product_variants (color, size, products (name)))`)
      .order('created_at', { ascending: false });

    if (error) toast({ title: 'Error loading orders', variant: 'destructive' });
    else setOrders(data as Order[]);
    setLoading(false);
  };

  useEffect(() => { fetchOrders(); }, []);

  const updateOrder = async (orderId: string, updates: Record<string, any>) => {
    const { error } = await supabase.from('orders').update(updates).eq('id', orderId);
    if (error) toast({ title: 'Failed to update', variant: 'destructive' });
    else {
      toast({ title: 'Order updated' });
      fetchOrders();
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(prev => prev ? { ...prev, ...updates } : null);
      }
    }
  };

  const markShipped = (orderId: string) => {
    updateOrder(orderId, {
      order_status: 'shipped',
      shipped_date: new Date().toISOString(),
      tracking_number: trackingInput || null,
    });
  };

  const markDelivered = (orderId: string) => {
    updateOrder(orderId, {
      order_status: 'delivered',
      delivered_date: new Date().toISOString(),
    });
  };

  const filtered = orders.filter(o => {
    const matchSearch = o.id.toLowerCase().includes(search.toLowerCase()) ||
      ((o.shipping_address as any)?.name || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || o.order_status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-luxury font-semibold">Orders</h1>
        <p className="text-muted-foreground text-sm mt-1">{orders.length} total orders</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by order ID or customer name..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Filter by status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {ORDER_STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>No orders found</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((order) => {
                const address = order.shipping_address as any;
                return (
                  <div key={order.id} className="flex flex-col sm:flex-row sm:items-center gap-3 px-6 py-4 hover:bg-muted/30 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium font-mono text-sm">#{order.id.slice(-10).toUpperCase()}</p>
                      <p className="text-sm text-muted-foreground">{address?.name} • {new Date(order.created_at!).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <Select value={order.order_status || 'pending'} onValueChange={v => updateOrder(order.id, { order_status: v })}>
                        <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>{ORDER_STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize text-xs">{s}</SelectItem>)}</SelectContent>
                      </Select>
                      <Badge variant={getPaymentVariant(order.payment_status) as any} className="capitalize text-xs">{order.payment_status || 'pending'}</Badge>
                      <span className="font-semibold text-sm">₹{Number(order.total_price).toFixed(2)}</span>
                      <Button variant="ghost" size="icon" onClick={() => { setSelectedOrder(order); setTrackingInput((order as any).tracking_number || ''); }}>
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-luxury">Order #{selectedOrder?.id.slice(-12).toUpperCase()}</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              {/* Status controls */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Order Status</p>
                  <Select value={selectedOrder.order_status || 'pending'} onValueChange={v => updateOrder(selectedOrder.id, { order_status: v })}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>{ORDER_STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Payment Status</p>
                  <Select value={selectedOrder.payment_status || 'pending'} onValueChange={v => updateOrder(selectedOrder.id, { payment_status: v })}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>{PAYMENT_STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>

              {/* Tracking & Quick Actions */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">Tracking Number</Label>
                <div className="flex gap-2">
                  <Input
                    value={trackingInput}
                    onChange={(e) => setTrackingInput(e.target.value)}
                    placeholder="Enter tracking number"
                    className="h-8 text-sm font-mono"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 shrink-0"
                    onClick={() => updateOrder(selectedOrder.id, { tracking_number: trackingInput })}
                  >
                    Save
                  </Button>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => markShipped(selectedOrder.id)}
                  disabled={selectedOrder.order_status === 'shipped' || selectedOrder.order_status === 'delivered'}
                >
                  <Truck className="w-3.5 h-3.5 mr-1.5" /> Mark Shipped
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => markDelivered(selectedOrder.id)}
                  disabled={selectedOrder.order_status === 'delivered'}
                >
                  <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Mark Delivered
                </Button>
              </div>

              {/* Shipping info */}
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Shipping Address</p>
                {(() => { const a = selectedOrder.shipping_address as any; return (
                  <div className="text-sm space-y-0.5">
                    <p className="font-medium">{a?.name}</p>
                    <p>{a?.address}</p>
                    <p>{a?.city}, {a?.state} {a?.zip}</p>
                    <p>{a?.country}</p>
                    <p className="text-muted-foreground">{a?.phone}</p>
                  </div>
                )})()}
              </div>

              {/* Discount / Shipping info */}
              {((selectedOrder as any).discount_amount > 0 || (selectedOrder as any).shipping_amount > 0) && (
                <div className="flex gap-4 text-xs text-muted-foreground">
                  {(selectedOrder as any).shipping_amount > 0 && <span>Shipping: ₹{Number((selectedOrder as any).shipping_amount).toFixed(2)}</span>}
                  {(selectedOrder as any).discount_amount > 0 && <span className="text-primary">Discount: −₹{Number((selectedOrder as any).discount_amount).toFixed(2)}</span>}
                </div>
              )}

              {/* Items */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Items</p>
                <div className="space-y-2">
                  {selectedOrder.order_items.map(item => (
                    <div key={item.id} className="flex justify-between items-center text-sm p-3 bg-muted/30 rounded-lg">
                      <div>
                        <p className="font-medium">{item.product_variants?.products?.name || 'Product'}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.product_variants?.color}{item.product_variants?.size && ` • ${item.product_variants.size}`} • Qty: {item.quantity}
                        </p>
                      </div>
                      <p className="font-medium">₹{(Number(item.price) * item.quantity).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center border-t pt-3">
                <p className="font-semibold">Total</p>
                <p className="text-xl font-bold">₹{Number(selectedOrder.total_price).toFixed(2)}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
