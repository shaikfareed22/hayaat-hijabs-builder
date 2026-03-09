import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.98.0'
import { corsHeaders } from '../_shared/cors.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

interface ShippingAddress {
  name: string
  address: string
  city: string
  state: string
  zip: string
  country: string
  phone: string
}

interface CreateOrderRequest {
  shipping_address: ShippingAddress
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Get auth token from request
    const authToken = req.headers.get('Authorization')?.replace('Bearer ', '')
    if (!authToken) {
      return Response.json(
        { error: 'Authorization header required' },
        { status: 401, headers: corsHeaders }
      )
    }

    // Create client with service role for admin operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Create client with user token for user operations  
    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: `Bearer ${authToken}` } }
    })

    // Get user from token
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser(authToken)
    if (userError || !user) {
      return Response.json(
        { error: 'Invalid token' },
        { status: 401, headers: corsHeaders }
      )
    }

    const url = new URL(req.url)
    const orderId = url.searchParams.get('order_id')

    // Handle different HTTP methods
    switch (req.method) {
      case 'POST': {
        const { shipping_address }: CreateOrderRequest = await req.json()

        if (!shipping_address || !shipping_address.name || !shipping_address.address) {
          return Response.json(
            { error: 'Valid shipping address is required' },
            { status: 400, headers: corsHeaders }
          )
        }

        // Start transaction by fetching user's cart
        const { data: cartItems, error: cartError } = await supabaseUser
          .from('cart_items')
          .select(`
            id,
            quantity,
            product_id,
            variant_id,
            product_variants (
              id,
              price,
              stock_quantity,
              products (
                id,
                name
              )
            )
          `)
          .eq('user_id', user.id)

        if (cartError) {
          return Response.json(
            { error: 'Failed to fetch cart' },
            { status: 500, headers: corsHeaders }
          )
        }

        if (!cartItems || cartItems.length === 0) {
          return Response.json(
            { error: 'Cart is empty' },
            { status: 400, headers: corsHeaders }
          )
        }

        // Validate stock and calculate total
        let totalPrice = 0
        for (const item of cartItems) {
          const variant = item.product_variants
          if (!variant || variant.stock_quantity < item.quantity) {
            return Response.json(
              { error: `Insufficient stock for ${variant?.products?.name || 'product'}` },
              { status: 400, headers: corsHeaders }
            )
          }
          totalPrice += variant.price * item.quantity
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
          return Response.json(
            { error: 'Failed to create order' },
            { status: 500, headers: corsHeaders }
          )
        }

        // Create order items using admin client
        const orderItems = cartItems.map(item => ({
          order_id: order.id,
          product_id: item.product_id,
          variant_id: item.variant_id,
          quantity: item.quantity,
          price: item.product_variants.price
        }))

        const { error: itemsError } = await supabaseAdmin
          .from('order_items')
          .insert(orderItems)

        if (itemsError) {
          // Rollback: delete the order if items creation failed
          await supabaseAdmin.from('orders').delete().eq('id', order.id)
          return Response.json(
            { error: 'Failed to create order items' },
            { status: 500, headers: corsHeaders }
          )
        }

        // Clear user's cart using user client
        const { error: clearCartError } = await supabaseUser
          .from('cart_items')
          .delete()
          .eq('user_id', user.id)

        if (clearCartError) {
          console.warn('Failed to clear cart:', clearCartError)
          // Don't fail the order creation if cart clearing fails
        }

        return Response.json({
          data: order,
          message: 'Order created successfully'
        }, { headers: corsHeaders })
      }

      case 'GET': {
        if (orderId) {
          // Get single order with items
          const { data: order, error } = await supabaseUser
            .from('orders')
            .select(`
              *,
              order_items (
                id,
                quantity,
                price,
                product_variants (
                  id,
                  color,
                  size,
                  products (
                    id,
                    name,
                    product_images (
                      image_url,
                      alt_text,
                      is_primary
                    )
                  )
                )
              )
            `)
            .eq('id', orderId)
            .eq('user_id', user.id)
            .single()

          if (error) {
            return Response.json(
              { error: 'Order not found' },
              { status: 404, headers: corsHeaders }
            )
          }

          return Response.json({ data: order }, { headers: corsHeaders })
        } else {
          // Get all user orders
          const { data: orders, error } = await supabaseUser
            .from('orders')
            .select(`
              *,
              order_items (
                id,
                quantity,
                price,
                product_variants (
                  id,
                  color,
                  size,
                  products (
                    id,
                    name,
                    product_images (
                      image_url,
                      alt_text,
                      is_primary
                    )
                  )
                )
              )
            `)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })

          if (error) {
            return Response.json(
              { error: 'Failed to fetch orders' },
              { status: 500, headers: corsHeaders }
            )
          }

          return Response.json({ data: orders }, { headers: corsHeaders })
        }
      }

      default:
        return Response.json(
          { error: 'Method not allowed' },
          { status: 405, headers: corsHeaders }
        )
    }
  } catch (error) {
    console.error('Orders function error:', error)
    return Response.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    )
  }
})