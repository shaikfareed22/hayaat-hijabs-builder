-- Add admin management policies for collections table
CREATE POLICY "Admins can insert collections"
  ON public.collections
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins can update collections"
  ON public.collections
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins can delete collections"
  ON public.collections
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'::user_role));