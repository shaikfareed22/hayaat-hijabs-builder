import { Link } from "react-router-dom";
import { Instagram, Facebook, Twitter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const Footer = () => {
  return (
    <footer className="bg-secondary border-t border-border">
      {/* Newsletter section */}
      <div className="container mx-auto px-4 py-16 text-center">
        <h3 className="font-luxury text-3xl mb-2">Stay Connected</h3>
        <p className="text-muted-foreground text-sm mb-6 max-w-md mx-auto">
          Subscribe for exclusive collections, styling tips, and special offers.
        </p>
        <form className="flex gap-2 max-w-md mx-auto">
          <Input placeholder="Enter your email" type="email" className="flex-1" />
          <Button className="tracking-wider uppercase text-xs px-6">Subscribe</Button>
        </form>
      </div>

      {/* Links */}
      <div className="border-t border-border">
        <div className="container mx-auto px-4 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <h4 className="font-luxury text-lg mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/shop" className="hover:text-foreground transition-colors">Shop All</Link></li>
              <li><Link to="/new-arrivals" className="hover:text-foreground transition-colors">New Arrivals</Link></li>
              <li><Link to="/collections" className="hover:text-foreground transition-colors">Collections</Link></li>
              <li><Link to="/guides" className="hover:text-foreground transition-colors">Style Guides</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-luxury text-lg mb-4">Customer Care</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/contact" className="hover:text-foreground transition-colors">Contact Us</Link></li>
              <li><Link to="/size-guide" className="hover:text-foreground transition-colors">Size Guide</Link></li>
              <li><Link to="/shipping" className="hover:text-foreground transition-colors">Shipping Info</Link></li>
              <li><Link to="/returns" className="hover:text-foreground transition-colors">Returns</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-luxury text-lg mb-4">About</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/about" className="hover:text-foreground transition-colors">Our Story</Link></li>
              <li><Link to="/sustainability" className="hover:text-foreground transition-colors">Sustainability</Link></li>
              <li><Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-foreground transition-colors">Terms & Conditions</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-luxury text-lg mb-4">Follow Us</h4>
            <div className="flex gap-4 mb-4">
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                <Twitter className="h-5 w-5" />
              </a>
            </div>
            <p className="text-sm text-muted-foreground">
              WhatsApp Support<br />
              +1 (555) 123-4567
            </p>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        <p>© 2026 Hayaat Hijabs. All rights reserved. Elegance in Every Fold.</p>
      </div>
    </footer>
  );
};

export default Footer;
