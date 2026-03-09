import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Plus, Pencil, Trash2, Tag } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Coupon {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  minimum_order_amount: number;
  usage_limit: number | null;
  used_count: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

const emptyForm = {
  code: '',
  discount_type: 'percentage' as 'percentage' | 'fixed',
  discount_value: '',
  minimum_order_amount: '',
  usage_limit: '',
  expires_at: '',
  is_active: true,
};

async function couponAction(action: string, body: any) {
  const { data: session } = await supabase.auth.getSession();
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/coupons`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session?.session?.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action, ...body }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data;
}

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const result = await couponAction('list', {});
      setCoupons(result.data || []);
    } catch (err: any) {
      toast({ title: 'Error loading coupons', description: err.message, variant: 'destructive' });
    }
    setLoading(false);
  };

  useEffect(() => { fetchCoupons(); }, []);

  const openAdd = () => { setEditing(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (c: Coupon) => {
    setEditing(c);
    setForm({
      code: c.code,
      discount_type: c.discount_type as any,
      discount_value: String(c.discount_value),
      minimum_order_amount: String(c.minimum_order_amount || ''),
      usage_limit: c.usage_limit ? String(c.usage_limit) : '',
      expires_at: c.expires_at ? c.expires_at.slice(0, 16) : '',
      is_active: c.is_active,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.code || !form.discount_value) {
      toast({ title: 'Code and value are required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await couponAction('update', {
          id: editing.id,
          code: form.code,
          discount_type: form.discount_type,
          discount_value: Number(form.discount_value),
          minimum_order_amount: Number(form.minimum_order_amount) || 0,
          usage_limit: form.usage_limit ? Number(form.usage_limit) : null,
          expires_at: form.expires_at || null,
          is_active: form.is_active,
        });
        toast({ title: 'Coupon updated!' });
      } else {
        await couponAction('create', {
          code: form.code,
          discount_type: form.discount_type,
          discount_value: Number(form.discount_value),
          minimum_order_amount: Number(form.minimum_order_amount) || 0,
          usage_limit: form.usage_limit ? Number(form.usage_limit) : null,
          expires_at: form.expires_at || null,
        });
        toast({ title: 'Coupon created!' });
      }
      setDialogOpen(false);
      fetchCoupons();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      await couponAction('delete', { id });
      toast({ title: 'Coupon deleted' });
      fetchCoupons();
    } catch (err: any) {
      toast({ title: 'Failed to delete', description: err.message, variant: 'destructive' });
    }
  };

  const toggleActive = async (c: Coupon) => {
    try {
      await couponAction('update', { id: c.id, is_active: !c.is_active });
      fetchCoupons();
    } catch (err: any) {
      toast({ title: 'Failed to update', variant: 'destructive' });
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-luxury font-semibold">Coupons</h1>
          <p className="text-muted-foreground text-sm mt-1">{coupons.length} total coupons</p>
        </div>
        <Button onClick={openAdd} className="flex items-center gap-2"><Plus className="w-4 h-4" /> Add Coupon</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : coupons.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Tag className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>No coupons yet</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {coupons.map(coupon => (
                <div key={coupon.id} className="flex flex-col sm:flex-row sm:items-center gap-3 px-6 py-4 hover:bg-muted/30 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-mono font-semibold text-sm">{coupon.code}</p>
                      <Badge variant={coupon.is_active ? 'default' : 'secondary'} className="text-xs">
                        {coupon.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {coupon.discount_type === 'percentage' ? `${coupon.discount_value}% off` : `₹${coupon.discount_value} off`}
                      {coupon.minimum_order_amount > 0 && ` • Min ₹${coupon.minimum_order_amount}`}
                      {coupon.expires_at && ` • Expires ${new Date(coupon.expires_at).toLocaleDateString()}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">
                      Used: {coupon.used_count}{coupon.usage_limit ? `/${coupon.usage_limit}` : ''}
                    </span>
                    <Switch checked={coupon.is_active} onCheckedChange={() => toggleActive(coupon)} />
                    <Button variant="ghost" size="icon" onClick={() => openEdit(coupon)}><Pencil className="w-4 h-4" /></Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Coupon</AlertDialogTitle>
                          <AlertDialogDescription>Delete coupon "{coupon.code}"? This cannot be undone.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(coupon.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="font-luxury">{editing ? 'Edit Coupon' : 'Create Coupon'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Code *</Label>
              <Input value={form.code} onChange={(e) => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="SAVE20" className="font-mono" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Discount Type</Label>
                <Select value={form.discount_type} onValueChange={(v: any) => setForm(f => ({ ...f, discount_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="fixed">Fixed (₹)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Value *</Label>
                <Input type="number" value={form.discount_value} onChange={(e) => setForm(f => ({ ...f, discount_value: e.target.value }))} placeholder={form.discount_type === 'percentage' ? '20' : '100'} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Min Order (₹)</Label>
                <Input type="number" value={form.minimum_order_amount} onChange={(e) => setForm(f => ({ ...f, minimum_order_amount: e.target.value }))} placeholder="0" />
              </div>
              <div>
                <Label>Usage Limit</Label>
                <Input type="number" value={form.usage_limit} onChange={(e) => setForm(f => ({ ...f, usage_limit: e.target.value }))} placeholder="Unlimited" />
              </div>
            </div>
            <div>
              <Label>Expires At</Label>
              <Input type="datetime-local" value={form.expires_at} onChange={(e) => setForm(f => ({ ...f, expires_at: e.target.value }))} />
            </div>
            {editing && (
              <div className="flex items-center gap-2">
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm(f => ({ ...f, is_active: v }))} />
                <Label>Active</Label>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Coupon'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
