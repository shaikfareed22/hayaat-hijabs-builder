

# Shopping Cart System for Hayaat Hijabs

## Current State Analysis

The project already has:
- A `cart_items` table with proper RLS policies for user-specific cart access
- Authentication system in place with user context
- Product system with variants and pricing
- Existing navbar structure

## Implementation Strategy

Since this is a React/Vite project (not Next.js), I'll implement the cart system using:
- Supabase Edge Functions for cart API endpoints (instead of Next.js API routes)
- React Query for state management and caching
- Context API for cart state management
- Direct Supabase client queries as fallback

## Database Structure

The existing `cart_items` table has all required fields:
- `user_id` (authentication-based)
- `product_id` and `variant_id` (product selection)
- `quantity` (cart management)
- Proper RLS policies for user isolation

## New Files to Create

### 1. Cart Edge Function (`supabase/functions/cart/index.ts`)
- **GET /cart**: Fetch user's cart items with product/variant details
- **POST /cart/add**: Add item to cart (upsert if exists)
- **PUT /cart/update**: Update item quantity
- **DELETE /cart/remove**: Remove item from cart
- Authentication via JWT token
- Joins with products/variants for complete cart data

### 2. Cart Service Layer (`src/services/cartService.ts`)
- Methods for all CRUD operations
- Error handling and response formatting
- Token management for authenticated requests

### 3. Cart Hooks (`src/hooks/useCart.ts`)
- React Query hooks for cart operations
- `useCart()` - fetch and cache cart items
- `useAddToCart()` - mutation for adding items
- `useUpdateCartItem()` - mutation for quantity updates
- `useRemoveFromCart()` - mutation for removing items
- Cache invalidation on mutations

### 4. Cart Context (`src/contexts/CartContext.tsx`)
- Global cart state management
- Cart item count calculation
- Integration with authentication state
- Persistence across page refreshes via React Query cache

### 5. Cart Components
- **Cart Drawer/Sheet** (`src/components/cart/CartDrawer.tsx`)
  - Slide-out cart panel
  - Item list with thumbnails
  - Quantity controls (+/- buttons)
  - Remove item functionality
  - Subtotal calculation
  - Checkout button
- **Cart Item Component** (`src/components/cart/CartItem.tsx`)
  - Individual cart item with image, name, variant details
  - Quantity selector with loading states
  - Remove button with confirmation
- **Add to Cart Button** (`src/components/cart/AddToCartButton.tsx`)
  - Reusable button for product pages
  - Loading states and success feedback

### 6. Updated Files
- **Navbar** (`src/components/layout/Navbar.tsx`)
  - Cart icon with animated item count badge
  - Click handler to open cart drawer
- **App.tsx** - Wrap with CartProvider

## Technical Features

### Cart Persistence
- React Query cache persists cart data across page refreshes
- Background sync with server on authentication state change
- Optimistic updates for immediate UI feedback

### Real-time Updates
- Cart count updates immediately after mutations
- Loading states during network requests
- Error handling with toast notifications

### Cart Item Management
- Automatic cart merging for same product+variant combinations
- Quantity validation against stock levels
- Price calculation with variant-specific pricing

### User Experience
- Smooth animations for cart drawer
- Loading skeletons for cart items
- Empty cart state with call-to-action
- Responsive design for mobile cart experience

## Edge Function Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/cart` | Fetch user's cart with product details |
| POST | `/cart/add` | Add/update item in cart |
| PUT | `/cart/update` | Update item quantity |
| DELETE | `/cart/remove` | Remove item from cart |

## Security Considerations
- All cart operations require authentication
- RLS policies ensure users only access their own cart
- Input validation for product/variant IDs
- Quantity limits and stock validation

