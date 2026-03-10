

## Assessment: Nearly Everything Is Already Built

After reviewing all relevant files, here's what's already working:

| Feature | Status |
|---------|--------|
| Navbar auth (Login vs Account/Logout) | Already implemented correctly |
| Guest cart (localStorage) | Already implemented |
| Cart merge on login | Already implemented |
| Checkout auth redirect | Already implemented (ProtectedRoute) |
| Wishlist persistence (DB) | Already implemented |
| Account profile page | Already implemented |
| user_profiles table with RLS | Already exists |
| Cart UI (image, qty, remove) | Already implemented |
| Wishlist UI (image, add to cart, remove) | Already implemented |
| Redirect flow (guest → login → checkout) | Already implemented |
| Error handling (loading, empty states) | Already implemented |

### What Actually Needs Fixing

Only **two minor issues** remain:

1. **Navbar banner text** says "Free shipping on orders over $75" but the app uses INR with a ₹999 threshold. Should say "Free shipping on orders over ₹999".

2. **Navbar "Login" button appearance** — when logged out, the navbar shows a bare `User` icon linking to `/login` on desktop (line 129-135). This is ambiguous. Should show a visible **"Login" text button** instead of just an icon, so guests clearly understand they're not logged in.

### Plan

**File: `src/components/layout/Navbar.tsx`**
- Line 51: Change banner text from `$75` to `₹999`
- Lines 129-134: Replace the bare `User` icon with a `Button` that says "Login" for clearer UX

That's it. Everything else described in the request is already fully functional in the codebase.

