import { motion } from "framer-motion";
import { Star } from "lucide-react";

const testimonials = [
  {
    name: "Fatima A.",
    text: "The silk hijabs are absolutely divine. The quality is unmatched and the colors are so elegant. My go-to brand now!",
    rating: 5,
    location: "Dubai, UAE",
  },
  {
    name: "Aisha M.",
    text: "I love how lightweight and comfortable the chiffon hijabs are. Perfect for everyday wear and special occasions.",
    rating: 5,
    location: "London, UK",
  },
  {
    name: "Sarah K.",
    text: "The packaging, the quality, the customer service — everything about Hayaat Hijabs screams luxury. Highly recommend!",
    rating: 5,
    location: "Toronto, Canada",
  },
];

const TestimonialsSection = () => {
  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <p className="text-sm tracking-[0.3em] uppercase text-muted-foreground mb-2">What Our Customers Say</p>
          <h2 className="font-luxury text-4xl md:text-5xl">Loved by Women Worldwide</h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.15 }}
              viewport={{ once: true }}
              className="bg-card border border-border rounded-2xl p-8 text-center"
            >
              <div className="flex justify-center gap-1 mb-4">
                {Array.from({ length: testimonial.rating }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-current text-luxury-gold" />
                ))}
              </div>
              <p className="text-muted-foreground leading-relaxed mb-6 italic">
                "{testimonial.text}"
              </p>
              <p className="font-medium text-foreground">{testimonial.name}</p>
              <p className="text-xs text-muted-foreground">{testimonial.location}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
