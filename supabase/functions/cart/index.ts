import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Authenticate user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: claims, error: authError } = await supabaseClient.auth.getClaims(token)
    if (authError || !claims?.sub) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const userId = claims.sub
    const { method } = req

    if (method === 'GET') {
      // Fetch user's cart items with product and variant details
      const { data: cartItems, error } = await supabaseClient
        .from('cart_items')
        .select(`
          *,
          product_variants (
            *,
            products (
              id,
              name,
              slug,
              short_description,
              product_images (
                image_url,
                alt_text,
                is_primary
              )
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

      // Calculate totals
      const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0)
      const subtotal = cartItems.reduce((sum, item) => 
        sum + (item.quantity * parseFloat(item.product_variants.price))
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
      // Add item to cart or update quantity if exists
      const { product_id, variant_id, quantity = 1 } = await req.json()

      if (!product_id || !variant_id) {
        return new Response(JSON.stringify({ error: 'product_id and variant_id are required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Check if item already exists in cart
      const { data: existingItem } = await supabaseClient
        .from('cart_items')
        .select('*')
        .eq('user_id', userId)
        .eq('product_id', product_id)
        .eq('variant_id', variant_id)
        .single()

      if (existingItem) {
        // Update existing item quantity
        const { data, error } = await supabaseClient
          .from('cart_items')
          .update({ quantity: existingItem.quantity + quantity })
          .eq('id', existingItem.id)
          .select()
          .single()

        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        return new Response(JSON.stringify({ data, message: 'Cart updated' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      } else {
        // Create new cart item
        const { data, error } = await supabaseClient
          .from('cart_items')
          .insert({
            user_id: userId,
            product_id,
            variant_id,
            quantity
          })
          .select()
          .single()

        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        return new Response(JSON.stringify({ data, message: 'Item added to cart' }), {
          status: 201,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    if (method === 'PUT') {
      // Update item quantity
      const { cart_item_id, quantity } = await req.json()

      if (!cart_item_id || quantity === undefined) {
        return new Response(JSON.stringify({ error: 'cart_item_id and quantity are required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      if (quantity <= 0) {
        return new Response(JSON.stringify({ error: 'Quantity must be greater than 0' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const { data, error } = await supabaseClient
        .from('cart_items')
        .update({ quantity })
        .eq('id', cart_item_id)
        .eq('user_id', userId) // Ensure user owns this cart item
        .select()
        .single()

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      return new Response(JSON.stringify({ data, message: 'Cart item updated' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (method === 'DELETE') {
      // Remove item from cart
      const { cart_item_id } = await req.json()

      if (!cart_item_id) {
        return new Response(JSON.stringify({ error: 'cart_item_id is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const { data, error } = await supabaseClient
        .from('cart_items')
        .delete()
        .eq('id', cart_item_id)
        .eq('user_id', userId) // Ensure user owns this cart item
        .select()

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      return new Response(JSON.stringify({ data, message: 'Item removed from cart' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error in cart function:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})