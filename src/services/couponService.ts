import { supabase } from '@/integrations/supabase/client';

export interface CouponValidation {
  valid: boolean;
  discount_amount: number;
  discount_type: string;
  discount_value: number;
  coupon_id: string;
  code: string;
  error?: string;
}

class CouponService {
  async validateCoupon(code: string, subtotal: number): Promise<CouponValidation> {
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session?.access_token) {
      throw new Error('Must be logged in to apply coupons');
    }

    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/coupons`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'validate', code, subtotal }),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Failed to validate coupon');
    }
    return result.data;
  }
}

export const couponService = new CouponService();
