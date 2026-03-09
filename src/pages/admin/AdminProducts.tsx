import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Pencil, Trash2, Search, Package, Images, AlertTriangle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { ProductImageManager } from '@/components/admin/ProductImageManager';

type VariantWithImages = Pick<Tables<'product_variants'>, 'id' | 'price' | 'stock_quantity' | 'color' | 'size' | 'sku' | 'low_stock_threshold'> & {
  product_images: Pick<Tables<'product_images'>, 'id' | 'image_url' | 'is_primary' | 'display_order' | 'variant_id' | 'alt_text'>[];
};

type Product = Tables<'products'> & {
  product_variants: VariantWithImages[];
};

const emptyForm = {
  name: '', slug: '', short_description: '', description: '', fabric_type: '', care_instructions: '', is_active: true, is_featured: false,
};

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showLowStock, setShowLowStock] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [imageProduct, setImageProduct] = useState<{ id: string; name: string } | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [editingStock, setEditingStock] = useState<{ variantId: string; value: string } | null>(null);

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('*, product_variants(id, price, stock_quantity, color, size, sku, low_stock_threshold, product_images(id, image_url, is_primary, display_order, variant_id, alt_text))')
      .order('created_at', { ascending: false });

    if (error) toast({ title: 'Error loading products', variant: 'destructive' });
    else setProducts((data ?? []) as Product[]);
    setLoading(false);
  };

  useEffect(() => { fetchProducts(); }, []);

  const openAdd = () => { setEditing(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({ name: p.name, slug: p.slug, short_description: p.short_description || '', description: p.description || '', fabric_type: p.fabric_type || '', care_instructions: p.care_instructions || '', is_active: p.is_active ?? true, is_featured: p.is_featured ?? false });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.slug) { toast({ title: 'Name and slug are required', variant: 'destructive' }); return; }
    setSaving(true);
    const payload = { name: form.name, slug: form.slug.toLowerCase().replace(/\s+/g, '-'), short_description: form.short_description || null, description: form.description || null, fabric_type: form.fabric_type || null, care_instructions: form.care_instructions || null, is_active: form.is_active, is_featured: form.is_featured };

    if (editing) {
      const { error } = await supabase.from('products').update(payload).eq('id', editing.id);
      if (error) toast({ title: 'Failed to update product', description: error.message, variant: 'destructive' });
      else { toast({ title: 'Product updated!' }); setDialogOpen(false); fetchProducts(); }
    } else {
      const { error } = await supabase.from('products').insert(payload);
      if (error) toast({ title: 'Failed to create product', description: error.message, variant: 'destructive' });
      else { toast({ title: 'Product created!' }); setDialogOpen(false); fetchProducts(); }
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) toast({ title: 'Failed to delete product', variant: 'destructive' });
    else { toast({ title: 'Product deleted' }); fetchProducts(); }
  };

  const handleStockUpdate = async (variantId: string, newStock: number) => {
    const { error } = await supabase.from('product_variants').update({ stock_quantity: newStock }).eq('id', variantId);
    if (error) toast({ title: 'Failed to update stock', variant: 'destructive' });
    else { toast({ title: 'Stock updated' }); fetchProducts(); }
    setEditingStock(null);
  };

  const getStockColor = (stock: number, threshold: number) => {
    if (stock <= 0) return 'text-destructive';
    if (stock <= threshold) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-foreground';
  };

  const filtered = useMemo(() => {
    let list = products.filter(p =>
      p.name.toLowerCase().includes(search.toLowerCase()) || p.slug.toLowerCase().includes(search.toLowerCase())
    );
    if (showLowStock) {
      list = list.filter(p => p.product_variants.some(v => (v.stock_quantity || 0) <= (v.low_stock_threshold || 5)));
    }
    return list;
  }, [products, search, showLowStock]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-luxury font-semibold">Products</h1>
          <p className="text-muted-foreground text-sm mt-1">{products.length} total products</p>
        </div>
        <Button onClick={openAdd} className="flex items-center gap-2"><Plus className="w-4 h-4" /> Add Product</Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button
          variant={showLowStock ? 'default' : 'outline'}
          onClick={() => setShowLowStock(!showLowStock)}
          className="flex items-center gap-2"
        >
          <AlertTriangle className="w-4 h-4" /> Low Stock
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground"><Package className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>No products found</p></div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((product) => {
                const lowestPrice = product.product_variants.length > 0 ? Math.min(...product.product_variants.map(v => Number(v.price))) : null;
                const totalStock = product.product_variants.reduce((s, v) => s + (v.stock_quantity || 0), 0);
                const hasLowStock = product.product_variants.some(v => (v.stock_quantity || 0) <= (v.low_stock_threshold || 5));
                const productPrimaryImage = product.product_variants
                  .flatMap(v => v.product_images)
                  .sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || (a.display_order || 0) - (b.display_order || 0))[0];

                return (
                  <div key={product.id} className="flex items-center gap-4 px-6 py-4 hover:bg-muted/30 transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                      {productPrimaryImage ? (
                        <img src={productPrimaryImage.image_url} alt={productPrimaryImage.alt_text || product.name} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <Package className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{product.name}</p>
                        {product.is_featured && <Badge variant="secondary" className="text-xs">Featured</Badge>}
                        {hasLowStock && <Badge variant="destructive" className="text-xs"><AlertTriangle className="w-3 h-3 mr-1" />Low Stock</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{product.slug}</p>
                    </div>
                    <div className="hidden md:flex items-center gap-6 text-sm">
                      <div className="text-center">
                        <p className="font-medium">{lowestPrice != null ? `₹${lowestPrice.toFixed(2)}` : '—'}</p>
                        <p className="text-xs text-muted-foreground">Price</p>
                      </div>
                      <div className="text-center">
                        <p className="font-medium">{product.product_variants.length}</p>
                        <p className="text-xs text-muted-foreground">Variants</p>
                      </div>
                      <div className="text-center">
                        {editingStock && product.product_variants.some(v => v.id === editingStock.variantId) ? (
                          <Input
                            value={editingStock.value}
                            onChange={(e) => setEditingStock({ ...editingStock, value: e.target.value })}
                            onBlur={() => handleStockUpdate(editingStock.variantId, parseInt(editingStock.value) || 0)}
                            onKeyDown={(e) => e.key === 'Enter' && handleStockUpdate(editingStock.variantId, parseInt(editingStock.value) || 0)}
                            className="w-16 h-7 text-center text-sm"
                            autoFocus
                          />
                        ) : (
                          <button
                            onClick={() => {
                              const v = product.product_variants[0];
                              if (v) setEditingStock({ variantId: v.id, value: String(v.stock_quantity || 0) });
                            }}
                            className="cursor-pointer hover:bg-muted rounded px-2 py-0.5 transition-colors"
                          >
                            <p className={`font-medium ${getStockColor(totalStock, 5)}`}>{totalStock}</p>
                            <p className="text-xs text-muted-foreground">Stock</p>
                          </button>
                        )}
                      </div>
                    </div>
                    <Badge variant={product.is_active ? 'default' : 'secondary'} className="text-xs hidden sm:flex">{product.is_active ? 'Active' : 'Inactive'}</Badge>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setImageProduct({ id: product.id, name: product.name })}><Images className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(product)}><Pencil className="w-4 h-4" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Product</AlertDialogTitle>
                            <AlertDialogDescription>Are you sure you want to delete "{product.name}"? This action cannot be undone.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(product.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Product Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-luxury">{editing ? 'Edit Product' : 'Add Product'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') }))} placeholder="Elegant Hijab" /></div>
              <div><Label>Slug *</Label><Input value={form.slug} onChange={(e) => setForm(f => ({ ...f, slug: e.target.value }))} placeholder="elegant-hijab" /></div>
            </div>
            <div><Label>Short Description</Label><Input value={form.short_description} onChange={(e) => setForm(f => ({ ...f, short_description: e.target.value }))} placeholder="Brief product description" /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Full product description..." rows={3} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Fabric Type</Label><Input value={form.fabric_type} onChange={(e) => setForm(f => ({ ...f, fabric_type: e.target.value }))} placeholder="Chiffon, Silk..." /></div>
              <div><Label>Care Instructions</Label><Input value={form.care_instructions} onChange={(e) => setForm(f => ({ ...f, care_instructions: e.target.value }))} placeholder="Hand wash cold" /></div>
            </div>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm(f => ({ ...f, is_active: e.target.checked }))} className="rounded" /><span className="text-sm">Active</span></label>
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.is_featured} onChange={(e) => setForm(f => ({ ...f, is_featured: e.target.checked }))} className="rounded" /><span className="text-sm">Featured</span></label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Product'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {imageProduct && (
        <ProductImageManager open={!!imageProduct} onOpenChange={(next) => !next && setImageProduct(null)} productId={imageProduct.id} productName={imageProduct.name} onUpdated={fetchProducts} />
      )}
    </div>
  );
}
