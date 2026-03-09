import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";
import {
  checkRateLimit,
  rateLimitResponse,
  getClientIP,
  sanitizeString,
  sanitizeInt,
  sanitizeUUID,
} from "../_shared/security.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(message: string, status = 400) {
  return jsonResponse({ error: message }, status);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // ── Rate Limiting ──
  const clientIP = getClientIP(req);
  const rl = checkRateLimit(`products:${clientIP}`, { windowMs: 60_000, maxRequests: 120 });
  if (!rl.allowed) return rateLimitResponse(rl.resetAt);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const authHeader = req.headers.get("authorization");

  // For write operations, verify admin role server-side
  const isWriteMethod = ["POST", "PUT", "DELETE"].includes(req.method);

  let supabase: any;

  if (isWriteMethod) {
    // Write operations require auth and admin role
    const token = authHeader?.replace("Bearer ", "");
    if (!token) return errorResponse("Authorization required", 401);

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Server-side token verification
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) return errorResponse("Invalid or expired token", 401);

    // Server-side admin role check using the has_role function
    const { data: isAdmin } = await supabaseAdmin.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });

    if (!isAdmin) {
      return errorResponse("Forbidden: admin access required", 403);
    }

    // Stricter rate limit for admin writes
    const writeRl = checkRateLimit(`products:write:${user.id}`, { windowMs: 60_000, maxRequests: 30 });
    if (!writeRl.allowed) return rateLimitResponse(writeRl.resetAt);

    supabase = createClient(supabaseUrl, serviceRoleKey, {
      global: { headers: authHeader ? { Authorization: authHeader } : {} },
    });
  } else {
    // Read operations use service role for public data
    supabase = createClient(supabaseUrl, serviceRoleKey, {
      global: { headers: authHeader ? { Authorization: authHeader } : {} },
    });
  }

  const url = new URL(req.url);
  const pathParts = url.pathname.replace(/^\/products\/?/, "").split("/").filter(Boolean);
  const productId = pathParts[0] || null;

  // Validate productId if present
  if (productId && !sanitizeUUID(productId)) {
    return errorResponse("Invalid product ID format", 400);
  }

  try {
    switch (req.method) {
      case "GET":
        return productId ? await getProduct(supabase, productId) : await listProducts(supabase, url);
      case "POST":
        return await createProduct(supabase, req);
      case "PUT":
        if (!productId) return errorResponse("Product ID required", 400);
        return await updateProduct(supabase, productId, req);
      case "DELETE":
        if (!productId) return errorResponse("Product ID required", 400);
        return await deleteProduct(supabase, productId);
      default:
        return errorResponse("Method not allowed", 405);
    }
  } catch (err) {
    console.error("Products API error:", err);
    return errorResponse("Internal server error", 500);
  }
});

// ─── GET single product ───────────────────────────────────────
async function getProduct(supabase: any, id: string) {
  const { data, error } = await supabase
    .from("products")
    .select(`
      *,
      categories ( id, name, slug ),
      product_variants (
        *,
        product_images ( * )
      ),
      product_collections ( collection_id, collections ( id, name, slug ) )
    `)
    .eq("id", id)
    .single();

  if (error) return errorResponse(error.message, error.code === "PGRST116" ? 404 : 400);
  return jsonResponse({ data });
}

// ─── GET list with filtering, search, sorting, pagination ─────
async function listProducts(supabase: any, url: URL) {
  const page = sanitizeInt(url.searchParams.get("page") || "1", 1, 1000);
  const limit = sanitizeInt(url.searchParams.get("limit") || "12", 1, 100);
  const search = sanitizeString(url.searchParams.get("search") || "", 200);
  const categoryId = sanitizeUUID(url.searchParams.get("category_id") || "");
  const categorySlug = sanitizeString(url.searchParams.get("category") || "", 100);
  const featured = url.searchParams.get("featured");
  const minPrice = url.searchParams.get("min_price");
  const maxPrice = url.searchParams.get("max_price");
  const sortBy = sanitizeString(url.searchParams.get("sort_by") || "created_at", 50);
  const sortOrder = url.searchParams.get("sort_order") === "asc" ? true : false;
  const collectionSlug = sanitizeString(url.searchParams.get("collection") || "", 100);

  let query = supabase
    .from("products")
    .select(`
      *,
      categories ( id, name, slug ),
      product_variants (
        id, color, size, price, compare_at_price, stock_quantity, sku, is_active,
        product_images ( id, image_url, alt_text, is_primary, display_order )
      ),
      product_collections ( collection_id, collections ( id, name, slug ) )
    `, { count: "exact" });

  query = query.eq("is_active", true);

  if (search) {
    // Escape special characters to prevent injection
    const escapedSearch = search.replace(/[%_]/g, '\\$&');
    query = query.or(`name.ilike.%${escapedSearch}%,description.ilike.%${escapedSearch}%,short_description.ilike.%${escapedSearch}%`);
  }

  if (categoryId) {
    query = query.eq("category_id", categoryId);
  } else if (categorySlug) {
    const { data: cat } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", categorySlug)
      .single();
    if (cat) query = query.eq("category_id", cat.id);
  }

  if (featured === "true") {
    query = query.eq("is_featured", true);
  }

  const validSortColumns = ["created_at", "updated_at", "name"];
  const sortCol = validSortColumns.includes(sortBy) ? sortBy : "created_at";
  query = query.order(sortCol, { ascending: sortOrder });

  const from = (page - 1) * limit;
  const to = from + limit - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) return errorResponse(error.message);

  let filtered = data || [];

  if (minPrice || maxPrice) {
    const min = minPrice ? parseFloat(minPrice) : 0;
    const max = maxPrice ? parseFloat(maxPrice) : Infinity;
    if (!isNaN(min) && !isNaN(max)) {
      filtered = filtered.filter((p: any) =>
        p.product_variants?.some((v: any) => v.price >= min && v.price <= max)
      );
    }
  }

  if (collectionSlug) {
    filtered = filtered.filter((p: any) =>
      p.product_collections?.some((pc: any) => pc.collections?.slug === collectionSlug)
    );
  }

  const transformed = filtered.map((product: any) => {
    const variants = (product.product_variants || []).map((v: any) => ({
      ...v,
      images: v.product_images || [],
    }));
    const activePrices = variants.filter((v: any) => v.is_active !== false).map((v: any) => v.price).filter(Boolean);
    const lowestPrice = activePrices.length ? Math.min(...activePrices) : 0;
    const highestPrice = activePrices.length ? Math.max(...activePrices) : 0;

    let primaryImage = '/placeholder.svg';
    for (const v of variants) {
      const img = v.images?.find((i: any) => i.is_primary);
      if (img) { primaryImage = img.image_url; break; }
    }
    if (primaryImage === '/placeholder.svg' && variants[0]?.images?.[0]) {
      primaryImage = variants[0].images[0].image_url;
    }

    const { product_variants, ...rest } = product;
    return {
      ...rest,
      variants,
      lowest_price: lowestPrice,
      highest_price: highestPrice,
      primary_image: primaryImage,
    };
  });

  const totalCount = count || 0;
  const totalPages = Math.ceil(totalCount / limit);

  return jsonResponse({
    data: transformed,
    meta: { page, limit, total: totalCount, total_pages: totalPages },
  });
}

// ─── POST create product ─────────────────────────────────────
async function createProduct(supabase: any, req: Request) {
  let body: any;
  try { body = await req.json(); } catch {
    return errorResponse("Invalid JSON body");
  }

  const { variants, images, collections, ...productData } = body;

  // Validate required fields
  if (!productData.name || typeof productData.name !== 'string' || productData.name.trim().length < 1) {
    return errorResponse("Product name is required");
  }
  if (!productData.slug || typeof productData.slug !== 'string') {
    return errorResponse("Product slug is required");
  }

  // Sanitize product data
  productData.name = sanitizeString(productData.name, 200);
  productData.slug = sanitizeString(productData.slug, 200).toLowerCase().replace(/[^a-z0-9-]/g, '-');

  const { data: product, error } = await supabase
    .from("products")
    .insert(productData)
    .select()
    .single();

  if (error) return errorResponse(error.message);

  if (variants?.length) {
    const variantRows = variants.map((v: any) => ({ ...v, product_id: product.id }));
    const { data: insertedVariants, error: vErr } = await supabase
      .from("product_variants")
      .insert(variantRows)
      .select();

    if (vErr) return errorResponse(`Product created but variants failed: ${vErr.message}`);

    if (images?.length && insertedVariants?.length) {
      const imageRows = images.map((img: any) => ({
        ...img,
        variant_id: img.variant_id || insertedVariants[0].id,
      }));
      await supabase.from("product_images").insert(imageRows);
    }
  }

  if (collections?.length) {
    const collRows = collections.map((cId: string) => ({
      product_id: product.id,
      collection_id: cId,
    }));
    await supabase.from("product_collections").insert(collRows);
  }

  return jsonResponse({ data: product }, 201);
}

// ─── PUT update product ──────────────────────────────────────
async function updateProduct(supabase: any, id: string, req: Request) {
  let body: any;
  try { body = await req.json(); } catch {
    return errorResponse("Invalid JSON body");
  }

  const { variants, images, collections, ...productData } = body;

  if (productData.name) productData.name = sanitizeString(productData.name, 200);
  if (productData.slug) productData.slug = sanitizeString(productData.slug, 200).toLowerCase().replace(/[^a-z0-9-]/g, '-');

  const { data: product, error } = await supabase
    .from("products")
    .update(productData)
    .eq("id", id)
    .select()
    .single();

  if (error) return errorResponse(error.message);

  if (variants?.length) {
    for (const v of variants) {
      if (v.id) {
        await supabase.from("product_variants").update(v).eq("id", v.id);
      } else {
        await supabase.from("product_variants").insert({ ...v, product_id: id });
      }
    }
  }

  return jsonResponse({ data: product });
}

// ─── DELETE product (soft delete) ────────────────────────────
async function deleteProduct(supabase: any, id: string) {
  const { error } = await supabase
    .from("products")
    .update({ is_active: false })
    .eq("id", id);

  if (error) return errorResponse(error.message);
  return jsonResponse({ message: "Product deleted" });
}
