import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';
import {
  LayoutDashboard, Package, FolderOpen, ShoppingCart, Users, BarChart3, LogOut, Menu, X, ChevronRight, Store, Tag,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/products', label: 'Products', icon: Package, end: false },
  { to: '/admin/collections', label: 'Collections', icon: FolderOpen, end: false },
  { to: '/admin/orders', label: 'Orders', icon: ShoppingCart, end: false },
  { to: '/admin/coupons', label: 'Coupons', icon: Tag, end: false },
  { to: '/admin/customers', label: 'Customers', icon: Users, end: false },
  { to: '/admin/analytics', label: 'Analytics', icon: BarChart3, end: false },
];

export default function AdminLayout() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleSignOut = async () => { await signOut(); navigate('/'); };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <aside className={cn('flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 flex-shrink-0', sidebarOpen ? 'w-64' : 'w-16')}>
        <div className="h-16 flex items-center px-4 border-b border-sidebar-border gap-3">
          <div className="w-8 h-8 rounded-lg gradient-luxury flex items-center justify-center flex-shrink-0"><Store className="w-4 h-4 text-primary-foreground" /></div>
          {sidebarOpen && (<div className="overflow-hidden"><p className="font-luxury text-sm font-semibold text-sidebar-foreground leading-tight">Hayaat</p><p className="text-xs text-muted-foreground">Admin Panel</p></div>)}
        </div>
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => cn('flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group', isActive ? 'bg-primary text-primary-foreground shadow-sm' : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground')}>
              {({ isActive }) => (<><Icon className={cn('w-5 h-5 flex-shrink-0', isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-sidebar-accent-foreground')} />{sidebarOpen && <span className="truncate">{label}</span>}{sidebarOpen && isActive && <ChevronRight className="w-4 h-4 ml-auto" />}</>)}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-sidebar-border space-y-2">
          <NavLink to="/" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors">
            <Store className="w-5 h-5 flex-shrink-0" />{sidebarOpen && <span>View Store</span>}
          </NavLink>
          {sidebarOpen && (<div className="px-3 py-2 rounded-lg bg-sidebar-accent"><p className="text-xs font-medium text-sidebar-foreground truncate">{profile?.display_name || profile?.first_name || 'Admin'}</p><p className="text-xs text-muted-foreground truncate">{profile?.email}</p></div>)}
          <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors">
            <LogOut className="w-5 h-5 flex-shrink-0" />{sidebarOpen && <span>Sign Out</span>}
          </button>
        </div>
      </aside>
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 flex items-center px-6 border-b border-border bg-card flex-shrink-0 gap-4">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)} className="flex-shrink-0">{sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}</Button>
          <div className="flex-1" />
          <div className="text-sm text-muted-foreground">Welcome back, <span className="text-foreground font-medium">{profile?.first_name || 'Admin'}</span></div>
        </header>
        <main className="flex-1 overflow-y-auto bg-muted/30"><Outlet /></main>
      </div>
    </div>
  );
}
