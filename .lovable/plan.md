

# Variant-Based Pricing Implementation Plan

## Current State Analysis

### Already Working ✅
- **ProductDetail page**: Already uses `selectedVariant.price` from `product_variants` table
- **Variant selector**: Color/size selection dynamically updates price display
- **Stock display**: Shows "Only X left" or "Out of stock" badges
- **AddToCartButton**: Already receives `variantId` and `productPrice` from selected variant

### Issues Found
1. **API response shape mismatch**: Edge function returns `product_variants` but Products.tsx expects `variants`
2. **Products.tsx helper functions**: Access `product.variants` instead of `product.product_variants`
3. **No "lowest price" logic**: Currently displays first variant price, not minimum

---

## Implementation Plan

### 1. Update Edge Function Response Shape
**File:** `supabase/functions/products/index.ts`

Transform API response to normalize variant data:
- Rename `product_variants` → `variants` in response
- Rename nested `product_images` → `images`
- Add computed `lowest_price` and `primary_image` fields to each product

### 2. Fix Products.tsx Helper Functions
**File:** `src/pages/Products.tsx`

Update helper functions to:
- Use correct property names (`product_variants` or normalized `variants`)
- Calculate lowest variant price using `Math.min()`
- Handle products with no variants gracefully

### 3. Enhance Price Display
- Show lowest price with "From ₹X" format on listing page
- Show price range if variants have different prices
- Keep ProductDetail page as-is (already working correctly)

---

## Files to Edit

| File | Changes |
|------|---------|
| `supabase/functions/products/index.ts` | Add `lowest_price` and `primary_image` computed fields to list response |
| `src/pages/Products.tsx` | Fix variant property access, use `lowest_price` from API |

---

## Technical Details

### Edge Function Enhancement
```typescript
// After fetching products, transform each product:
filtered = filtered.map((product) => {
  const variants = product.product_variants || [];
  const prices = variants.map(v => v.price).filter(Boolean);
  const lowestPrice = prices.length ? Math.min(...prices) : 0;
  const primaryVariant = variants[0];
  const primaryImage = primaryVariant?.product_images?.find(i => i.is_primary)?.image_url 
    || primaryVariant?.product_images?.[0]?.image_url;
  
  return {
    ...product,
    variants, // alias for frontend
    lowest_price: lowestPrice,
    primary_image: primaryImage || '/placeholder.svg'
  };
});
```

### Products.tsx Updates
- Use `product.lowest_price` directly from API
- Use `product.primary_image` for card thumbnail
- Keep `AddToCartButton` using first variant (user can select variant on detail page)

