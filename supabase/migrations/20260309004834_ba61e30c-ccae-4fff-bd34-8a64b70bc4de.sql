-- Complete PostgreSQL Database Schema for Hayaat Hijabs E-commerce (Fixed)

-- 1. Create user roles enum
CREATE TYPE public.user_role AS ENUM ('admin', 'customer');

-- 2. Enhance user_profiles table with roles and email
ALTER TABLE public.user_profiles 
ADD COLUMN role user_role DEFAULT 'customer',
ADD COLUMN email text;

-- 3. Create cart_items table
CREATE TABLE public.cart_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    product_id uuid REFERENCES products(id) ON DELETE CASCADE NOT NULL,
    variant_id uuid REFERENCES product_variants(id) ON DELETE CASCADE NOT NULL,
    quantity integer NOT NULL CHECK (quantity > 0),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(user_id, variant_id)
);

-- 4. Create orders table
CREATE TABLE public.orders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
    total_price numeric(10,2) NOT NULL CHECK (total_price >= 0),
    payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
    order_status text DEFAULT 'pending' CHECK (order_status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled')),
    shipping_address jsonb NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 5. Create order_items table
CREATE TABLE public.order_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id uuid REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
    product_id uuid REFERENCES products(id) ON DELETE SET NULL NOT NULL,
    variant_id uuid REFERENCES product_variants(id) ON DELETE SET NULL NOT NULL,
    quantity integer NOT NULL CHECK (quantity > 0),
    price numeric(10,2) NOT NULL CHECK (price >= 0),
    created_at timestamptz DEFAULT now()
);

-- 6. Create reviews table
CREATE TABLE public.reviews (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    product_id uuid REFERENCES products(id) ON DELETE CASCADE NOT NULL,
    rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text text,
    is_verified boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(user_id, product_id)
);

-- 7. Create wishlists table
CREATE TABLE public.wishlists (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    product_id uuid REFERENCES products(id) ON DELETE CASCADE NOT NULL,
    created_at timestamptz DEFAULT now(),
    UNIQUE(user_id, product_id)
);

-- 8. Create payments table
CREATE TABLE public.payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id uuid REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
    payment_gateway text NOT NULL,
    payment_id text NOT NULL,
    payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'cancelled')),
    amount numeric(10,2) NOT NULL CHECK (amount >= 0),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 9. Enable Row Level Security on all new tables
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- 10. Create security definer function to check user roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role user_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 11. Create RLS policies for cart_items
CREATE POLICY "Users can view their own cart items"
ON public.cart_items
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own cart items"
ON public.cart_items
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cart items"
ON public.cart_items
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cart items"
ON public.cart_items
FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all cart items"
ON public.cart_items
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- 12. Create RLS policies for orders
CREATE POLICY "Users can view their own orders"
ON public.orders
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own orders"
ON public.orders
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all orders"
ON public.orders
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- 13. Create RLS policies for order_items
CREATE POLICY "Users can view their own order items"
ON public.order_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = order_items.order_id
    AND orders.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create order items for their orders"
ON public.order_items
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = order_items.order_id
    AND orders.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all order items"
ON public.order_items
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- 14. Create RLS policies for reviews
CREATE POLICY "Everyone can view verified reviews"
ON public.reviews
FOR SELECT
USING (is_verified = true);

CREATE POLICY "Users can view their own unverified reviews"
ON public.reviews
FOR SELECT
USING (auth.uid() = user_id AND is_verified = false);

CREATE POLICY "Users can create their own reviews"
ON public.reviews
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reviews"
ON public.reviews
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reviews"
ON public.reviews
FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all reviews"
ON public.reviews
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- 15. Create RLS policies for wishlists
CREATE POLICY "Users can view their own wishlists"
ON public.wishlists
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own wishlists"
ON public.wishlists
FOR ALL
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all wishlists"
ON public.wishlists
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- 16. Create RLS policies for payments
CREATE POLICY "Users can view payments for their orders"
ON public.payments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = payments.order_id
    AND orders.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all payments"
ON public.payments
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- 17. Add admin policies for user_profiles
CREATE POLICY "Admins can view all profiles"
ON public.user_profiles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all profiles"
ON public.user_profiles
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- 18. Create function to calculate order total
CREATE OR REPLACE FUNCTION public.calculate_order_total(order_id_param uuid)
RETURNS numeric(10,2)
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(SUM(quantity * price), 0)
  FROM public.order_items
  WHERE order_id = order_id_param;
$$;

-- 19. Create function to update stock when order is placed
CREATE OR REPLACE FUNCTION public.update_stock_on_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Decrease stock when order item is inserted
  IF TG_OP = 'INSERT' THEN
    UPDATE public.product_variants
    SET stock_quantity = stock_quantity - NEW.quantity
    WHERE id = NEW.variant_id;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product variant not found';
    END IF;
    
    RETURN NEW;
  END IF;
  
  -- Handle stock adjustment on delete (e.g., order cancellation)
  IF TG_OP = 'DELETE' THEN
    UPDATE public.product_variants
    SET stock_quantity = stock_quantity + OLD.quantity
    WHERE id = OLD.variant_id;
    
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$;

-- 20. Create triggers for automatic timestamp updates
CREATE TRIGGER update_cart_items_updated_at
  BEFORE UPDATE ON public.cart_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 21. Create trigger for stock management
CREATE TRIGGER manage_stock_on_order
  AFTER INSERT OR DELETE ON public.order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_stock_on_order();

-- 22. Create indexes for performance
CREATE INDEX idx_cart_items_user_id ON public.cart_items(user_id);
CREATE INDEX idx_cart_items_variant_id ON public.cart_items(variant_id);

CREATE INDEX idx_orders_user_id ON public.orders(user_id);
CREATE INDEX idx_orders_status ON public.orders(order_status);
CREATE INDEX idx_orders_created_at ON public.orders(created_at);

CREATE INDEX idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX idx_order_items_variant_id ON public.order_items(variant_id);

CREATE INDEX idx_reviews_product_id ON public.reviews(product_id);
CREATE INDEX idx_reviews_user_id ON public.reviews(user_id);
CREATE INDEX idx_reviews_rating ON public.reviews(rating);
CREATE INDEX idx_reviews_verified ON public.reviews(is_verified);

CREATE INDEX idx_wishlists_user_id ON public.wishlists(user_id);
CREATE INDEX idx_wishlists_product_id ON public.wishlists(product_id);

CREATE INDEX idx_payments_order_id ON public.payments(order_id);
CREATE INDEX idx_payments_status ON public.payments(payment_status);