
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS shipped_date timestamptz,
  ADD COLUMN IF NOT EXISTS delivered_date timestamptz,
  ADD COLUMN IF NOT EXISTS tracking_number text,
  ADD COLUMN IF NOT EXISTS shipping_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS coupon_id uuid;

CREATE TABLE IF NOT EXISTS public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  discount_type text NOT NULL,
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

CREATE POLICY "Active coupons viewable by authenticated"
  ON public.coupons FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins manage coupons"
  ON public.coupons FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.orders
  ADD CONSTRAINT orders_coupon_id_fkey
  FOREIGN KEY (coupon_id) REFERENCES public.coupons(id);

CREATE INDEX IF NOT EXISTS idx_products_is_active_featured ON products(is_active, is_featured);
CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id_created ON orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
