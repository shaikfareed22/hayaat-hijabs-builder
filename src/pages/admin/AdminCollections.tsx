import { useEffect, useState } from 'react';
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
import { Plus, Pencil, Trash2, FolderOpen } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';

type Collection = Tables<'collections'>;

const emptyForm = {
  name: '',
  slug: '',
  description: '',
  image_url: '',
  is_active: true,
  is_featured: false,
};

export default function AdminCollections() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Collection | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchCollections = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('collections')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) toast({ title: 'Error loading collections', variant: 'destructive' });
    else setCollections(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchCollections(); }, []);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (c: Collection) => {
    setEditing(c);
    setForm({
      name: c.name,
      slug: c.slug,
      description: c.description || '',
      image_url: c.image_url || '',
      is_active: c.is_active ?? true,
      is_featured: c.is_featured ?? false,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.slug) {
      toast({ title: 'Name and slug are required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name,
      slug: form.slug.toLowerCase().replace(/\s+/g, '-'),
      description: form.description || null,
      image_url: form.image_url || null,
      is_active: form.is_active,
      is_featured: form.is_featured,
    };

    if (editing) {
      const { error } = await supabase.from('collections').update(payload).eq('id', editing.id);
      if (error) toast({ title: 'Failed to update', description: error.message, variant: 'destructive' });
      else { toast({ title: 'Collection updated!' }); setDialogOpen(false); fetchCollections(); }
    } else {
      const { error } = await supabase.from('collections').insert(payload);
      if (error) toast({ title: 'Failed to create', description: error.message, variant: 'destructive' });
      else { toast({ title: 'Collection created!' }); setDialogOpen(false); fetchCollections(); }
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('collections').delete().eq('id', id);
    if (error) toast({ title: 'Failed to delete', variant: 'destructive' });
    else { toast({ title: 'Collection deleted' }); fetchCollections(); }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-luxury font-semibold">Collections</h1>
          <p className="text-muted-foreground text-sm mt-1">{collections.length} collections</p>
        </div>
        <Button onClick={openAdd} className="flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Collection
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : collections.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No collections yet</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {collections.map((col) => (
                <div key={col.id} className="flex items-center gap-4 px-6 py-4 hover:bg-muted/30 transition-colors">
                  {col.image_url ? (
                    <img src={col.image_url} alt={col.name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg gradient-luxury flex items-center justify-center flex-shrink-0">
                      <FolderOpen className="w-6 h-6 text-primary-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{col.name}</p>
                      {col.is_featured && <Badge variant="secondary" className="text-xs">Featured</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{col.slug}</p>
                  </div>
                  <Badge variant={col.is_active ? 'default' : 'secondary'} className="text-xs hidden sm:flex">
                    {col.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(col)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Collection</AlertDialogTitle>
                          <AlertDialogDescription>
                            Delete "{col.name}"? This cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(col.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-luxury">{editing ? 'Edit Collection' : 'Add Collection'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Name *</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') }))} placeholder="Summer Collection" />
              </div>
              <div>
                <Label>Slug *</Label>
                <Input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} placeholder="summer-collection" />
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe this collection..." rows={3} />
            </div>
            <div>
              <Label>Image URL</Label>
              <Input value={form.image_url} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))} placeholder="https://..." />
            </div>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="rounded" />
                <span className="text-sm">Active</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_featured} onChange={e => setForm(f => ({ ...f, is_featured: e.target.checked }))} className="rounded" />
                <span className="text-sm">Featured</span>
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : editing ? 'Save Changes' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
