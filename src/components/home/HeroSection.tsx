import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import heroImage from "@/assets/hero-hijab.jpg";

const HeroSection = () => {
  return (
    <section className="relative min-h-[85vh] flex items-center overflow-hidden">
      {/* Background image */}
      <div className="absolute inset-0">
        <img
          src={heroImage}
          alt="Elegant woman wearing a luxury Hayaat hijab"
          className="w-full h-full object-cover"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-background/50 to-transparent" />
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="max-w-xl"
        >
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-sm tracking-[0.3em] uppercase text-muted-foreground mb-4"
          >
            Premium Modest Fashion
          </motion.p>
          <h1 className="font-luxury text-5xl md:text-7xl leading-tight mb-6 text-foreground">
            Elegance in<br />
            <span className="italic">Every Fold</span>
          </h1>
          <p className="text-lg text-muted-foreground mb-8 max-w-md leading-relaxed">
            Discover our curated collection of premium hijabs crafted with the finest fabrics
            for the modern, confident woman.
          </p>
          <div className="flex flex-wrap gap-4">
            <Button asChild size="lg" className="tracking-wider uppercase text-xs px-8 py-6 rounded-full">
              <Link to="/login">
                Shop Now <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="tracking-wider uppercase text-xs px-8 py-6 rounded-full">
              <Link to="/collections">
                View Collections
              </Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
