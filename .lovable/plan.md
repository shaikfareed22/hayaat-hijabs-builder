

# Product Image Management — Gap Analysis & Plan

## Already Implemented ✅
- **Storage bucket**: `product-images` (public) exists
- **`product_images` table**: exists with id, variant_id, image_url, is_primary, display_order, alt_text
- **Admin upload**: Multi-file upload with drag-and-drop in `ProductImageManager`
- **Admin delete**: Per-image delete with storage cleanup
- **Admin set primary**: Toggle primary image per variant
- **Product grid**: Shows primary image via edge function computed `primary_image`
- **Product detail gallery**: Thumbnail strip with main image selection in `ProductGallery`

## What's Missing

### 1. Drag-to-Reorder Images in Admin
**File:** `src/components/admin/ProductImageManager.tsx`
- Add drag-and-drop reorder capability to the image grid
- On drop, update `display_order` for affected images in `product_images` table
- Use HTML5 drag events (no new library needed) — each image card gets `draggable`, `onDragStart`, `onDragOver`, `onDrop`
- After reorder, batch-update display_order via Supabase

### 2. Image Zoom on Product Detail
**File:** `src/components/product/ProductGallery.tsx`
- Add a zoom modal: clicking the main image opens a full-screen overlay with the high-res image
- Use existing `Dialog` component for the lightbox
- Inside the dialog, render the image at full resolution with `object-contain`
- Add pinch-to-zoom / scroll-zoom using CSS `transform: scale()` with mouse wheel handler
- Close on backdrop click or escape

### 3. Web Image Optimization Note
Images uploaded via Supabase Storage are served as-is. Add `loading="lazy"` (already done) and use CSS `object-fit: cover` for thumbnails (already done). For further optimization, we can add width-based `srcset` hints or Supabase image transformation query params if enabled. No schema changes needed.

---

## Files to Edit

| File | Change |
|------|--------|
| `src/components/admin/ProductImageManager.tsx` | Add drag-to-reorder with display_order batch update |
| `src/components/product/ProductGallery.tsx` | Add click-to-zoom lightbox with scroll-zoom support |

No database migrations needed — all tables, bucket, and RLS policies are already in place.

