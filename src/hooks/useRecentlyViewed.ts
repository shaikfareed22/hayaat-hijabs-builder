import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const STORAGE_KEY = 'hayaat_recently_viewed';
const MAX_ITEMS = 10;

interface RecentProduct {
  id: string;
  name: string;
  slug: string;
  product_variants: Array<{
    id: string;
    price: number;
    color: string;
    size: string | null;
    stock_quantity: number | null;
    product_images: Array<{
      image_url: string;
      alt_text: string | null;
      is_primary: boolean | null;
    }>;
  }>;
}

export function useRecentlyViewed(excludeId?: string) {
  const [products, setProducts] = useState<RecentProduct[]>([]);

  useEffect(() => {
    const ids = getRecentIds().filter(id => id !== excludeId).slice(0, 6);
    if (ids.length === 0) return;

    supabase
      .from('products')
      .select('id, name, slug, product_variants(id, price, color, size, stock_quantity, product_images(image_url, alt_text, is_primary))')
      .in('id', ids)
      .eq('is_active', true)
      .then(({ data }) => {
        if (data) {
          // Maintain order from localStorage
          const sorted = ids.map(id => data.find((p: any) => p.id === id)).filter(Boolean) as RecentProduct[];
          setProducts(sorted);
        }
      });
  }, [excludeId]);

  return products;
}

export function addToRecentlyViewed(productId: string) {
  const ids = getRecentIds();
  const filtered = ids.filter(id => id !== productId);
  filtered.unshift(productId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered.slice(0, MAX_ITEMS)));
}

function getRecentIds(): string[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}
