import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, AreaChart, Area, PieChart, Pie, Cell,
} from 'recharts';
import {
  DollarSign, ShoppingCart, TrendingUp, Users, Package,
  ArrowUpRight, ArrowDownRight, Zap, Crown, Star,
  CalendarDays, Clock,
} from 'lucide-react';

// ────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────
interface OrderRow {
  id: string;
  total_price: number;
  created_at: string;
  order_status: string | null;
  user_id: string;
}

interface OrderItemRow {
  product_id: string;
  quantity: number;
  price: number;
  products: { name: string } | null;
}

interface CustomerRow {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  created_at: string;
}

// ────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────
const fmt = (v: number) => v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v.toFixed(0)}`;
const CHART_COLORS = [
  'hsl(25, 30%, 75%)',   // rose gold
  'hsl(350, 40%, 78%)',  // blush
  'hsl(30, 25%, 70%)',   // warm beige
  'hsl(20, 14%, 50%)',   // deep brown
  'hsl(40, 20%, 65%)',   // cream accent
];

const tooltipStyle = {
  background: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
  fontSize: '12px',
};

function isToday(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

function isThisMonth(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

function isLastMonth(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const last = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return d.getMonth() === last.getMonth() && d.getFullYear() === last.getFullYear();
}

// ────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────
export default function AdminAnalytics() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItemRow[]>([]);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      const [ordersRes, itemsRes, customersRes] = await Promise.all([
        supabase
          .from('orders')
          .select('id, total_price, created_at, order_status, user_id')
          .order('created_at', { ascending: true }),
        supabase
          .from('order_items')
          .select('product_id, quantity, price, products(name)'),
        supabase
          .from('user_profiles')
          .select('user_id, first_name, last_name, email, created_at')
          .eq('role', 'customer')
          .order('created_at', { ascending: true }),
      ]);
      setOrders(ordersRes.data || []);
      setOrderItems((itemsRes.data as any) || []);
      setCustomers(customersRes.data || []);
      setLoading(false);
    };
    fetchAll();
  }, []);

  // ── KPI Metrics ──
  const totalRevenue = useMemo(() => orders.reduce((s, o) => s + Number(o.total_price), 0), [orders]);
  const ordersToday = useMemo(() => orders.filter(o => isToday(o.created_at)).length, [orders]);
  const revenueToday = useMemo(() => orders.filter(o => isToday(o.created_at)).reduce((s, o) => s + Number(o.total_price), 0), [orders]);
  const ordersThisMonth = useMemo(() => orders.filter(o => isThisMonth(o.created_at)).length, [orders]);
  const revenueThisMonth = useMemo(() => orders.filter(o => isThisMonth(o.created_at)).reduce((s, o) => s + Number(o.total_price), 0), [orders]);
  const revenueLastMonth = useMemo(() => orders.filter(o => isLastMonth(o.created_at)).reduce((s, o) => s + Number(o.total_price), 0), [orders]);
  const ordersLastMonth = useMemo(() => orders.filter(o => isLastMonth(o.created_at)).length, [orders]);
  const avgOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;

  const revenueGrowth = revenueLastMonth > 0 ? ((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100 : 0;
  const ordersGrowth = ordersLastMonth > 0 ? ((ordersThisMonth - ordersLastMonth) / ordersLastMonth) * 100 : 0;

  // ── Daily Sales (last 30 days) ──
  const dailySales = useMemo(() => {
    const days: { date: string; revenue: number; orders: number }[] = [];
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days.push({ date: key, revenue: 0, orders: 0 });
    }
    orders.forEach(o => {
      const key = new Date(o.created_at).toISOString().slice(0, 10);
      const day = days.find(d => d.date === key);
      if (day) {
        day.revenue += Number(o.total_price);
        day.orders += 1;
      }
    });
    return days.map(d => ({
      ...d,
      label: new Date(d.date).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
    }));
  }, [orders]);

  // ── Top Selling Products ──
  const topProducts = useMemo(() => {
    const map: Record<string, { name: string; quantity: number; revenue: number }> = {};
    orderItems.forEach(item => {
      const name = (item.products as any)?.name || 'Unknown';
      if (!map[item.product_id]) map[item.product_id] = { name, quantity: 0, revenue: 0 };
      map[item.product_id].quantity += item.quantity;
      map[item.product_id].revenue += item.quantity * Number(item.price);
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  }, [orderItems]);

  // ── Top Customers ──
  const topCustomers = useMemo(() => {
    const map: Record<string, { name: string; email: string; totalSpent: number; orderCount: number }> = {};
    orders.forEach(o => {
      if (!map[o.user_id]) {
        const c = customers.find(c => c.user_id === o.user_id);
        map[o.user_id] = {
          name: c ? [c.first_name, c.last_name].filter(Boolean).join(' ') || 'Customer' : 'Customer',
          email: c?.email || '',
          totalSpent: 0,
          orderCount: 0,
        };
      }
      map[o.user_id].totalSpent += Number(o.total_price);
      map[o.user_id].orderCount += 1;
    });
    return Object.values(map).sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 5);
  }, [orders, customers]);

  // ── Product Popularity (pie data) ──
  const productPie = useMemo(() => {
    return topProducts.slice(0, 5).map((p, i) => ({
      name: p.name.length > 18 ? p.name.slice(0, 18) + '…' : p.name,
      value: p.quantity,
      fill: CHART_COLORS[i % CHART_COLORS.length],
    }));
  }, [topProducts]);

  // ── Customer Growth (monthly) ──
  const customerGrowth = useMemo(() => {
    const months: { month: string; cumulative: number; newUsers: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleString('default', { month: 'short', year: '2-digit' });
      months.push({ month: key, cumulative: 0, newUsers: 0 });
    }
    customers.forEach(c => {
      const d = new Date(c.created_at);
      const key = d.toLocaleString('default', { month: 'short', year: '2-digit' });
      const m = months.find(m => m.month === key);
      if (m) m.newUsers += 1;
    });
    // Build cumulative
    const beforeCount = customers.filter(c => {
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
      return new Date(c.created_at) < sixMonthsAgo;
    }).length;
    let running = beforeCount;
    months.forEach(m => {
      running += m.newUsers;
      m.cumulative = running;
    });
    return months;
  }, [customers]);

  // ── Quick Insights ──
  const insights = useMemo(() => {
    const items: { icon: typeof Zap; text: string; type: 'info' | 'success' | 'warning' }[] = [];

    if (revenueGrowth > 0) {
      items.push({ icon: TrendingUp, text: `Revenue is up ${revenueGrowth.toFixed(0)}% this month vs last month`, type: 'success' });
    } else if (revenueGrowth < 0) {
      items.push({ icon: TrendingUp, text: `Revenue is down ${Math.abs(revenueGrowth).toFixed(0)}% this month vs last month`, type: 'warning' });
    }

    if (topProducts.length > 0) {
      items.push({ icon: Star, text: `"${topProducts[0].name}" is your best seller with ${topProducts[0].quantity} units sold`, type: 'info' });
    }

    const newCustomersThisMonth = customers.filter(c => isThisMonth(c.created_at)).length;
    if (newCustomersThisMonth > 0) {
      items.push({ icon: Users, text: `${newCustomersThisMonth} new customer${newCustomersThisMonth > 1 ? 's' : ''} joined this month`, type: 'success' });
    }

    if (avgOrderValue > 0) {
      items.push({ icon: Zap, text: `Average order value is $${avgOrderValue.toFixed(2)}`, type: 'info' });
    }

    const pendingOrders = orders.filter(o => o.order_status === 'pending').length;
    if (pendingOrders > 0) {
      items.push({ icon: Clock, text: `${pendingOrders} order${pendingOrders > 1 ? 's' : ''} pending fulfillment`, type: 'warning' });
    }

    return items;
  }, [revenueGrowth, topProducts, customers, avgOrderValue, orders]);

  // ── KPI Cards Config ──
  const kpiCards = [
    {
      title: 'Total Revenue',
      value: `$${totalRevenue.toFixed(2)}`,
      icon: DollarSign,
      sub: 'All time',
      badge: null as string | null,
    },
    {
      title: 'Revenue Today',
      value: `$${revenueToday.toFixed(2)}`,
      icon: CalendarDays,
      sub: 'Today',
      badge: null,
    },
    {
      title: 'Orders This Month',
      value: ordersThisMonth.toString(),
      icon: ShoppingCart,
      sub: ordersGrowth !== 0 ? `${ordersGrowth > 0 ? '+' : ''}${ordersGrowth.toFixed(0)}% vs last month` : 'Current month',
      badge: ordersGrowth > 0 ? 'up' : ordersGrowth < 0 ? 'down' : null,
    },
    {
      title: 'Revenue This Month',
      value: `$${revenueThisMonth.toFixed(2)}`,
      icon: TrendingUp,
      sub: revenueGrowth !== 0 ? `${revenueGrowth > 0 ? '+' : ''}${revenueGrowth.toFixed(0)}% vs last month` : 'Current month',
      badge: revenueGrowth > 0 ? 'up' : revenueGrowth < 0 ? 'down' : null,
    },
    {
      title: 'Orders Today',
      value: ordersToday.toString(),
      icon: Package,
      sub: 'Today',
      badge: null,
    },
    {
      title: 'Avg Order Value',
      value: `$${avgOrderValue.toFixed(2)}`,
      icon: DollarSign,
      sub: 'Per order',
      badge: null,
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-luxury font-semibold text-foreground">Analytics Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Deep insights into your store performance</p>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {kpiCards.map(({ title, value, icon: Icon, sub, badge }) => (
          <Card key={title} className="shadow-luxury border-border">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">{title}</p>
                  <p className="text-2xl font-bold mt-1 text-foreground">{loading ? '—' : value}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    {badge === 'up' && <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />}
                    {badge === 'down' && <ArrowDownRight className="w-3.5 h-3.5 text-destructive" />}
                    <p className="text-xs text-muted-foreground">{sub}</p>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-lg gradient-luxury flex items-center justify-center">
                  <Icon className="w-5 h-5 text-primary-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Quick Insights ── */}
      {!loading && insights.length > 0 && (
        <Card className="shadow-luxury">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              Quick Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {insights.map((insight, i) => {
                const Icon = insight.icon;
                return (
                  <div
                    key={i}
                    className={`flex items-start gap-3 p-3 rounded-lg ${
                      insight.type === 'success'
                        ? 'bg-emerald-50 dark:bg-emerald-950/30'
                        : insight.type === 'warning'
                          ? 'bg-amber-50 dark:bg-amber-950/30'
                          : 'bg-muted/50'
                    }`}
                  >
                    <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                      insight.type === 'success'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : insight.type === 'warning'
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-muted-foreground'
                    }`} />
                    <p className="text-sm text-foreground">{insight.text}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Sales Per Day (30 days) ── */}
      <Card className="shadow-luxury">
        <CardHeader>
          <CardTitle className="text-base">Daily Sales (Last 30 Days)</CardTitle>
          <CardDescription>Revenue and order volume per day</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={dailySales}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(25, 30%, 75%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(25, 30%, 75%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11 }}
                  stroke="hsl(var(--muted-foreground))"
                  interval={4}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  stroke="hsl(var(--muted-foreground))"
                  tickFormatter={v => fmt(v)}
                />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number, name: string) => [name === 'revenue' ? `$${v.toFixed(2)}` : v, name === 'revenue' ? 'Revenue' : 'Orders']} />
                <Area type="monotone" dataKey="revenue" stroke="hsl(25, 30%, 75%)" fill="url(#revenueGrad)" strokeWidth={2} />
                <Line type="monotone" dataKey="orders" stroke="hsl(350, 40%, 78%)" strokeWidth={2} dot={false} yAxisId={0} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* ── Product Popularity (Pie) ── */}
        <Card className="shadow-luxury">
          <CardHeader>
            <CardTitle className="text-base">Product Popularity</CardTitle>
            <CardDescription>Top products by units sold</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-56 w-full" />
            ) : productPie.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-12">No order data yet</p>
            ) : (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="50%" height={220}>
                  <PieChart>
                    <Pie
                      data={productPie}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      innerRadius={40}
                      paddingAngle={2}
                    >
                      {productPie.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {productPie.map((p, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: p.fill }} />
                      <span className="truncate text-foreground">{p.name}</span>
                      <span className="ml-auto text-muted-foreground font-medium">{p.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Customer Growth ── */}
        <Card className="shadow-luxury">
          <CardHeader>
            <CardTitle className="text-base">Customer Growth</CardTitle>
            <CardDescription>Total customers over last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-56 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={customerGrowth}>
                  <defs>
                    <linearGradient id="customerGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(350, 40%, 78%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(350, 40%, 78%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="cumulative" name="Total Customers" stroke="hsl(350, 40%, 78%)" fill="url(#customerGrad)" strokeWidth={2} />
                  <Bar dataKey="newUsers" name="New Signups" fill="hsl(25, 30%, 75%)" radius={[4, 4, 0, 0]} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* ── Top Selling Products ── */}
        <Card className="shadow-luxury">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Star className="w-4 h-4 text-primary" />
              Top Selling Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : topProducts.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">No sales data yet</p>
            ) : (
              <div className="space-y-3">
                {topProducts.map((p, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="w-8 h-8 rounded-full gradient-luxury flex items-center justify-center text-xs font-bold text-primary-foreground flex-shrink-0">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.quantity} units sold</p>
                    </div>
                    <p className="text-sm font-semibold text-foreground">${p.revenue.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Top Customers ── */}
        <Card className="shadow-luxury">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Crown className="w-4 h-4 text-primary" />
              Top Customers
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : topCustomers.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">No customer data yet</p>
            ) : (
              <div className="space-y-3">
                {topCustomers.map((c, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="w-8 h-8 rounded-full gradient-luxury flex items-center justify-center text-xs font-bold text-primary-foreground flex-shrink-0">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.orderCount} orders • {c.email}</p>
                    </div>
                    <p className="text-sm font-semibold text-foreground">${c.totalSpent.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
