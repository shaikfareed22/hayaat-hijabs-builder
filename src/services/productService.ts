import { supabase } from "@/integrations/supabase/client";

export interface ProductFilters {
  search?: string;
  category?: string;
  category_id?: string;
  collection?: string;
  featured?: boolean;
  min_price?: number;
  max_price?: number;
  sort_by?: "created_at" | "updated_at" | "name";
  sort_order?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface ProductMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface ProductListResponse {
  data: any[];
  meta: ProductMeta;
}

export const productService = {
  /** GET /products — list with filters */
  async list(filters: ProductFilters = {}): Promise<ProductListResponse> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") params.set(k, String(v));
    });

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    // Get session without blocking - use cached value
    let authHeader: string | undefined;
    try {
      const { data } = await supabase.auth.getSession();
      authHeader = data.session?.access_token ? `Bearer ${data.session.access_token}` : undefined;
    } catch {
      // Continue without auth for public product listing
    }

    const res = await fetch(
      `${supabaseUrl}/functions/v1/products?${params.toString()}`,
      {
        headers: {
          apikey: anonKey,
          "Content-Type": "application/json",
          ...(authHeader ? { Authorization: authHeader } : {}),
        },
      }
    );

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to fetch products");
    }

    return res.json();
  },

  /** GET /products/:id — single product */
  async getById(id: string) {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const session = (await supabase.auth.getSession()).data.session;

    const res = await fetch(
      `${supabaseUrl}/functions/v1/products/${id}`,
      {
        headers: {
          apikey: anonKey,
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
      }
    );

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Product not found");
    }

    const json = await res.json();
    return json.data;
  },

  /** POST /products — create */
  async create(productData: any) {
    const { data, error } = await supabase.functions.invoke("products", {
      method: "POST",
      body: productData,
    });
    if (error) throw error;
    return data?.data;
  },

  /** PUT /products/:id — update */
  async update(id: string, productData: any) {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const session = (await supabase.auth.getSession()).data.session;

    const res = await fetch(
      `https://${projectId}.supabase.co/functions/v1/products/${id}`,
      {
        method: "PUT",
        headers: {
          apikey: anonKey,
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify(productData),
      }
    );

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to update product");
    }

    const json = await res.json();
    return json.data;
  },

  /** DELETE /products/:id — soft delete */
  async delete(id: string) {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const session = (await supabase.auth.getSession()).data.session;

    const res = await fetch(
      `https://${projectId}.supabase.co/functions/v1/products/${id}`,
      {
        method: "DELETE",
        headers: {
          apikey: anonKey,
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
      }
    );

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to delete product");
    }

    return res.json();
  },
};
