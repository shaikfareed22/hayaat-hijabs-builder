// Guest cart service using localStorage

const GUEST_CART_KEY = 'hayaat_guest_cart';

export interface GuestCartItem {
  id: string; // product_id + variant_id combined
  product_id: string;
  variant_id: string;
  name: string;
  price: number;
  quantity: number;
  image_url: string;
  color: string;
  size: string | null;
}

export interface GuestCart {
  items: GuestCartItem[];
  itemCount: number;
  subtotal: string;
}

class GuestCartService {
  private getCart(): GuestCartItem[] {
    try {
      const cart = localStorage.getItem(GUEST_CART_KEY);
      return cart ? JSON.parse(cart) : [];
    } catch {
      return [];
    }
  }

  private saveCart(items: GuestCartItem[]): void {
    localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
  }

  getGuestCart(): GuestCart {
    const items = this.getCart();
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2);
    
    return { items, itemCount, subtotal };
  }

  addToCart(item: Omit<GuestCartItem, 'id'>): GuestCart {
    const items = this.getCart();
    const id = `${item.product_id}_${item.variant_id}`;
    const existingIndex = items.findIndex(i => i.id === id);

    if (existingIndex >= 0) {
      items[existingIndex].quantity += item.quantity || 1;
    } else {
      items.push({ ...item, id, quantity: item.quantity || 1 });
    }

    this.saveCart(items);
    return this.getGuestCart();
  }

  updateQuantity(id: string, quantity: number): GuestCart {
    const items = this.getCart();
    const index = items.findIndex(i => i.id === id);
    
    if (index >= 0) {
      if (quantity <= 0) {
        items.splice(index, 1);
      } else {
        items[index].quantity = quantity;
      }
      this.saveCart(items);
    }
    
    return this.getGuestCart();
  }

  removeFromCart(id: string): GuestCart {
    const items = this.getCart().filter(i => i.id !== id);
    this.saveCart(items);
    return this.getGuestCart();
  }

  clearCart(): void {
    localStorage.removeItem(GUEST_CART_KEY);
  }

  hasItems(): boolean {
    return this.getCart().length > 0;
  }
}

export const guestCartService = new GuestCartService();
