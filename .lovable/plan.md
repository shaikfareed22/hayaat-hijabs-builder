

# Authentication Implementation for Hayaat Hijabs

**Note**: This is a React + Vite project (not Next.js), so the implementation will use React Router for routing and Supabase JS client directly for auth.

## Database Changes

**Migration**: Create a trigger to auto-create `user_profiles` on signup, and add a SELECT policy so the trigger function can insert:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, email, role)
  VALUES (NEW.id, NEW.email, 'customer');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

## New Files to Create

### 1. Auth Context (`src/contexts/AuthContext.tsx`)
- Provides `user`, `session`, `profile`, `loading`, `signUp`, `signIn`, `signOut`, `resetPassword`
- Uses `onAuthStateChange` listener (set up before `getSession`)
- Fetches `user_profiles` to get role after auth state change

### 2. Route Guard (`src/components/auth/ProtectedRoute.tsx`)
- Wraps private routes; redirects to `/login` if unauthenticated
- Optional `requiredRole` prop for admin-only routes
- Shows loading spinner while checking auth

### 3. Auth Pages
- **`src/pages/Login.tsx`** — Email/password login form, link to signup and forgot password. Redirects to `/account` (or `/admin` if admin role) on success.
- **`src/pages/Signup.tsx`** — Email/password/name signup form. Shows "check your email" message after signup.
- **`src/pages/ResetPassword.tsx`** — Two modes: (1) enter email to request reset link, (2) enter new password when arriving via recovery link (`type=recovery` in URL hash).
- **`src/pages/Account.tsx`** — Protected. Shows profile info (name, email), allows editing profile fields, logout button.
- **`src/pages/Orders.tsx`** — Protected. Lists user's orders from `orders` table.
- **`src/pages/Admin.tsx`** — Protected with `requiredRole="admin"`. Placeholder admin dashboard.
- **`src/pages/Checkout.tsx`** — Protected. Placeholder checkout page.

### 4. Updated Files
- **`src/App.tsx`** — Wrap with `AuthProvider`, add routes for `/login`, `/signup`, `/reset-password`, `/account`, `/orders`, `/admin`, `/checkout`. Protected routes use `ProtectedRoute` wrapper.
- **`src/components/layout/Navbar.tsx`** — Show Login/Signup when logged out; show Account/Logout when logged in. Show Admin link if user has admin role.

## Route Protection Map

| Route | Access |
|-------|--------|
| `/login`, `/signup`, `/reset-password` | Public (redirect to `/account` if already logged in) |
| `/account`, `/orders`, `/checkout` | Authenticated users only |
| `/admin` | Admin role only |
| `/`, `/shop`, `/collections`, etc. | Public |

## Technical Details
- All auth pages use existing shadcn/ui components (Card, Input, Button, Form)
- Password reset uses `supabase.auth.resetPasswordForEmail()` with `redirectTo` pointing to `/reset-password`
- Recovery handling checks URL hash for `type=recovery` event via `onAuthStateChange`
- Role checking uses the existing `has_role()` database function for RLS, and client-side profile fetch for UI routing

