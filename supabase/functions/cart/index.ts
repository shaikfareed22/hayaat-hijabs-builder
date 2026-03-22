import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.98.0'
import {
  checkRateLimit,
  rateLimitResponse,
  getClientIP,
  sanitizeUUID,
  sanitizeInt,
} from '../_shared/security.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // ── Rate Limiting ──
    const clientIP = getClientIP(req)
    const rl = checkRateLimit(`cart:${clientIP}`, { windowMs: 60_000, maxRequests: 60 })
    if (!rl.allowed) return rateLimitResponse(rl.resetAt)

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    // ── Auth ──
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const token = authHeader.replace('Bearer ', '')

    // User-scoped client for RLS
    const supabaseClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    // Verify JWT using signing keys-compatible claims validation
    const { data: claimsData, error: authError } = await supabaseClient.auth.getClaims(token)
    if (authError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const userId = claimsData.claims.sub

    const { method } = req

    if (method === 'GET') {
      const { data: cartItems, error } = await supabaseClient
        .from('cart_items')
        .select(`
          *,
          product_variants (
            *,
            product_images ( image_url, alt_text, is_primary ),
            products (
              id, name, slug, short_description
            )
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0)
      const subtotal = cartItems.reduce((sum, item) =>
        sum + (item.total_price || item.quantity * parseFloat(item.product_variants.price))
      , 0)

      return new Response(JSON.stringify({
        items: cartItems,
        itemCount,
        subtotal: subtotal.toFixed(2)
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (method === 'POST') {
      // Stricter rate limit for writes
      const writeRl = checkRateLimit(`cart:write:${userId}`, { windowMs: 60_000, maxRequests: 30 })
      if (!writeRl.allowed) return rateLimitResponse(writeRl.resetAt)

      let body: any
      try { body = await req.json() } catch { 
        return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const product_id = sanitizeUUID(body.product_id)
      const variant_id = sanitizeUUID(body.variant_id)
      const quantity = sanitizeInt(body.quantity || 1, 1, 50)

      if (!product_id || !variant_id) {
        return new Response(JSON.stringify({ error: 'Valid product_id and variant_id are required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Verify variant exists and is active with sufficient stock
      const { data: variant, error: variantError } = await supabaseClient
        .from('product_variants')
        .select('id, price, stock_quantity, is_active, product_id')
        .eq('id', variant_id)
        .eq('product_id', product_id)
        .eq('is_active', true)
        .single()

      if (variantError || !variant) {
        return new Response(JSON.stringify({ error: 'Product variant not found or inactive' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      if ((variant.stock_quantity || 0) < quantity) {
        return new Response(JSON.stringify({ error: `Insufficient stock (available: ${variant.stock_quantity})` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Check existing cart item
      const { data: existingItem } = await supabaseClient
        .from('cart_items')
        .select('id, quantity')
        .eq('user_id', userId)
        .eq('product_id', product_id)
        .eq('variant_id', variant_id)
        .single()

      const unitPrice = parseFloat(variant.price)

      if (existingItem) {
        const newQty = Math.min(existingItem.quantity + quantity, 50)
        const { data, error } = await supabaseClient
          .from('cart_items')
          .update({ quantity: newQty, unit_price: unitPrice, total_price: unitPrice * newQty })
          .eq('id', existingItem.id)
          .select()
          .single()

        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
        return new Response(JSON.stringify({ data, message: 'Cart updated' }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      } else {
        // Limit total cart items per user
        const { count } = await supabaseClient
          .from('cart_items')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)

        if ((count || 0) >= 50) {
          return new Response(JSON.stringify({ error: 'Cart limit reached (max 50 items)' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        const { data, error } = await supabaseClient
          .from('cart_items')
          .insert({ user_id: userId, product_id, variant_id, quantity, unit_price: unitPrice, total_price: unitPrice * quantity })
          .select()
          .single()

        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
        return new Response(JSON.stringify({ data, message: 'Item added to cart' }), {
          status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    if (method === 'PUT') {
      const writeRl = checkRateLimit(`cart:write:${userId}`, { windowMs: 60_000, maxRequests: 30 })
      if (!writeRl.allowed) return rateLimitResponse(writeRl.resetAt)

      let body: any
      try { body = await req.json() } catch {
        return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const cart_item_id = sanitizeUUID(body.cart_item_id)
      const quantity = sanitizeInt(body.quantity, 1, 50)

      if (!cart_item_id) {
        return new Response(JSON.stringify({ error: 'Valid cart_item_id is required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Fetch current item to get unit_price
      const { data: currentItem } = await supabaseClient
        .from('cart_items')
        .select('unit_price')
        .eq('id', cart_item_id)
        .eq('user_id', userId)
        .single()

      const itemUnitPrice = currentItem?.unit_price || 0
      const newTotal = itemUnitPrice * quantity

      const { data, error } = await supabaseClient
        .from('cart_items')
        .update({ quantity, total_price: newTotal })
        .eq('id', cart_item_id)
        .eq('user_id', userId)
        .select()
        .single()

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      return new Response(JSON.stringify({ data, message: 'Cart item updated' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (method === 'DELETE') {
      let body: any
      try { body = await req.json() } catch {
        return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const cart_item_id = sanitizeUUID(body.cart_item_id)
      if (!cart_item_id) {
        return new Response(JSON.stringify({ error: 'Valid cart_item_id is required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const { data, error } = await supabaseClient
        .from('cart_items')
        .delete()
        .eq('id', cart_item_id)
        .eq('user_id', userId)
        .select()

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      return new Response(JSON.stringify({ data, message: 'Item removed from cart' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Error in cart function:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
