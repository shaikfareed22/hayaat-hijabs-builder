import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Package, Users, TrendingUp, ArrowUp, Clock } from 'lucide-react';

interface Stats {
  totalOrders: number;
  totalRevenue: number;
  totalProducts: number;
  totalCustomers: number;
  recentOrders: any[];
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    totalOrders: 0,
    totalRevenue: 0,
    totalProducts: 0,
    totalCustomers: 0,
    recentOrders: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [ordersRes, productsRes, customersRes, recentOrdersRes] = await Promise.all([
          supabase.from('orders').select('id, total_price, order_status, created_at'),
          supabase.from('products').select('id').eq('is_active', true),
          supabase.from('user_profiles').select('id').eq('role', 'customer'),
          supabase
            .from('orders')
            .select('id, total_price, order_status, payment_status, created_at, shipping_address')
            .order('created_at', { ascending: false })
            .limit(5),
        ]);

        const orders = ordersRes.data || [];
        const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total_price), 0);

        setStats({
          totalOrders: orders.length,
          totalRevenue,
          totalProducts: productsRes.data?.length || 0,
          totalCustomers: customersRes.data?.length || 0,
          recentOrders: recentOrdersRes.data || [],
        });
      } catch (err) {
        console.error('Error fetching stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statCards = [
    {
      title: 'Total Orders',
      value: stats.totalOrders,
      icon: ShoppingCart,
      format: (v: number) => v.toString(),
      sub: 'All time',
    },
    {
      title: 'Revenue',
      value: stats.totalRevenue,
      icon: TrendingUp,
      format: (v: number) => `$${v.toFixed(2)}`,
      sub: 'All time',
    },
    {
      title: 'Products',
      value: stats.totalProducts,
      icon: Package,
      format: (v: number) => v.toString(),
      sub: 'Active listings',
    },
    {
      title: 'Customers',
      value: stats.totalCustomers,
      icon: Users,
      format: (v: number) => v.toString(),
      sub: 'Registered users',
    },
  ];

  const getStatusVariant = (status: string | null) => {
    switch (status) {
      case 'completed': return 'default';
      case 'processing': return 'secondary';
      case 'shipped': return 'secondary';
      case 'pending': return 'outline';
      case 'cancelled': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-luxury font-semibold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Welcome to your store overview</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map(({ title, value, icon: Icon, format, sub }) => (
          <Card key={title} className="shadow-luxury border-border">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">{title}</p>
                  <p className="text-3xl font-bold mt-1 text-foreground">
                    {loading ? '—' : format(value)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <ArrowUp className="w-3 h-3 text-primary" />
                    {sub}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-lg gradient-luxury flex items-center justify-center">
                  <Icon className="w-5 h-5 text-primary-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Orders */}
      <Card className="shadow-luxury">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="w-4 h-4 text-muted-foreground" />
            Recent Orders
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : stats.recentOrders.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">No orders yet</p>
          ) : (
            <div className="space-y-3">
              {stats.recentOrders.map((order) => {
                const address = order.shipping_address as any;
                return (
                  <div key={order.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                    <div>
                      <p className="text-sm font-medium">#{order.id.slice(-8).toUpperCase()}</p>
                      <p className="text-xs text-muted-foreground">
                        {address?.name} • {new Date(order.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={getStatusVariant(order.order_status)} className="capitalize text-xs">
                        {order.order_status || 'pending'}
                      </Badge>
                      <span className="text-sm font-semibold">${Number(order.total_price).toFixed(2)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
