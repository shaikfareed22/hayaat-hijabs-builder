
# Complete Supabase Database Schema for Hayaat Hijabs E-commerce

## Current State Analysis
The project already has a sophisticated e-commerce schema with:
- **products**, **product_variants**, **product_images** (handles color/size variants)
- **categories**, **collections**, **product_collections** (product organization)
- **user_profiles** (extends auth.users)

## Required Extensions & Modifications

### 1. User Management Enhancement
**Issue**: Current schema uses `user_profiles` but you need `users` table with roles
**Solution**: Add user roles system with proper security

```sql
-- Create user roles enum
CREATE TYPE public.user_role AS ENUM ('admin', 'customer');

-- Add role to user_profiles or create users table
ALTER TABLE public.user_profiles 
ADD COLUMN role user_role DEFAULT 'customer',
ADD COLUMN email text;
```

### 2. Missing E-commerce Tables
Need to create these core tables:

**Cart Items**
```sql
CREATE TABLE public.cart_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id uuid REFERENCES products(id) ON DELETE CASCADE,
    variant_id uuid REFERENCES product_variants(id) ON DELETE CASCADE,
    quantity integer NOT NULL CHECK (quantity > 0),
    created_at timestamptz DEFAULT now()
);
```

**Orders & Order Items**
```sql
CREATE TABLE public.orders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    total_price numeric(10,2) NOT NULL,
    payment_status text CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
    order_status text CHECK (order_status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled')),
    shipping_address jsonb NOT NULL,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE public.order_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
    product_id uuid REFERENCES products(id) ON DELETE SET NULL,
    variant_id uuid REFERENCES product_variants(id) ON DELETE SET NULL,
    quantity integer NOT NULL,
    price numeric(10,2) NOT NULL,
    created_at timestamptz DEFAULT now()
);
```

**Reviews System**
```sql
CREATE TABLE public.reviews (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id uuid REFERENCES products(id) ON DELETE CASCADE,
    rating integer CHECK (rating >= 1 AND rating <= 5),
    review_text text,
    is_verified boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);
```

**Wishlists**
```sql
CREATE TABLE public.wishlists (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id uuid REFERENCES products(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),
    UNIQUE(user_id, product_id)
);
```

**Payments**
```sql
CREATE TABLE public.payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
    payment_gateway text NOT NULL,
    payment_id text NOT NULL,
    payment_status text CHECK (payment_status IN ('pending', 'completed', 'failed', 'cancelled')),
    amount numeric(10,2) NOT NULL,
    created_at timestamptz DEFAULT now()
);
```

### 3. Schema Improvements
**Product Schema Enhancement**: The existing products/variants structure is more sophisticated than the simple products table you requested. It separates:
- **Products**: Base product info (name, description, fabric)
- **Product Variants**: Specific SKUs with price, stock, color, size
- **Product Images**: Multiple images per variant

**Collections Enhancement**: Already exists but needs to align with your requirements:
- Rename `image_url` to `image` if needed
- Ensure proper relationships

### 4. Row Level Security (RLS) Policies
Need to add comprehensive RLS for:
- **Cart items**: Users can only access their own carts
- **Orders**: Users can only see their own orders
- **Reviews**: Users can create/edit their own reviews
- **Wishlists**: Users can only access their own wishlists
- **Admin access**: Admin role can manage all data

### 5. Database Functions & Triggers
Create functions for:
- **Stock management**: Automatic stock updates on order placement
- **Order totals**: Calculate order totals from order items
- **User roles**: Security definer functions for role checking
- **Inventory tracking**: Low stock alerts

## Implementation Strategy
1. **Create missing tables** with proper relationships and constraints
2. **Add RLS policies** for data security
3. **Create indexes** for performance optimization
4. **Add business logic functions** for cart/order management
5. **Create admin functions** for product/order management
6. **Add sample data** for testing

## Benefits of This Approach
- **Scalable**: Supports complex product variants and inventory
- **Secure**: Comprehensive RLS policies
- **Performance**: Proper indexing and constraints
- **Business Logic**: Built-in functions for common operations
- **Admin Ready**: Proper role separation for management

This schema will provide a complete foundation for the Hayaat Hijabs e-commerce platform while maintaining the sophisticated product variant system already in place.
