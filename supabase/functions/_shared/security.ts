/**
 * Shared security utilities for edge functions.
 * Rate limiting, input validation, auth helpers.
 */

// ─── Rate Limiting (in-memory, per-function instance) ──────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export interface RateLimitConfig {
  windowMs: number;   // Time window in milliseconds
  maxRequests: number; // Max requests per window
}

const DEFAULT_RATE_LIMIT: RateLimitConfig = { windowMs: 60_000, maxRequests: 60 };

export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = DEFAULT_RATE_LIMIT
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const key = identifier;
  const entry = rateLimitMap.get(key);

  if (!entry || now >= entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + config.windowMs });
    return { allowed: true, remaining: config.maxRequests - 1, resetAt: now + config.windowMs };
  }

  entry.count += 1;
  if (entry.count > config.maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  return { allowed: true, remaining: config.maxRequests - entry.count, resetAt: entry.resetAt };
}

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap) {
    if (now >= entry.resetAt) rateLimitMap.delete(key);
  }
}, 60_000);

// ─── Input Sanitization ──────────────────────────────────────
export function sanitizeString(input: unknown, maxLength = 500): string {
  if (typeof input !== 'string') return '';
  return input
    .trim()
    .slice(0, maxLength)
    .replace(/[<>]/g, ''); // Strip angle brackets to prevent XSS
}

export function sanitizeInt(input: unknown, min = 0, max = 99999): number {
  const num = typeof input === 'number' ? input : parseInt(String(input), 10);
  if (isNaN(num)) return min;
  return Math.max(min, Math.min(max, Math.floor(num)));
}

export function sanitizeUUID(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(input.trim()) ? input.trim().toLowerCase() : null;
}

// ─── Auth Helpers ────────────────────────────────────────────
export function getClientIP(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

export function rateLimitResponse(resetAt: number) {
  const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);
  return new Response(
    JSON.stringify({ error: 'Too many requests. Please try again later.' }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfter),
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
      },
    }
  );
}

// ─── Shipping Address Validation ─────────────────────────────
export interface ValidatedShippingAddress {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone: string;
}

export function validateShippingAddress(input: unknown): { valid: true; data: ValidatedShippingAddress } | { valid: false; error: string } {
  if (!input || typeof input !== 'object') {
    return { valid: false, error: 'Shipping address is required' };
  }

  const addr = input as Record<string, unknown>;

  const name = sanitizeString(addr.name, 100);
  const address = sanitizeString(addr.address, 300);
  const city = sanitizeString(addr.city, 100);
  const state = sanitizeString(addr.state, 100);
  const zip = sanitizeString(addr.zip, 20);
  const country = sanitizeString(addr.country, 100);
  const phone = sanitizeString(addr.phone, 20);

  if (!name) return { valid: false, error: 'Name is required' };
  if (name.length < 2) return { valid: false, error: 'Name must be at least 2 characters' };
  if (!address) return { valid: false, error: 'Address is required' };
  if (!city) return { valid: false, error: 'City is required' };
  if (!state) return { valid: false, error: 'State is required' };
  if (!zip) return { valid: false, error: 'ZIP/PIN code is required' };
  if (!country) return { valid: false, error: 'Country is required' };
  if (!phone) return { valid: false, error: 'Phone number is required' };

  // Basic phone validation (allow +, digits, spaces, dashes)
  const phoneClean = phone.replace(/[\s\-()]/g, '');
  if (!/^\+?\d{7,15}$/.test(phoneClean)) {
    return { valid: false, error: 'Invalid phone number format' };
  }

  return {
    valid: true,
    data: { name, address, city, state, zip, country, phone: phoneClean },
  };
}
