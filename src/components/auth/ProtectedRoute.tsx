import { ReactNode, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: 'admin' | 'customer';
}

export const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { user, profile, loading } = useAuth();
  const location = useLocation();
  const [roleVerified, setRoleVerified] = useState<boolean | null>(null);

  // Server-side role verification for admin routes
  useEffect(() => {
    if (!requiredRole || requiredRole !== 'admin' || !user) {
      setRoleVerified(null);
      return;
    }

    // Double-check admin role via the server-side has_role function
    const verifyRole = async () => {
      const { data, error } = await supabase.rpc('has_role', {
        _user_id: user.id,
        _role: 'admin' as const,
      });

      if (error) {
        console.error('Role verification failed:', error);
        setRoleVerified(false);
        return;
      }

      setRoleVerified(!!data);
    };

    verifyRole();
  }, [user, requiredRole]);

  // Show loading while checking auth state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32 w-96" />
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // For admin routes, wait for server-side verification
  if (requiredRole === 'admin') {
    if (roleVerified === null) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-32 w-96" />
          </div>
        </div>
      );
    }

    if (!roleVerified) {
      return <Navigate to="/account" replace />;
    }

    return <>{children}</>;
  }

  // Non-admin role check (fallback to profile)
  if (requiredRole && profile?.role !== requiredRole) {
    return <Navigate to="/account" replace />;
  }

  return <>{children}</>;
};
