import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';

export default function Admin() {
  const { profile } = useAuth();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-luxury mb-8">Admin Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Welcome, Admin!</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Logged in as: {profile?.display_name || profile?.first_name || 'Admin'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">Coming Soon</p>
            <p className="text-sm text-muted-foreground">
              Order analytics and metrics
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              No recent activity to display
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Product Management</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Manage your product catalog, inventory, and pricing.
            </p>
            <p className="text-sm text-muted-foreground">
              🚧 Product management interface coming soon
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Order Management</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              View and manage customer orders, shipping, and returns.
            </p>
            <p className="text-sm text-muted-foreground">
              🚧 Order management interface coming soon
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Customer Management</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              View customer profiles, order history, and support tickets.
            </p>
            <p className="text-sm text-muted-foreground">
              🚧 Customer management interface coming soon
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Analytics & Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Track sales performance, customer behavior, and business metrics.
            </p>
            <p className="text-sm text-muted-foreground">
              🚧 Analytics dashboard coming soon
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}