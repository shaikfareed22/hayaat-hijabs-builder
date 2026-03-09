import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useWishlistIds, useToggleWishlist } from '@/hooks/useWishlist';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface WishlistButtonProps {
  productId: string;
  size?: 'default' | 'sm' | 'icon';
  className?: string;
}

export function WishlistButton({ productId, size = 'icon', className }: WishlistButtonProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: wishlistIds } = useWishlistIds();
  const toggle = useToggleWishlist();

  const isWishlisted = wishlistIds?.has(productId) ?? false;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      navigate('/login');
      return;
    }
    toggle.mutate(productId);
  };

  return (
    <Button
      variant="secondary"
      size={size}
      className={cn('rounded-full', className)}
      onClick={handleClick}
      disabled={toggle.isPending}
    >
      <Heart
        className={cn(
          'h-4 w-4 transition-colors',
          isWishlisted && 'fill-red-500 text-red-500'
        )}
      />
    </Button>
  );
}
