import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function Checkout() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-luxury mb-8">Checkout</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Order Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center py-8">
                <p className="text-muted-foreground">Your cart is empty</p>
                <Button variant="outline" className="mt-4" onClick={() => window.history.back()}>
                  Continue Shopping
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Checkout Form */}
        <Card>
          <CardHeader>
            <CardTitle>Shipping Information</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              🚧 Checkout flow coming soon
            </p>
            <p className="text-sm text-muted-foreground mt-4">
              This will include shipping address, payment processing, and order confirmation.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}