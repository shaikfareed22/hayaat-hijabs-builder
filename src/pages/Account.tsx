import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ShoppingBag, Heart, MapPin, User } from 'lucide-react';

interface Address {
  street: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

export default function Account() {
  const { user, profile, signOut } = useAuth();
  const { toast } = useToast();
  
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    first_name: profile?.first_name || '',
    last_name: profile?.last_name || '',
    display_name: profile?.display_name || '',
    phone: profile?.phone || '',
    date_of_birth: profile?.date_of_birth || '',
    marketing_consent: profile?.marketing_consent || false,
  });

  const savedAddress = (profile as any)?.address as Address | null;
  const [addressData, setAddressData] = useState<Address>({
    street: savedAddress?.street || '',
    city: savedAddress?.city || '',
    state: savedAddress?.state || '',
    pincode: savedAddress?.pincode || '',
    country: savedAddress?.country || 'India',
  });

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update(formData)
        .eq('user_id', user?.id);
      if (error) throw error;
      setIsEditing(false);
      toast({ title: 'Profile Updated', description: 'Your profile has been updated successfully.' });
    } catch (error: any) {
      toast({ title: 'Update Failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ address: addressData as any })
        .eq('user_id', user?.id);
      if (error) throw error;
      setIsEditingAddress(false);
      toast({ title: 'Address Saved', description: 'Your shipping address has been saved.' });
    } catch (error: any) {
      toast({ title: 'Update Failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({ title: 'Signed Out', description: 'You have been signed out successfully.' });
    } catch (error: any) {
      toast({ title: 'Sign Out Failed', description: error.message, variant: 'destructive' });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl space-y-6">
      {/* Quick Links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: User, label: 'Profile', href: '#profile' },
          { icon: ShoppingBag, label: 'My Orders', href: '/orders' },
          { icon: Heart, label: 'Wishlist', href: '/wishlist' },
          { icon: MapPin, label: 'Address', href: '#address' },
        ].map((item) => (
          <Link key={item.label} to={item.href} className="block">
            <Card className="hover:bg-muted/50 transition-colors">
              <CardContent className="p-4 flex flex-col items-center gap-2 text-center">
                <item.icon className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium">{item.label}</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Profile Info */}
      <Card id="profile">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-luxury">Profile Information</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsEditing(!isEditing);
                if (!isEditing) {
                  setFormData({
                    first_name: profile?.first_name || '',
                    last_name: profile?.last_name || '',
                    display_name: profile?.display_name || '',
                    phone: profile?.phone || '',
                    date_of_birth: profile?.date_of_birth || '',
                    marketing_consent: profile?.marketing_consent || false,
                  });
                }
              }}
              disabled={isLoading}
            >
              {isEditing ? 'Cancel' : 'Edit'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="first_name">First Name</Label>
                  <Input id="first_name" value={formData.first_name} onChange={(e) => setFormData({ ...formData, first_name: e.target.value })} disabled={isLoading} />
                </div>
                <div>
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input id="last_name" value={formData.last_name} onChange={(e) => setFormData({ ...formData, last_name: e.target.value })} disabled={isLoading} />
                </div>
              </div>
              <div>
                <Label htmlFor="display_name">Display Name</Label>
                <Input id="display_name" value={formData.display_name} onChange={(e) => setFormData({ ...formData, display_name: e.target.value })} disabled={isLoading} />
              </div>
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" type="tel" inputMode="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} disabled={isLoading} />
              </div>
              <div>
                <Label htmlFor="dob">Date of Birth</Label>
                <Input id="dob" type="date" value={formData.date_of_birth} onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })} disabled={isLoading} />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="marketing"
                  checked={formData.marketing_consent}
                  onCheckedChange={(checked) => setFormData({ ...formData, marketing_consent: checked === true })}
                  disabled={isLoading}
                />
                <Label htmlFor="marketing" className="text-sm font-normal">I'd like to receive marketing emails and promotions</Label>
              </div>
              <Button type="submit" disabled={isLoading}>{isLoading ? 'Saving...' : 'Save Changes'}</Button>
            </form>
          ) : (
            <div className="space-y-3">
              {[
                { label: 'Email', value: user?.email },
                { label: 'First Name', value: profile?.first_name },
                { label: 'Last Name', value: profile?.last_name },
                { label: 'Display Name', value: profile?.display_name },
                { label: 'Phone', value: profile?.phone },
                { label: 'Date of Birth', value: profile?.date_of_birth },
                { label: 'Marketing', value: profile?.marketing_consent ? 'Subscribed' : 'Not subscribed' },
              ].map((item) => (
                <div key={item.label} className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span>{item.value || 'Not set'}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Shipping Address */}
      <Card id="address">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-luxury">Shipping Address</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsEditingAddress(!isEditingAddress);
                if (!isEditingAddress && savedAddress) {
                  setAddressData({
                    street: savedAddress.street || '',
                    city: savedAddress.city || '',
                    state: savedAddress.state || '',
                    pincode: savedAddress.pincode || '',
                    country: savedAddress.country || 'India',
                  });
                }
              }}
              disabled={isLoading}
            >
              {isEditingAddress ? 'Cancel' : savedAddress ? 'Edit' : 'Add Address'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isEditingAddress ? (
            <form onSubmit={handleSaveAddress} className="space-y-4">
              <div>
                <Label htmlFor="street">Street Address</Label>
                <Input id="street" value={addressData.street} onChange={(e) => setAddressData({ ...addressData, street: e.target.value })} disabled={isLoading} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input id="city" value={addressData.city} onChange={(e) => setAddressData({ ...addressData, city: e.target.value })} disabled={isLoading} />
                </div>
                <div>
                  <Label htmlFor="state">State</Label>
                  <Input id="state" value={addressData.state} onChange={(e) => setAddressData({ ...addressData, state: e.target.value })} disabled={isLoading} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="pincode">Pincode</Label>
                  <Input id="pincode" inputMode="numeric" value={addressData.pincode} onChange={(e) => setAddressData({ ...addressData, pincode: e.target.value })} disabled={isLoading} />
                </div>
                <div>
                  <Label htmlFor="country">Country</Label>
                  <Input id="country" value={addressData.country} onChange={(e) => setAddressData({ ...addressData, country: e.target.value })} disabled={isLoading} />
                </div>
              </div>
              <Button type="submit" disabled={isLoading}>{isLoading ? 'Saving...' : 'Save Address'}</Button>
            </form>
          ) : savedAddress ? (
            <div className="space-y-1 text-sm">
              <p>{savedAddress.street}</p>
              <p>{savedAddress.city}, {savedAddress.state} {savedAddress.pincode}</p>
              <p>{savedAddress.country}</p>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">No shipping address saved yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Sign Out */}
      <Card>
        <CardContent className="pt-6">
          <Button variant="destructive" onClick={handleSignOut} className="w-full">Sign Out</Button>
        </CardContent>
      </Card>
    </div>
  );
}
