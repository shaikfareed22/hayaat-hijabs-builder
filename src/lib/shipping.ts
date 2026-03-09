/**
 * Shipping calculation rules for Hayaat Hijabs.
 * Free shipping for orders ≥ ₹999, otherwise ₹60.
 */

const FREE_SHIPPING_THRESHOLD = 999;
const STANDARD_SHIPPING_RATE = 60;

export function calculateShipping(subtotal: number): number {
  if (subtotal >= FREE_SHIPPING_THRESHOLD) return 0;
  return STANDARD_SHIPPING_RATE;
}

export function getFreeShippingThreshold(): number {
  return FREE_SHIPPING_THRESHOLD;
}

export function getShippingLabel(shippingAmount: number): string {
  return shippingAmount === 0 ? 'FREE' : `₹${shippingAmount.toFixed(2)}`;
}
