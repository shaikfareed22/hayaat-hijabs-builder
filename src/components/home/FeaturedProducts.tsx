import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Heart, ShoppingBag, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

// Sample products - will be replaced with real data from Supabase
const sampleProducts = [
  {
    id: "1",
    name: "Silk Elegance Hijab",
    price: 49.99,
    rating: 4.8,
    fabric: "Pure Silk",
    color: "Blush Pink",
    image: "https://images.unsplash.com/photo-1590080876351-941da357a5ec?w=400&h=500&fit=crop",
    isNew: true,
  },
  {
    id: "2",
    name: "Chiffon Breeze Hijab",
    price: 34.99,
    rating: 4.6,
    fabric: "Premium Chiffon",
    color: "Cream",
    image: "https://images.unsplash.com/photo-1583316174775-bd6dc0e9f298?w=400&h=500&fit=crop",
    isNew: false,
  },
  {
    id: "3",
    name: "Jersey Comfort Hijab",
    price: 29.99,
    rating: 4.9,
    fabric: "Soft Jersey",
    color: "Dusty Rose",
    image: "https://images.unsplash.com/photo-1596783074918-c84cb06531ca?w=400&h=500&fit=crop",
    isNew: true,
  },
  {
    id: "4",
    name: "Cotton Everyday Hijab",
    price: 24.99,
    rating: 4.7,
    fabric: "Organic Cotton",
    color: "Sand Beige",
    image: "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=400&h=500&fit=crop",
    isNew: false,
  },
];

const ProductCard = ({ product, index }: { product: typeof sampleProducts[0]; index: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.1 }}
    viewport={{ once: true }}
    className="group"
  >
    <div className="relative overflow-hidden rounded-xl bg-muted aspect-[3/4] mb-4">
      <img
        src={product.image}
        alt={product.name}
        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        loading="lazy"
      />
      {product.isNew && (
        <span className="absolute top-3 left-3 bg-accent text-accent-foreground text-xs tracking-wider uppercase px-3 py-1 rounded-full font-medium">
          New
        </span>
      )}
      <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/10 transition-colors duration-300" />
      <div className="absolute bottom-3 left-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex gap-2">
        <Button size="sm" className="flex-1 rounded-full text-xs tracking-wider">
          <ShoppingBag className="h-3 w-3 mr-1" /> Add to Cart
        </Button>
        <Button size="icon" variant="secondary" className="rounded-full h-8 w-8">
          <Heart className="h-3 w-3" />
        </Button>
      </div>
    </div>
    <div>
      <p className="text-xs text-muted-foreground tracking-wider uppercase mb-1">{product.fabric}</p>
      <Link to={`/products/${product.id}`} className="font-medium text-foreground hover:text-muted-foreground transition-colors">
        {product.name}
      </Link>
      <div className="flex items-center justify-between mt-2">
        <span className="font-medium">${product.price}</span>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Star className="h-3 w-3 fill-current text-luxury-gold" />
          {product.rating}
        </div>
      </div>
    </div>
  </motion.div>
);

const FeaturedProducts = () => {
  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <p className="text-sm tracking-[0.3em] uppercase text-muted-foreground mb-2">Curated Selection</p>
          <h2 className="font-luxury text-4xl md:text-5xl">Featured Hijabs</h2>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
          {sampleProducts.map((product, index) => (
            <ProductCard key={product.id} product={product} index={index} />
          ))}
        </div>

        <div className="text-center mt-12">
          <Button asChild variant="outline" size="lg" className="tracking-wider uppercase text-xs px-8 rounded-full">
            <Link to="/shop">View All Products</Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default FeaturedProducts;
