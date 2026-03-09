-- Create product images public bucket (idempotent)
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- Public read access for product images
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Public product image reads'
  ) THEN
    CREATE POLICY "Public product image reads"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'product-images');
  END IF;
END
$$;

-- Admin upload access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Admins can upload product images'
  ) THEN
    CREATE POLICY "Admins can upload product images"
    ON storage.objects
    FOR INSERT
    WITH CHECK (
      bucket_id = 'product-images'
      AND public.has_role(auth.uid(), 'admin'::public.user_role)
    );
  END IF;
END
$$;

-- Admin update access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Admins can update product images'
  ) THEN
    CREATE POLICY "Admins can update product images"
    ON storage.objects
    FOR UPDATE
    USING (
      bucket_id = 'product-images'
      AND public.has_role(auth.uid(), 'admin'::public.user_role)
    )
    WITH CHECK (
      bucket_id = 'product-images'
      AND public.has_role(auth.uid(), 'admin'::public.user_role)
    );
  END IF;
END
$$;

-- Admin delete access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Admins can delete product images'
  ) THEN
    CREATE POLICY "Admins can delete product images"
    ON storage.objects
    FOR DELETE
    USING (
      bucket_id = 'product-images'
      AND public.has_role(auth.uid(), 'admin'::public.user_role)
    );
  END IF;
END
$$;