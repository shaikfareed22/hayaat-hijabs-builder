import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Users } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

type Profile = Tables<'user_profiles'>;

export default function AdminCustomers() {
  const [customers, setCustomers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchCustomers = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) toast({ title: 'Error loading customers', variant: 'destructive' });
      else setCustomers(data || []);
      setLoading(false);
    };

    fetchCustomers();
  }, []);

  const filtered = customers.filter(c => {
    const q = search.toLowerCase();
    return (
      (c.first_name || '').toLowerCase().includes(q) ||
      (c.last_name || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q) ||
      (c.display_name || '').toLowerCase().includes(q)
    );
  });

  const getInitials = (c: Profile) => {
    const first = c.first_name?.[0] || c.display_name?.[0] || c.email?.[0] || '?';
    const last = c.last_name?.[0] || '';
    return (first + last).toUpperCase();
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-luxury font-semibold">Customers</h1>
        <p className="text-muted-foreground text-sm mt-1">{customers.length} registered users</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No customers found</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((customer) => (
                <div key={customer.id} className="flex items-center gap-4 px-6 py-4 hover:bg-muted/30 transition-colors">
                  <div className="w-10 h-10 rounded-full gradient-luxury flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-semibold text-primary-foreground">{getInitials(customer)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {[customer.first_name, customer.last_name].filter(Boolean).join(' ') || customer.display_name || 'No name'}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">{customer.email || 'No email'}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {customer.phone && (
                      <span className="text-sm text-muted-foreground hidden md:block">{customer.phone}</span>
                    )}
                    <Badge variant={customer.role === 'admin' ? 'default' : 'secondary'} className="capitalize text-xs">
                      {customer.role || 'customer'}
                    </Badge>
                    <span className="text-xs text-muted-foreground hidden lg:block">
                      Joined {new Date(customer.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
