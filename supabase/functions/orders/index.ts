import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.98.0'
import { corsHeaders } from '../_shared/cors.ts'
import {
  checkRateLimit,
  rateLimitResponse,
  getClientIP,
  validateShippingAddress,
  sanitizeUUID,
  sanitizeString,
} from '../_shared/security.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const clientIP = getClientIP(req)
    const rl = checkRateLimit(`orders:${clientIP}`, { windowMs: 60_000, maxRequests: 30 })
    if (!rl.allowed) return rateLimitResponse(rl.resetAt)

    const authToken = req.headers.get('Authorization')?.replace('Bearer ', '')
    if (!authToken) {
      return Response.json({ error: 'Authorization header required' }, { status: 401, headers: corsHeaders })
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(authToken)
    if (userError || !user) {
      return Response.json({ error: 'Invalid or expired token' }, { status: 401, headers: corsHeaders })
    }

    if (req.method === 'POST') {
      const userRl = checkRateLimit(`orders:create:${user.id}`, { windowMs: 60_000, maxRequests: 5 })
      if (!userRl.allowed) return rateLimitResponse(userRl.resetAt)
    }

    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: `Bearer ${authToken}` } }
    })

    const url = new URL(req.url)
    const orderId = url.searchParams.get('order_id')

    switch (req.method) {
      case 'POST': {
        let body: any
        try { body = await req.json() } catch {
          return Response.json({ error: 'Invalid JSON body' }, { status: 400, headers: corsHeaders })
        }

        const addrResult = validateShippingAddress(body?.shipping_address)
        if (!addrResult.valid) {
          return Response.json({ error: addrResult.error }, { status: 400, headers: corsHeaders })
        }
        const shipping_address = addrResult.data

        // Fetch cart items with SERVER-SIDE price lookup
        const { data: cartItems, error: cartError } = await supabaseUser
          .from('cart_items')
          .select(`
            id, quantity, product_id, variant_id,
            product_variants (
              id, price, stock_quantity, is_active,
              products ( id, name, is_active )
            )
          `)
          .eq('user_id', user.id)

        if (cartError) return Response.json({ error: 'Failed to fetch cart' }, { status: 500, headers: corsHeaders })
        if (!cartItems || cartItems.length === 0) return Response.json({ error: 'Cart is empty' }, { status: 400, headers: corsHeaders })

        let subtotal = 0
        for (const item of cartItems) {
          const variant = item.product_variants as any
          if (!variant) return Response.json({ error: 'Product variant not found' }, { status: 400, headers: corsHeaders })
          if (!variant.is_active || !variant.products?.is_active) {
            return Response.json({ error: `"${variant.products?.name || 'Product'}" is no longer available` }, { status: 400, headers: corsHeaders })
          }
          if ((variant.stock_quantity || 0) < item.quantity) {
            return Response.json({ error: `Insufficient stock for "${variant.products?.name || 'product'}" (available: ${variant.stock_quantity})` }, { status: 400, headers: corsHeaders })
          }
          if (item.quantity < 1 || item.quantity > 100) {
            return Response.json({ error: `Invalid quantity for "${variant.products?.name || 'product'}"` }, { status: 400, headers: corsHeaders })
          }
          subtotal += Number(variant.price) * item.quantity
        }

        if (subtotal <= 0 || !isFinite(subtotal)) {
          return Response.json({ error: 'Invalid order total' }, { status: 400, headers: corsHeaders })
        }

        // Shipping calculation
        const shipping_amount = subtotal >= 999 ? 0 : 60

        // Coupon validation (optional)
        let coupon_id: string | null = null
        let discount_amount = 0
        const coupon_code = sanitizeString(body?.coupon_code, 50)?.toUpperCase()

        if (coupon_code) {
          const { data: coupon, error: couponErr } = await supabaseAdmin
            .from('coupons')
            .select('*')
            .eq('code', coupon_code)
            .eq('is_active', true)
            .single()

          if (couponErr || !coupon) {
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

          if (coupon.discount_type === 'percentage') {
            discount_amount = Math.round((subtotal * Number(coupon.discount_value) / 100) * 100) / 100
          } else {
            discount_amount = Math.min(Number(coupon.discount_value), subtotal)
          }
          coupon_id = coupon.id
        }

        const totalPrice = Math.max(0, subtotal + shipping_amount - discount_amount)

        // Create order
        const { data: order, error: orderError } = await supabaseAdmin
          .from('orders')
          .insert({
            user_id: user.id,
            total_price: totalPrice,
            shipping_address,
            order_status: 'pending',
            payment_status: 'pending',
            shipping_amount,
            discount_amount,
            coupon_id,
          })
          .select('id, created_at, total_price, order_status, payment_status')
          .single()

        if (orderError) {
          console.error('Order creation error:', orderError)
          return Response.json({ error: 'Failed to create order' }, { status: 500, headers: corsHeaders })
        }

        // Create order items
        const orderItems = cartItems.map(item => ({
          order_id: order.id,
          product_id: item.product_id,
          variant_id: item.variant_id,
          quantity: item.quantity,
          price: Number((item.product_variants as any).price),
        }))

        const { error: itemsError } = await supabaseAdmin.from('order_items').insert(orderItems)
        if (itemsError) {
          await supabaseAdmin.from('orders').delete().eq('id', order.id)
          return Response.json({ error: 'Failed to create order items' }, { status: 500, headers: corsHeaders })
        }

        // Increment coupon used_count
        if (coupon_id) {
          const { data: currentCoupon } = await supabaseAdmin.from('coupons').select('used_count').eq('id', coupon_id).single()
          if (currentCoupon) {
            await supabaseAdmin.from('coupons').update({ used_count: (currentCoupon.used_count || 0) + 1 }).eq('id', coupon_id)
          }
        }

        // Clear cart
        await supabaseUser.from('cart_items').delete().eq('user_id', user.id)

        return Response.json({ data: order, message: 'Order created successfully' }, { headers: corsHeaders })
      }

      case 'GET': {
        if (orderId) {
          const cleanId = sanitizeUUID(orderId)
          if (!cleanId) return Response.json({ error: 'Invalid order ID' }, { status: 400, headers: corsHeaders })

          const { data: order, error } = await supabaseUser
            .from('orders')
            .select(`
              *,
              order_items (
                id, quantity, price,
                product_variants (
                  id, color, size,
                  products ( id, name ),
                  product_images ( image_url, alt_text, is_primary )
                )
              )
            `)
            .eq('id', cleanId)
            .eq('user_id', user.id)
            .single()

          if (error) return Response.json({ error: 'Order not found' }, { status: 404, headers: corsHeaders })
          return Response.json({ data: order }, { headers: corsHeaders })
        } else {
          const { data: orders, error } = await supabaseUser
            .from('orders')
            .select(`
              *,
              order_items (
                id, quantity, price,
                product_variants (
                  id, color, size,
                  products ( id, name ),
                  product_images ( image_url, alt_text, is_primary )
                )
              )
            `)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(50)

          if (error) return Response.json({ error: 'Failed to fetch orders' }, { status: 500, headers: corsHeaders })
          return Response.json({ data: orders }, { headers: corsHeaders })
        }
      }

      default:
        return Response.json({ error: 'Method not allowed' }, { status: 405, headers: corsHeaders })
    }
  } catch (error) {
    console.error('Orders function error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders })
  }
})
