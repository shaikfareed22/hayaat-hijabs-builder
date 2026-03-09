import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.98.0'
import { corsHeaders } from '../_shared/cors.ts'
import {
  checkRateLimit,
  rateLimitResponse,
  getClientIP,
  validateShippingAddress,
  sanitizeUUID,
} from '../_shared/security.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // ── Rate Limiting ──
    const clientIP = getClientIP(req)
    const rl = checkRateLimit(`orders:${clientIP}`, { windowMs: 60_000, maxRequests: 30 })
    if (!rl.allowed) return rateLimitResponse(rl.resetAt)

    // ── Auth ──
    const authToken = req.headers.get('Authorization')?.replace('Bearer ', '')
    if (!authToken) {
      return Response.json(
        { error: 'Authorization header required' },
        { status: 401, headers: corsHeaders }
      )
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Verify token server-side using admin client (not trusting client JWT)
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(authToken)
    if (userError || !user) {
      return Response.json(
        { error: 'Invalid or expired token' },
        { status: 401, headers: corsHeaders }
      )
    }

    // Stricter rate limit per user for write operations
    if (req.method === 'POST') {
      const userRl = checkRateLimit(`orders:create:${user.id}`, { windowMs: 60_000, maxRequests: 5 })
      if (!userRl.allowed) return rateLimitResponse(userRl.resetAt)
    }

    // Create user-scoped client
    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: `Bearer ${authToken}` } }
    })

    const url = new URL(req.url)
    const orderId = url.searchParams.get('order_id')

    switch (req.method) {
      case 'POST': {
        let body: unknown
        try {
          body = await req.json()
        } catch {
          return Response.json({ error: 'Invalid JSON body' }, { status: 400, headers: corsHeaders })
        }

        const addrResult = validateShippingAddress((body as any)?.shipping_address)
        if (!addrResult.valid) {
          return Response.json({ error: addrResult.error }, { status: 400, headers: corsHeaders })
        }

        const shipping_address = addrResult.data

        // Fetch cart items with SERVER-SIDE price lookup (prevents price manipulation)
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

        if (cartError) {
          return Response.json({ error: 'Failed to fetch cart' }, { status: 500, headers: corsHeaders })
        }

        if (!cartItems || cartItems.length === 0) {
          return Response.json({ error: 'Cart is empty' }, { status: 400, headers: corsHeaders })
        }

        // Validate each item: stock, active status, and calculate total SERVER-SIDE
        let totalPrice = 0
        for (const item of cartItems) {
          const variant = item.product_variants as any
          if (!variant) {
            return Response.json(
              { error: `Product variant not found` },
              { status: 400, headers: corsHeaders }
            )
          }
          if (!variant.is_active || !variant.products?.is_active) {
            return Response.json(
              { error: `"${variant.products?.name || 'Product'}" is no longer available` },
              { status: 400, headers: corsHeaders }
            )
          }
          if ((variant.stock_quantity || 0) < item.quantity) {
            return Response.json(
              { error: `Insufficient stock for "${variant.products?.name || 'product'}" (available: ${variant.stock_quantity})` },
              { status: 400, headers: corsHeaders }
            )
          }
          if (item.quantity < 1 || item.quantity > 100) {
            return Response.json(
              { error: `Invalid quantity for "${variant.products?.name || 'product'}"` },
              { status: 400, headers: corsHeaders }
            )
          }

          // CRITICAL: Price is from DB, NOT from client
          totalPrice += Number(variant.price) * item.quantity
        }

        // Sanity check
        if (totalPrice <= 0 || !isFinite(totalPrice)) {
          return Response.json({ error: 'Invalid order total' }, { status: 400, headers: corsHeaders })
        }

        // Create order using admin client
        const { data: order, error: orderError } = await supabaseAdmin
          .from('orders')
          .insert({
            user_id: user.id,
            total_price: totalPrice,
            shipping_address,
            order_status: 'pending',
            payment_status: 'pending'
          })
          .select('id, created_at, total_price, order_status, payment_status')
          .single()

        if (orderError) {
          console.error('Order creation error:', orderError)
          return Response.json({ error: 'Failed to create order' }, { status: 500, headers: corsHeaders })
        }

        // Create order items with SERVER-SIDE prices
        const orderItems = cartItems.map(item => ({
          order_id: order.id,
          product_id: item.product_id,
          variant_id: item.variant_id,
          quantity: item.quantity,
          price: Number((item.product_variants as any).price) // Price from DB
        }))

        const { error: itemsError } = await supabaseAdmin
          .from('order_items')
          .insert(orderItems)

        if (itemsError) {
          await supabaseAdmin.from('orders').delete().eq('id', order.id)
          return Response.json({ error: 'Failed to create order items' }, { status: 500, headers: corsHeaders })
        }

        // Clear cart
        await supabaseUser.from('cart_items').delete().eq('user_id', user.id)

        return Response.json({
          data: order,
          message: 'Order created successfully'
        }, { headers: corsHeaders })
      }

      case 'GET': {
        // Validate orderId if provided
        if (orderId) {
          const cleanId = sanitizeUUID(orderId)
          if (!cleanId) {
            return Response.json({ error: 'Invalid order ID' }, { status: 400, headers: corsHeaders })
          }

          const { data: order, error } = await supabaseUser
            .from('orders')
            .select(`
              *,
              order_items (
                id, quantity, price,
                product_variants (
                  id, color, size,
                  products (
                    id, name,
                    product_images ( image_url, alt_text, is_primary )
                  )
                )
              )
            `)
            .eq('id', cleanId)
            .eq('user_id', user.id)
            .single()

          if (error) {
            return Response.json({ error: 'Order not found' }, { status: 404, headers: corsHeaders })
          }
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
                  products (
                    id, name,
                    product_images ( image_url, alt_text, is_primary )
                  )
                )
              )
            `)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(50)

          if (error) {
            return Response.json({ error: 'Failed to fetch orders' }, { status: 500, headers: corsHeaders })
          }
          return Response.json({ data: orders }, { headers: corsHeaders })
        }
      }

      default:
        return Response.json({ error: 'Method not allowed' }, { status: 405, headers: corsHeaders })
    }
  } catch (error) {
    console.error('Orders function error:', error)
    return Response.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    )
  }
})
