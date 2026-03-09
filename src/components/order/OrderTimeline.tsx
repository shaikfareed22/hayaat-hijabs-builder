import { CheckCircle, Package, Truck, Home, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OrderTimelineProps {
  status: string | null;
  trackingNumber?: string | null;
  shippedDate?: string | null;
  deliveredDate?: string | null;
  createdAt?: string | null;
}

const steps = [
  { key: 'pending', label: 'Order Placed', icon: Clock },
  { key: 'processing', label: 'Processing', icon: Package },
  { key: 'shipped', label: 'Shipped', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: Home },
];

const statusOrder: Record<string, number> = {
  pending: 0,
  pending_payment: 0,
  paid: 1,
  processing: 1,
  shipped: 2,
  delivered: 3,
};

export function OrderTimeline({ status, trackingNumber, shippedDate, deliveredDate, createdAt }: OrderTimelineProps) {
  const currentIdx = statusOrder[status || 'pending'] ?? 0;
  const isCancelled = status === 'cancelled' || status === 'refunded';

  if (isCancelled) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
        <CheckCircle className="w-4 h-4" />
        <span className="capitalize font-medium">Order {status}</span>
      </div>
    );
  }

  const formatDate = (d: string | null | undefined) => {
    if (!d) return null;
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          const isComplete = idx <= currentIdx;
          const isCurrent = idx === currentIdx;

          return (
            <div key={step.key} className="flex flex-col items-center flex-1 relative">
              {/* Connector line */}
              {idx > 0 && (
                <div
                  className={cn(
                    'absolute top-4 -left-1/2 w-full h-0.5',
                    idx <= currentIdx ? 'bg-primary' : 'bg-border'
                  )}
                  style={{ zIndex: 0 }}
                />
              )}
              <div
                className={cn(
                  'relative z-10 w-8 h-8 rounded-full flex items-center justify-center transition-colors',
                  isComplete ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                  isCurrent && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
                )}
              >
                <Icon className="w-4 h-4" />
              </div>
              <span className={cn('text-xs mt-1.5 text-center', isComplete ? 'text-foreground font-medium' : 'text-muted-foreground')}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Extra info */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {createdAt && <span>Placed: {formatDate(createdAt)}</span>}
        {shippedDate && <span>Shipped: {formatDate(shippedDate)}</span>}
        {deliveredDate && <span>Delivered: {formatDate(deliveredDate)}</span>}
        {trackingNumber && (
          <span className="font-medium text-foreground">Tracking: {trackingNumber}</span>
        )}
      </div>
    </div>
  );
}
