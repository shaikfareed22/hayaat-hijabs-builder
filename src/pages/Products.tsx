import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useProducts } from '@/hooks/useProducts';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, SlidersHorizontal, X, ShoppingCart } from 'lucide-react';
import { AddToCartButton } from '@/components/cart/AddToCartButton';

export default function Products() {
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);

  // Fetch categories for filter
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order');
      if (error) throw error;
      return data;
    },
  });

  // Build filters object
  const filters = useMemo(() => ({
    search: search || undefined,
    category_id: categoryId !== 'all' ? categoryId : undefined,
    sort_by: sortBy as 'created_at' | 'updated_at' | 'name',
    sort_order: sortOrder,
  }), [search, categoryId, sortBy, sortOrder]);

  const { data: productsData, isLoading, error } = useProducts(filters);

  const products = productsData?.data || [];

  const clearFilters = () => {
    setSearch('');
    setCategoryId('all');
    setSortBy('created_at');
    setSortOrder('desc');
  };

  const hasActiveFilters = search || categoryId !== 'all';

  // Get primary image and price from first variant
  const getProductImage = (product: any) => {
    const variant = product.variants?.[0];
    const image = variant?.images?.find((img: any) => img.is_primary) || variant?.images?.[0];
    return image?.image_url || '/placeholder.svg';
  };

  const getProductPrice = (product: any) => {
    const variant = product.variants?.[0];
    return variant?.price || 0;
  };

  const getCompareAtPrice = (product: any) => {
    const variant = product.variants?.[0];
    return variant?.compare_at_price;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-luxury text-4xl md:text-5xl mb-4">Our Collection</h1>
        <p className="text-muted-foreground max-w-2xl">
          Discover our curated selection of premium hijabs, crafted with the finest fabrics 
          for the modern, confident woman.
        </p>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search hijabs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Sort */}
        <Select value={`${sortBy}-${sortOrder}`} onValueChange={(val) => {
          const [by, order] = val.split('-');
          setSortBy(by);
          setSortOrder(order as 'asc' | 'desc');
        }}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="created_at-desc">Newest First</SelectItem>
            <SelectItem value="created_at-asc">Oldest First</SelectItem>
            <SelectItem value="name-asc">Name A-Z</SelectItem>
            <SelectItem value="name-desc">Name Z-A</SelectItem>
          </SelectContent>
        </Select>

        {/* Filter Toggle (Mobile) */}
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className="md:hidden"
        >
          <SlidersHorizontal className="h-4 w-4 mr-2" />
          Filters
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar Filters */}
        <aside className={`w-full md:w-64 shrink-0 ${showFilters ? 'block' : 'hidden md:block'}`}>
          <Card>
            <CardContent className="p-4 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Filters</h3>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    <X className="h-4 w-4 mr-1" />
                    Clear
                  </Button>
                )}
              </div>

              {/* Category Filter */}
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories?.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </aside>

        {/* Product Grid */}
        <div className="flex-1">
          {/* Active Filters */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2 mb-4">
              {search && (
                <Badge variant="secondary" className="gap-1">
                  Search: {search}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setSearch('')} />
                </Badge>
              )}
              {categoryId !== 'all' && (
                <Badge variant="secondary" className="gap-1">
                  {categories?.find(c => c.id === categoryId)?.name}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setCategoryId('all')} />
                </Badge>
              )}
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <Skeleton className="aspect-square" />
                  <CardContent className="p-4 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center py-12">
              <p className="text-destructive mb-4">Failed to load products</p>
              <Button onClick={() => window.location.reload()}>Try Again</Button>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && products.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">No products found</p>
              {hasActiveFilters && (
                <Button variant="outline" onClick={clearFilters}>
                  Clear Filters
                </Button>
              )}
            </div>
          )}

          {/* Products Grid */}
          {!isLoading && !error && products.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product: any) => {
                const price = getProductPrice(product);
                const comparePrice = getCompareAtPrice(product);
                const image = getProductImage(product);
                const firstVariant = product.variants?.[0];

                return (
                  <Card key={product.id} className="group overflow-hidden">
                    <Link to={`/products/${product.slug}`}>
                      <div className="aspect-square overflow-hidden bg-muted">
                        <img
                          src={image}
                          alt={product.name}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      </div>
                    </Link>
                    <CardContent className="p-4">
                      <Link to={`/products/${product.slug}`}>
                        <h3 className="font-medium text-lg mb-1 hover:text-primary transition-colors line-clamp-1">
                          {product.name}
                        </h3>
                      </Link>
                      {product.short_description && (
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                          {product.short_description}
                        </p>
                      )}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-lg">₹{price.toLocaleString()}</span>
                          {comparePrice && comparePrice > price && (
                            <span className="text-sm text-muted-foreground line-through">
                              ₹{comparePrice.toLocaleString()}
                            </span>
                          )}
                        </div>
                        {firstVariant && (
                          <AddToCartButton
                            productId={product.id}
                            variantId={firstVariant.id}
                            productName={product.name}
                            productPrice={price}
                            productImage={image}
                            productColor={firstVariant.color}
                            productSize={firstVariant.size}
                            size="sm"
                          >
                            <ShoppingCart className="h-4 w-4" />
                          </AddToCartButton>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Pagination info */}
          {productsData?.meta && (
            <div className="mt-8 text-center text-sm text-muted-foreground">
              Showing {products.length} of {productsData.meta.total} products
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
