
## Product Image Upload System — Hayaat Hijabs

### What Exists
- `product_images` table (linked to `product_variants` via `variant_id`): `id`, `image_url`, `alt_text`, `is_primary`, `display_order`, `variant_id`
- `product_variants` table: `id`, `color`, `size`, `sku`, `product_id`
- RLS: Admins can INSERT/UPDATE/DELETE images; everyone can SELECT
- No storage bucket exists yet
- No product detail page or gallery component exists
- Admin products page has no image management UI

### Architecture Note
Images belong to **variants** (e.g., a "Beige - S" variant has its own image set). The admin image manager will show all variants of a product and let the admin upload images per variant. The storefront gallery shows images grouped by variant/color.

---

### 1. Database Migration — Storage Bucket + RLS

```sql
-- Create public storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('product-images', 'product-images', true);

-- Everyone can view (bucket is public)
CREATE POLICY "Public product image reads"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

-- Admins only: upload, update, delete
CREATE POLICY "Admins can upload product images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'product-images' 
  AND public.has_role(auth.uid(), 'admin'::public.user_role));

CREATE POLICY "Admins can delete product images"
ON storage.objects FOR DELETE
USING (bucket_id = 'product-images' 
  AND public.has_role(auth.uid(), 'admin'::public.user_role));
```

Storage path per upload: `{variant_id}/{timestamp}-{filename}`

---

### 2. New Component: `src/components/admin/ProductImageManager.tsx`

A **Sheet** (wide slide-over panel) opened per product row in AdminProducts.

**Features:**
- Fetches all variants for the product (`color`, `size`, `sku`)
- Variant selector tabs — one tab per variant
- Per-variant: drag-and-drop zone (HTML5 native events — no extra library) + file input fallback
- Upload flow: `supabase.storage.from('product-images').upload(path, file)` → get public URL → insert into `product_images`
- Image grid showing existing images for the selected variant
- Per-image actions: ⭐ Set as Primary, 🗑️ Delete (removes from storage + DB)
- Upload progress state (uploading / done)
- If no variants exist: shows "Add a variant first to upload images"

---

### 3. Updated `src/pages/admin/AdminProducts.tsx`

- Add an **Images** button (📷 icon) per product row, next to Edit and Delete
- Replaces the placeholder Package icon in the product row with the product's primary image (if one exists)
- Opens `ProductImageManager` sheet for that product

---

### 4. New Component: `src/components/product/ProductGallery.tsx`

Reusable storefront gallery component. Props: `images[]`, `productName`.

- **Large main image** (top, aspect-[3/4])
- **Thumbnail strip** (bottom, horizontal scroll)
- Click thumbnail → switches main image with a smooth fade
- Shows placeholder if no images

---

### 5. New Page: `src/pages/ProductDetail.tsx`

Route: `/products/:slug`

Fetches product by slug using existing `productService.getById()`. Displays:
- `ProductGallery` showing images from all variants (primary images first)
- Variant selector: color chips + size buttons that filter the gallery
- Product name, fabric type, short description, price
- Add to Cart button (selects chosen variant)
- Care instructions / full description tabs

---

### 6. `src/App.tsx` — Add Route

```text
/products/:slug  →  ProductDetail (no auth required)
```

---

### Files Summary

| File | Action |
|------|--------|
| Migration: storage bucket + RLS | Create |
| `src/components/admin/ProductImageManager.tsx` | Create |
| `src/pages/admin/AdminProducts.tsx` | Edit (add Images button + thumbnail preview) |
| `src/components/product/ProductGallery.tsx` | Create |
| `src/pages/ProductDetail.tsx` | Create |
| `src/App.tsx` | Edit (add `/products/:slug` route) |
