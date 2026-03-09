import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const BrandStory = () => {
  return (
    <section className="py-20 bg-secondary">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-12 items-center max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <img
              src="https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=600&h=700&fit=crop"
              alt="Hayaat Hijabs craftsmanship"
              className="rounded-2xl w-full h-auto object-cover shadow-luxury"
              loading="lazy"
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <p className="text-sm tracking-[0.3em] uppercase text-muted-foreground mb-4">Our Story</p>
            <h2 className="font-luxury text-4xl mb-6">Crafted with<br /><span className="italic">Purpose & Love</span></h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Hayaat Hijabs was born from a passion for empowering women through elegant, 
              high-quality modest fashion. We believe every woman deserves to feel beautiful 
              and confident while staying true to her values.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-8">
              Each hijab in our collection is thoughtfully designed using the finest fabrics — 
              from luxurious silk to breathable organic cotton — ensuring comfort and 
              elegance in every fold.
            </p>
            <Button asChild variant="outline" className="tracking-wider uppercase text-xs px-8 rounded-full">
              <Link to="/about">Read Our Full Story</Link>
            </Button>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default BrandStory;
