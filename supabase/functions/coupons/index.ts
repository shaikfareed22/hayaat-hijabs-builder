import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.98.0'
import { corsHeaders } from '../_shared/cors.ts'
import { checkRateLimit, rateLimitResponse, getClientIP, sanitizeString } from '../_shared/security.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const clientIP = getClientIP(req)
    const rl = checkRateLimit(`coupons:${clientIP}`, { windowMs: 60_000, maxRequests: 30 })
    if (!rl.allowed) return rateLimitResponse(rl.resetAt)

    const authToken = req.headers.get('Authorization')?.replace('Bearer ', '')
    if (!authToken) {
      return Response.json({ error: 'Authorization required' }, { status: 401, headers: corsHeaders })
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(authToken)
    if (userError || !user) {
      return Response.json({ error: 'Invalid token' }, { status: 401, headers: corsHeaders })
    }

    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405, headers: corsHeaders })
    }

    let body: any
    try { body = await req.json() } catch {
      return Response.json({ error: 'Invalid JSON' }, { status: 400, headers: corsHeaders })
    }

    const action = body.action

    // ── Validate coupon (public for authenticated users) ──
    if (action === 'validate') {
      const code = sanitizeString(body.code, 50).toUpperCase()
      const subtotal = Number(body.subtotal)

      if (!code) return Response.json({ error: 'Coupon code is required' }, { status: 400, headers: corsHeaders })
      if (!subtotal || subtotal <= 0) return Response.json({ error: 'Invalid subtotal' }, { status: 400, headers: corsHeaders })

      const { data: coupon, error } = await supabaseAdmin
        .from('coupons')
        .select('*')
        .eq('code', code)
        .eq('is_active', true)
        .single()

      if (error || !coupon) {
        return Response.json({ error: 'Invalid coupon code' }, { status: 400, headers: corsHeaders })
      }

      if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
        return Response.json({ error: 'Coupon has expired' }, { status: 400, headers: corsHeaders })
      }

      if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) {
        return Response.json({ error: 'Coupon usage limit reached' }, { status: 400, headers: corsHeaders })
      }

      if (coupon.minimum_order_amount && subtotal < Number(coupon.minimum_order_amount)) {
        return Response.json({ error: `Minimum order amount is ₹${coupon.minimum_order_amount}` }, { status: 400, headers: corsHeaders })
      }

      let discount_amount = 0
      if (coupon.discount_type === 'percentage') {
        discount_amount = Math.round((subtotal * Number(coupon.discount_value) / 100) * 100) / 100
      } else {
        discount_amount = Math.min(Number(coupon.discount_value), subtotal)
      }

      return Response.json({
        data: {
          valid: true,
          discount_amount,
          discount_type: coupon.discount_type,
          discount_value: Number(coupon.discount_value),
          coupon_id: coupon.id,
          code: coupon.code,
        }
      }, { headers: corsHeaders })
    }

    // ── Admin CRUD ──
    const isAdmin = await supabaseAdmin.rpc('has_role', { _user_id: user.id, _role: 'admin' })
    if (!isAdmin.data) {
      return Response.json({ error: 'Admin access required' }, { status: 403, headers: corsHeaders })
    }

    if (action === 'list') {
      const { data, error } = await supabaseAdmin.from('coupons').select('*').order('created_at', { ascending: false })
      if (error) return Response.json({ error: 'Failed to fetch coupons' }, { status: 500, headers: corsHeaders })
      return Response.json({ data }, { headers: corsHeaders })
    }

    if (action === 'create') {
      const { code, discount_type, discount_value, minimum_order_amount, usage_limit, expires_at } = body
      if (!code || !discount_type || !discount_value) {
        return Response.json({ error: 'Code, discount_type, and discount_value are required' }, { status: 400, headers: corsHeaders })
      }
      if (!['percentage', 'fixed'].includes(discount_type)) {
        return Response.json({ error: 'discount_type must be percentage or fixed' }, { status: 400, headers: corsHeaders })
      }

      const { data, error } = await supabaseAdmin.from('coupons').insert({
        code: sanitizeString(code, 50).toUpperCase(),
        discount_type,
        discount_value: Number(discount_value),
        minimum_order_amount: Number(minimum_order_amount) || 0,
        usage_limit: usage_limit ? Number(usage_limit) : null,
        expires_at: expires_at || null,
      }).select().single()

      if (error) return Response.json({ error: error.message }, { status: 400, headers: corsHeaders })
      return Response.json({ data }, { headers: corsHeaders })
    }

    if (action === 'update') {
      const { id, ...updates } = body
      if (!id) return Response.json({ error: 'Coupon ID required' }, { status: 400, headers: corsHeaders })
      if (updates.code) updates.code = sanitizeString(updates.code, 50).toUpperCase()

      const { data, error } = await supabaseAdmin.from('coupons').update(updates).eq('id', id).select().single()
      if (error) return Response.json({ error: error.message }, { status: 400, headers: corsHeaders })
      return Response.json({ data }, { headers: corsHeaders })
    }

    if (action === 'delete') {
      const { id } = body
      if (!id) return Response.json({ error: 'Coupon ID required' }, { status: 400, headers: corsHeaders })
      const { error } = await supabaseAdmin.from('coupons').delete().eq('id', id)
      if (error) return Response.json({ error: error.message }, { status: 400, headers: corsHeaders })
      return Response.json({ success: true }, { headers: corsHeaders })
    }

    return Response.json({ error: 'Invalid action' }, { status: 400, headers: corsHeaders })
  } catch (error) {
    console.error('Coupons function error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders })
  }
})
