
# Complete Customer Journey — Hayaat Hijabs

## Current State Analysis
Most of the flow is **already implemented**:
- ✅ Guest cart using localStorage (`guestCartService.ts`)
- ✅ Cart merges on login (`CartContext.tsx`)
- ✅ Checkout requires auth and redirects to `/login` with return state
- ✅ UPI payment link generation in `Checkout.tsx`
- ✅ Order creation before payment redirect
- ✅ Login/Signup with state-based redirect back to checkout
- ✅ Auto-confirm email is enabled (no verification required)

## What Needs to Change

### 1. HeroSection: "Shop Now" → Login Page
Currently links to `/#featured`. Change to redirect to `/login` for new users or show products for logged-in users.

**File:** `src/components/home/HeroSection.tsx`
- Change `<Link to="/#featured">` → `<Link to="/login">`

### 2. View Collections Button (optional)
Keep as-is since browsing without login is required.

---

## Summary of Complete Flow (Already Working)

```text
Home → "Shop Now" → /login (with Create Account option)
         ↓
Browse Products (no auth needed)
         ↓
Add to Cart (localStorage for guests)
         ↓
Cart Page → "Checkout" button
         ↓
Not logged in? → Redirect to /login with return=/checkout
         ↓
After login → Return to /checkout (cart auto-merges)
         ↓
Fill shipping → Click "Pay Now"
         ↓
Order created (pending_payment) → UPI deep link opens
         ↓
/order-confirmation/:orderId
```

---

## Files to Edit

| File | Change |
|------|--------|
| `src/components/home/HeroSection.tsx` | Change "Shop Now" link from `/#featured` to `/login` |

This single change completes the requested flow. All other functionality (guest cart, checkout auth check, UPI redirect, order creation) is already implemented.
