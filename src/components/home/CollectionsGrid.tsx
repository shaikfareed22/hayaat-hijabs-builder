import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

const collections = [
  {
    name: "Silk Collection",
    description: "Luxurious pure silk hijabs",
    image: "https://images.unsplash.com/photo-1583316174775-bd6dc0e9f298?w=600&h=800&fit=crop",
    link: "/collections/silk",
  },
  {
    name: "Everyday Essentials",
    description: "Comfortable daily wear",
    image: "https://images.unsplash.com/photo-1590080876351-941da357a5ec?w=600&h=400&fit=crop",
    link: "/collections/everyday",
  },
  {
    name: "Limited Edition",
    description: "Exclusive designs",
    image: "https://images.unsplash.com/photo-1596783074918-c84cb06531ca?w=600&h=400&fit=crop",
    link: "/collections/limited",
  },
];

const CollectionsGrid = () => {
  return (
    <section className="py-20 bg-secondary">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <p className="text-sm tracking-[0.3em] uppercase text-muted-foreground mb-2">Explore</p>
          <h2 className="font-luxury text-4xl md:text-5xl">Our Collections</h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-4 md:gap-6">
          {collections.map((collection, index) => (
            <motion.div
              key={collection.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.15 }}
              viewport={{ once: true }}
            >
              <Link
                to={collection.link}
                className={`group relative overflow-hidden rounded-2xl block ${
                  index === 0 ? "md:row-span-2 aspect-[3/4]" : "aspect-[3/2]"
                }`}
              >
                <img
                  src={collection.image}
                  alt={collection.name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 via-foreground/10 to-transparent" />
                <div className="absolute bottom-6 left-6 right-6 text-background">
                  <p className="text-xs tracking-wider uppercase opacity-80 mb-1">{collection.description}</p>
                  <div className="flex items-center justify-between">
                    <h3 className="font-luxury text-2xl">{collection.name}</h3>
                    <ArrowRight className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-1 duration-300" />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CollectionsGrid;
