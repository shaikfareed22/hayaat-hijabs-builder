

## Add Google OAuth Sign-In

### What Changes

**Files to modify:**
1. **`src/pages/Login.tsx`** — Add a "Sign in with Google" button below the login form, using `lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin })`
2. **`src/pages/Signup.tsx`** — Add a "Sign up with Google" button below the signup form with the same OAuth call
3. **`src/contexts/AuthContext.tsx`** — No changes needed; the existing `onAuthStateChange` listener already handles OAuth sessions

### Implementation Details

- Use the **Configure Social Login tool** to generate the `src/integrations/lovable` module and install `@lovable.dev/cloud-auth-js`
- Import `lovable` from `@/integrations/lovable/index` in Login and Signup pages
- Add a visual separator ("or") between the email form and the Google button
- The Google button uses an outlined style with a Google icon (from lucide or inline SVG)
- On success, the auth state listener picks up the session automatically and redirects to the intended page
- No additional Supabase or Google Cloud Console configuration required — Lovable Cloud manages this automatically

### UI Layout (both pages)

```text
┌─────────────────────────┐
│       Sign In           │
│  Welcome back to ...    │
│                         │
│  [Email field]          │
│  [Password field]       │
│  [Login button]         │
│                         │
│  ──── or continue ────  │
│                         │
│  [G  Sign in with Google]│
│                         │
│  Don't have an account? │
└─────────────────────────┘
```

