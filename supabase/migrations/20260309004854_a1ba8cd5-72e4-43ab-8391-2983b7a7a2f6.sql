-- Fix function search_path security warning

CREATE OR REPLACE FUNCTION public.calculate_order_total(order_id_param uuid)
RETURNS numeric(10,2)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(SUM(quantity * price), 0)
  FROM public.order_items
  WHERE order_id = order_id_param;
$$;