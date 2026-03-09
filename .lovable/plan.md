

# Order Management System for Hayaat Hijabs

## Current State
- `orders` and `order_items` tables exist with proper RLS policies (users can create/view their own, admins manage all)
- `cart_items` table and cart Edge Function are working
- `update_stock_on_order` trigger function exists but no trigger is attached
- Checkout page is a placeholder; Orders page exists but needs the order creation flow
- `shipping_address` is a required JSONB column on orders

## Implementation Plan

### 1. Database: Attach stock update trigger
Run a migration to attach the existing `update_stock_on_order` function as a trigger on `order_items` (INSERT/DELETE), so stock decrements automatically when orders are placed.

### 2. Edge Function: `supabase/functions/orders/index.ts`
Handles all order operations with JWT auth using the service role key for transactional operations:

- **POST** (Create Order):
  1. Accept `shipping_address` from request body
  2. Fetch user's cart items with variant prices
  3. Validate cart is not empty and stock is sufficient
  4. Insert into `orders` (user_id, total_price, shipping_address, status: 'pending')
  5. Insert all `order_items` (triggers stock decrement)
  6. Clear user's `cart_items`
  7. Return created order with items

- **GET** (List Orders):
  - Fetch user's orders with order_items joined to products/variants
  - Sort by created_at descending

- **GET with order_id param** (Single Order):
  - Fetch specific order with full item details
  - Verify ownership via RLS

### 3. Service Layer: `src/services/orderService.ts`
- `createOrder(shippingAddress)` — POST to orders edge function
- `getOrders()` — GET all user orders
- `getOrder(id)` — GET single order

### 4. Hooks: `src/hooks/useOrders.ts`
- `useCreateOrder()` — mutation that invalidates cart and orders queries on success
- `useOrders()` — query for order list
- `useOrder(id)` — query for single order

### 5. Checkout Page: `src/pages/Checkout.tsx` (rewrite)
- Shipping address form (name, address, city, state, zip, country, phone)
- Order summary showing cart items with prices
- Place Order button that calls `createOrder`
- Redirects to `/order-confirmation/:id` on success

### 6. Order Confirmation Page: `src/pages/OrderConfirmation.tsx` (new)
- Route: `/order-confirmation/:orderId`
- Displays order ID, status badges, item list, shipping address, total
- "Continue Shopping" and "View All Orders" links

### 7. Update Orders Page: `src/pages/Orders.tsx`
- Already functional — just needs the edge function for data fetching consistency (currently uses direct Supabase client which works fine with RLS, so minimal changes needed)

### 8. Routing: `src/App.tsx`
- Add `/order-confirmation/:orderId` as a protected route

### Files to Create/Edit
| File | Action |
|------|--------|
| `supabase/functions/orders/index.ts` | Create |
| `src/services/orderService.ts` | Create |
| `src/hooks/useOrders.ts` | Create |
| `src/pages/Checkout.tsx` | Rewrite |
| `src/pages/OrderConfirmation.tsx` | Create |
| `src/App.tsx` | Add route |
| Migration (trigger) | Create |

