import { supabase } from "@/integrations/supabase/client";

export interface ShippingAddress {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone: string;
}

export interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  product_variants: {
    id: string;
    color: string;
    size: string | null;
    products: {
      id: string;
      name: string;
      product_images: Array<{
        image_url: string;
        alt_text: string | null;
        is_primary: boolean | null;
      }>;
    };
  };
}

export interface Order {
  id: string;
  user_id: string;
  total_price: number;
  shipping_address: ShippingAddress;
  order_status: string | null;
  payment_status: string | null;
  created_at: string | null;
  updated_at: string | null;
  order_items?: OrderItem[];
}

export interface CreateOrderRequest {
  shipping_address: ShippingAddress;
}

export interface OrdersResponse {
  data: Order[];
}

export interface OrderResponse {
  data: Order;
}

class OrderService {
  private async makeRequest<T>(
    method: string,
    endpoint: string = '',
    body?: any
  ): Promise<T> {
    const { data: session } = await supabase.auth.getSession();
    
    if (!session?.session?.access_token) {
      throw new Error('User must be authenticated to access orders');
    }

    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/orders${endpoint}`;
    
    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${session.session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Network error' }));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async createOrder(shippingAddress: ShippingAddress): Promise<{ data: Order; message: string }> {
    return this.makeRequest<{ data: Order; message: string }>('POST', '', {
      shipping_address: shippingAddress,
    });
  }

  async getOrders(): Promise<OrdersResponse> {
    return this.makeRequest<OrdersResponse>('GET');
  }

  async getOrder(orderId: string): Promise<OrderResponse> {
    return this.makeRequest<OrderResponse>('GET', `?order_id=${orderId}`);
  }
}

export const orderService = new OrderService();