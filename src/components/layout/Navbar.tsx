import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ShoppingBag, Heart, User, Menu, X, Shield, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const navLinks = [
  { name: "Home", path: "/" },
  { name: "Shop", path: "/shop" },
  { name: "Collections", path: "/collections" },
  { name: "New Arrivals", path: "/new-arrivals" },
  { name: "About", path: "/about" },
  { name: "Contact", path: "/contact" },
];

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const { toast } = useToast();

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
      toast({
        title: 'Signed Out',
        description: 'You have been signed out successfully.',
      });
    } catch (error: any) {
      toast({
        title: 'Sign Out Failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const isAdmin = profile?.role === 'admin';

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
      {/* Top banner */}
      <div className="bg-primary text-primary-foreground text-center py-2 text-xs tracking-widest uppercase font-sans">
        Free shipping on orders over $75 · Elegance delivered to your door
      </div>

      <nav className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Mobile menu button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2"
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <h1 className="font-luxury text-2xl md:text-3xl tracking-wider text-foreground">
              Hayaat <span className="font-light">Hijabs</span>
            </h1>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`text-sm tracking-wider uppercase transition-colors hover:text-foreground ${
                  location.pathname === link.path
                    ? "text-foreground font-medium"
                    : "text-muted-foreground"
                }`}
              >
                {link.name}
              </Link>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 md:gap-4">
            <button
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="p-2 hover:text-foreground text-muted-foreground transition-colors"
            >
              <Search className="h-5 w-5" />
            </button>
            <Link
              to="/wishlist"
              className="p-2 hover:text-foreground text-muted-foreground transition-colors hidden sm:block"
            >
              <Heart className="h-5 w-5" />
            </Link>
            
            {user ? (
              <>
                {isAdmin && (
                  <Link
                    to="/admin"
                    className="p-2 hover:text-foreground text-muted-foreground transition-colors hidden sm:block"
                    title="Admin Dashboard"
                  >
                    <Shield className="h-5 w-5" />
                  </Link>
                )}
                <Link
                  to="/account"
                  className="p-2 hover:text-foreground text-muted-foreground transition-colors hidden sm:block"
                >
                  <User className="h-5 w-5" />
                </Link>
                <button
                  onClick={handleSignOut}
                  className="p-2 hover:text-foreground text-muted-foreground transition-colors hidden sm:block"
                  title="Sign Out"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="p-2 hover:text-foreground text-muted-foreground transition-colors hidden sm:block"
              >
                <User className="h-5 w-5" />
              </Link>
            )}
            
            <Link to="/cart" className="relative p-2 hover:text-foreground text-muted-foreground transition-colors">
              <ShoppingBag className="h-5 w-5" />
              <span className="absolute -top-0 -right-0 bg-accent text-accent-foreground text-xs rounded-full h-4 w-4 flex items-center justify-center font-medium">
                0
              </span>
            </Link>
          </div>
        </div>

        {/* Search bar */}
        <AnimatePresence>
          {isSearchOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden pb-4"
            >
              <Input
                placeholder="Search for hijabs, fabrics, styles..."
                className="max-w-xl mx-auto"
                autoFocus
              />
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden border-t border-border overflow-hidden bg-background"
          >
            <div className="flex flex-col p-4 gap-2">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsMenuOpen(false)}
                  className={`py-3 px-4 text-sm tracking-wider uppercase rounded-lg transition-colors ${
                    location.pathname === link.path
                      ? "bg-secondary text-foreground font-medium"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {link.name}
                </Link>
              ))}
              
              <div className="flex flex-col gap-2 pt-4 border-t border-border mt-2">
                {user ? (
                  <>
                    {isAdmin && (
                      <Link 
                        to="/admin" 
                        onClick={() => setIsMenuOpen(false)} 
                        className="flex items-center gap-2 py-3 px-4 text-sm text-muted-foreground hover:bg-muted rounded-lg"
                      >
                        <Shield className="h-4 w-4" /> Admin Dashboard
                      </Link>
                    )}
                    <Link 
                      to="/account" 
                      onClick={() => setIsMenuOpen(false)} 
                      className="flex items-center gap-2 py-3 px-4 text-sm text-muted-foreground hover:bg-muted rounded-lg"
                    >
                      <User className="h-4 w-4" /> My Account
                    </Link>
                    <Link 
                      to="/orders" 
                      onClick={() => setIsMenuOpen(false)} 
                      className="flex items-center gap-2 py-3 px-4 text-sm text-muted-foreground hover:bg-muted rounded-lg"
                    >
                      <ShoppingBag className="h-4 w-4" /> My Orders
                    </Link>
                    <Link 
                      to="/wishlist" 
                      onClick={() => setIsMenuOpen(false)} 
                      className="flex items-center gap-2 py-3 px-4 text-sm text-muted-foreground hover:bg-muted rounded-lg"
                    >
                      <Heart className="h-4 w-4" /> Wishlist
                    </Link>
                    <button 
                      onClick={() => {
                        setIsMenuOpen(false);
                        handleSignOut();
                      }} 
                      className="flex items-center gap-2 py-3 px-4 text-sm text-muted-foreground hover:bg-muted rounded-lg text-left"
                    >
                      <LogOut className="h-4 w-4" /> Sign Out
                    </button>
                  </>
                ) : (
                  <>
                    <Link 
                      to="/login" 
                      onClick={() => setIsMenuOpen(false)} 
                      className="flex items-center gap-2 py-3 px-4 text-sm text-muted-foreground hover:bg-muted rounded-lg"
                    >
                      <User className="h-4 w-4" /> Sign In
                    </Link>
                    <Link 
                      to="/signup" 
                      onClick={() => setIsMenuOpen(false)} 
                      className="flex items-center gap-2 py-3 px-4 text-sm text-primary hover:bg-muted rounded-lg"
                    >
                      Create Account
                    </Link>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Navbar;