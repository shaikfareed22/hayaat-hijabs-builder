

## Plan: Account Page Enhancement, Collections Page, Cart & Wishlist Integration

### Summary
Four main areas of work:
1. **Enhance Account page** with address management, order history link, and wishlist section
2. **Create a public Collections page** (`/collections`) that fetches from the `collections` DB table and shows associated products
3. **Fix FeaturedProducts** on homepage to use real DB data with working Add to Cart and Wishlist buttons
4. **Build Wishlist page** (`/wishlist`) that reads from the `wishlists` table

---

### 1. Enhanced Account Page (`src/pages/Account.tsx`)

Current state: Basic profile edit (first/last name, display name, phone). Missing: address, date of birth, marketing consent, order history link, wishlist preview.

Changes:
- Add **shipping address** section (stored as a separate card) -- NOTE: `user_profiles` doesn't have an address column. We need a **migration** to add `address` (jsonb, nullable) to `user_profiles`.
- Add **date_of_birth** and **marketing_consent** fields to the edit form (already in DB schema)
- Add quick-link cards to **Orders** and **Wishlist** pages
- Re-fetch profile after save so UI updates immediately

**Migration needed:**
```sql
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS address jsonb DEFAULT NULL;
```

### 2. Public Collections Page (`src/pages/Collections.tsx`)

- New route `/collections` (replace the dead link in navbar)
- New route `/collections/:slug` for individual collection
- Fetch active collections from `collections` table
- For individual collection: fetch products via `product_collections` join table
- Display products in same grid style as Products page with working `AddToCartButton` and wishlist heart button
- Update `CollectionsGrid` homepage component links to point to `/collections/:slug`

**Route additions in `App.tsx`:**
```
/collections → Collections list page
/collections/:slug → Single collection with products
```

### 3. Fix Homepage FeaturedProducts

Current state: Uses hardcoded `sampleProducts` array with non-functional buttons.

Changes:
- Fetch featured products from DB (`is_featured = true`) with variants
- Replace hardcoded data with real product cards
- Wire up `AddToCartButton` (uses first variant) and wishlist `Heart` button
- Link product names to `/products/:slug`

### 4. Wishlist Page (`src/pages/Wishlist.tsx`)

- New protected route `/wishlist`
- Fetch from `wishlists` table joined with `products` and their variants/images
- Display products in grid with "Remove from Wishlist" and "Add to Cart" actions
- **Wishlist toggle hook** (`src/hooks/useWishlist.ts`):
  - `useWishlist()` — fetch user's wishlist
  - `useToggleWishlist()` — add/remove product
  - `useIsWishlisted(productId)` — check if product is in wishlist
- Add wishlist heart button to: ProductDetail, Products grid, FeaturedProducts, Collection product grids

### 5. Cart Integration Verification

Cart already works via `AddToCartButton` + `CartContext` (guest & auth). The key fix is ensuring the button appears everywhere products are displayed:
- Homepage FeaturedProducts (currently non-functional placeholder)
- Collections page (new)
- Products page (already working)
- ProductDetail page (already working)

---

### Technical Details

**New files:**
- `src/pages/Collections.tsx` — collection list
- `src/pages/CollectionDetail.tsx` — single collection with products
- `src/pages/Wishlist.tsx` — wishlist page
- `src/hooks/useWishlist.ts` — wishlist data hooks

**Modified files:**
- `src/App.tsx` — add routes for `/collections`, `/collections/:slug`, `/wishlist`
- `src/pages/Account.tsx` — add address, DOB, marketing consent, quick links
- `src/components/home/FeaturedProducts.tsx` — replace hardcoded data with DB fetch
- `src/components/home/CollectionsGrid.tsx` — update links to `/collections/:slug`
- `src/components/layout/Navbar.tsx` — no changes needed (already links to `/collections` and `/wishlist`)

**DB migration:**
- Add `address` jsonb column to `user_profiles`

**No new RLS policies needed** — `wishlists` table already has proper RLS for authenticated users. `collections` and `products` are publicly readable.

