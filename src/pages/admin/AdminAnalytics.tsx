import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, ShoppingCart, Package, DollarSign } from 'lucide-react';

interface OrderRow {
  id: string;
  total_price: number;
  created_at: string;
  order_status: string | null;
}

export default function AdminAnalytics() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase
        .from('orders')
        .select('id, total_price, created_at, order_status')
        .order('created_at', { ascending: true });
      setOrders(data || []);
      setLoading(false);
    };
    fetchData();
  }, []);

  // Build monthly revenue chart data (last 6 months)
  const getMonthlyData = () => {
    const months: Record<string, { revenue: number; orders: number }> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleString('default', { month: 'short', year: '2-digit' });
      months[key] = { revenue: 0, orders: 0 };
    }
    orders.forEach(o => {
      const d = new Date(o.created_at);
      const key = d.toLocaleString('default', { month: 'short', year: '2-digit' });
      if (months[key]) {
        months[key].revenue += Number(o.total_price);
        months[key].orders += 1;
      }
    });
    return Object.entries(months).map(([month, data]) => ({ month, ...data }));
  };

  // Status breakdown
  const getStatusBreakdown = () => {
    const counts: Record<string, number> = {};
    orders.forEach(o => {
      const s = o.order_status || 'pending';
      counts[s] = (counts[s] || 0) + 1;
    });
    return Object.entries(counts).map(([status, count]) => ({ status, count }));
  };

  const totalRevenue = orders.reduce((s, o) => s + Number(o.total_price), 0);
  const avgOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;
  const completedOrders = orders.filter(o => o.order_status === 'delivered').length;

  const monthlyData = getMonthlyData();
  const statusData = getStatusBreakdown();

  const summaryCards = [
    { title: 'Total Revenue', value: `$${totalRevenue.toFixed(2)}`, icon: DollarSign, sub: 'All time' },
    { title: 'Total Orders', value: orders.length.toString(), icon: ShoppingCart, sub: 'All time' },
    { title: 'Avg Order Value', value: `$${avgOrderValue.toFixed(2)}`, icon: TrendingUp, sub: 'Per order' },
    { title: 'Completed Orders', value: completedOrders.toString(), icon: Package, sub: 'Delivered' },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-luxury font-semibold">Analytics</h1>
        <p className="text-muted-foreground text-sm mt-1">Store performance overview</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {summaryCards.map(({ title, value, icon: Icon, sub }) => (
          <Card key={title}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">{title}</p>
                  <p className="text-2xl font-bold mt-1">{loading ? '—' : value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{sub}</p>
                </div>
                <div className="w-10 h-10 rounded-lg gradient-luxury flex items-center justify-center">
                  <Icon className="w-5 h-5 text-primary-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Monthly Revenue */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Monthly Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" tickFormatter={v => `$${v}`} />
                  <Tooltip
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                    formatter={(v: number) => [`$${v.toFixed(2)}`, 'Revenue']}
                  />
                  <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: 'hsl(var(--primary))' }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Monthly Orders */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Monthly Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                    formatter={(v: number) => [v, 'Orders']}
                  />
                  <Bar dataKey="orders" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Order Status Breakdown */}
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Order Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-48 w-full" />
            ) : statusData.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">No order data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={statusData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis dataKey="status" type="category" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" width={80} />
                  <Tooltip
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
