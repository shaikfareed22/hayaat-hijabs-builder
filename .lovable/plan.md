

## Plan: Production-Level Ecommerce Enhancements for Hayaat Hijabs

This is a large scope request. Many items are already partially or fully implemented. Below is what actually needs to be built, organized into implementation batches.

---

### What Already Exists (No Work Needed)
- Stock columns (`stock_quantity`, `low_stock_threshold`) already on `product_variants`
- Stock decrement trigger (`update_stock_on_order`) already exists
- Cart stock validation in edge function already implemented
- Order stock validation in orders edge function already implemented
- Rate limiting, input sanitization, XSS prevention already in `_shared/security.ts`
- RLS policies on all tables already configured
- Admin orders page with status updates already built
- Admin analytics dashboard with charts (recharts) already built
- Admin product management with stock display already built
- Wishlist page already built
- Loading skeletons already in place

---

### Batch 1: Database Migrations

**Migration 1 — Orders table enhancements:**
```sql
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS shipped_date timestamptz,
  ADD COLUMN IF NOT EXISTS delivered_date timestamptz,
  ADD COLUMN IF NOT EXISTS tracking_number text,
  ADD COLUMN IF NOT EXISTS shipping_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS coupon_id uuid;
```

**Migration 2 — Coupons table:**
```sql
CREATE TABLE public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  discount_type text NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value numeric NOT NULL,
  minimum_order_amount numeric DEFAULT 0,
  usage_limit integer,
  used_count integer DEFAULT 0,
  expires_at timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Everyone can read active coupons (to validate codes)
CREATE POLICY "Active coupons viewable by authenticated"
  ON public.coupons FOR SELECT TO authenticated
  USING (is_active = true);

-- Admins full access
CREATE POLICY "Admins manage coupons"
  ON public.coupons FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
```

**Migration 3 — Add foreign key for coupon on orders:**
```sql
ALTER TABLE public.orders
  ADD CONSTRAINT orders_coupon_id_fkey
  FOREIGN KEY (coupon_id) REFERENCES public.coupons(id);
```

---

### Batch 2: Coupon System

**New file: `src/services/couponService.ts`**
- `validateCoupon(code, subtotal)` — calls a new edge function to validate server-side
- Returns discount amount or error

**New edge function: `supabase/functions/coupons/index.ts`**
- `POST` with `{ code, subtotal }` — validates coupon (active, not expired, usage limit, min order), returns discount
- Admin endpoints for CRUD (with role check)

**Update `supabase/functions/orders/index.ts`**
- Accept optional `coupon_code` in order creation
- Server-side validate coupon, calculate discount, increment `used_count`
- Store `coupon_id`, `discount_amount`, `shipping_amount` on the order

---

### Batch 3: Shipping Calculation

**Update `src/pages/Checkout.tsx`**
- Replace hardcoded `$5.99` shipping with INR logic: free if subtotal >= 999, else ₹60
- Add coupon code input field with "Apply" button
- Show full breakdown: Subtotal, Shipping, Discount, Tax, Total
- Pass `coupon_code` to order creation

**New file: `src/lib/shipping.ts`**
- `calculateShipping(subtotal: number): number` — returns 0 if >= 999, else 60
- Centralized and easily configurable

---

### Batch 4: Order Status Timeline (Customer Side)

**Update `src/pages/Orders.tsx`**
- Add a visual status timeline component showing: Order Placed → Processing → Shipped → Delivered
- Display tracking number when available
- Show shipped/delivered dates
- Use ₹ instead of $ for prices

**New component: `src/components/order/OrderTimeline.tsx`**
- Visual stepper with icons (CheckCircle, Package, Truck, Home)
- Highlights current step, grays out future steps

**Update `src/pages/OrderConfirmation.tsx`**
- Include the timeline component

---

### Batch 5: Admin Order Enhancements

**Update `src/pages/admin/AdminOrders.tsx`**
- Add tracking number input field in order detail dialog
- Add "Mark Shipped" / "Mark Delivered" quick action buttons that auto-set dates
- Add payment status dropdown (already partially there)
- Show coupon/discount info if applied
- Show shipping amount

---

### Batch 6: Admin Coupons Page

**New file: `src/pages/admin/AdminCoupons.tsx`**
- List all coupons with code, type, value, usage stats, expiry, active toggle
- Create/edit coupon dialog
- Delete coupon with confirmation

**Update `src/pages/admin/AdminLayout.tsx`**
- Add "Coupons" nav item with Tag icon

**Update `src/App.tsx`**
- Add `/admin/coupons` route

---

### Batch 7: Admin Stock Management Enhancement

**Update `src/pages/admin/AdminProducts.tsx`**
- Add inline stock editing (click stock number to edit)
- Color-code stock: red < low_stock_threshold, yellow = low, green = good
- Add "Low Stock" filter toggle

**Update `src/pages/admin/Dashboard.tsx`**
- Add low stock alerts section showing variants below threshold

---

### Batch 8: Customer Experience — Related & Recently Viewed

**New component: `src/components/product/RelatedProducts.tsx`**
- Fetch products from same category, exclude current product, limit 4
- Displayed on ProductDetail page

**New hook: `src/hooks/useRecentlyViewed.ts`**
- Store last 10 viewed product IDs in localStorage
- Hook returns product data for those IDs

**New component: `src/components/product/RecentlyViewed.tsx`**
- Horizontal scroll of recently viewed products
- Displayed on homepage or product detail

---

### Batch 9: Performance

**Update product queries**
- Add database indexes via migration:
  ```sql
  CREATE INDEX IF NOT EXISTS idx_products_is_active_featured ON products(is_active, is_featured);
  CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON product_variants(product_id);
  CREATE INDEX IF NOT EXISTS idx_orders_user_id_created ON orders(user_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
  ```
- Add `loading="lazy"` to all product images (most already have this)
- QueryClient already has staleTime configured for caching

---

### Summary of New/Modified Files

| Action | File |
|--------|------|
| Create | `src/lib/shipping.ts` |
| Create | `src/services/couponService.ts` |
| Create | `src/components/order/OrderTimeline.tsx` |
| Create | `src/components/product/RelatedProducts.tsx` |
| Create | `src/hooks/useRecentlyViewed.ts` |
| Create | `src/components/product/RecentlyViewed.tsx` |
| Create | `src/pages/admin/AdminCoupons.tsx` |
| Create | `supabase/functions/coupons/index.ts` |
| Modify | `src/pages/Checkout.tsx` |
| Modify | `src/pages/Orders.tsx` |
| Modify | `src/pages/OrderConfirmation.tsx` |
| Modify | `src/pages/ProductDetail.tsx` |
| Modify | `src/pages/admin/AdminOrders.tsx` |
| Modify | `src/pages/admin/AdminProducts.tsx` |
| Modify | `src/pages/admin/AdminLayout.tsx` |
| Modify | `src/pages/admin/Dashboard.tsx` |
| Modify | `src/App.tsx` |
| Modify | `supabase/functions/orders/index.ts` |
| Migration | 3 SQL migrations (orders columns, coupons table, indexes) |

### Estimated scope: ~15 files changed/created, 3 migrations

