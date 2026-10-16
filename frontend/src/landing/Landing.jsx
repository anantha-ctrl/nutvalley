import { useEffect, useState } from 'react';
import { motion, useScroll, useSpring } from 'framer-motion';
import api from '../api/client';
import useLenis from './lib/useLenis';
import { IMG } from './lib/content';

import LandingNav from './components/LandingNav';
import Hero from './components/Hero';
import BrandIntro from './components/BrandIntro';
import CategorySection from './components/CategorySection';
import CollectionShowcase from './components/CollectionShowcase';
import BestSeller from './components/BestSeller';
import FeaturedCollection from './components/FeaturedCollection';
import NewArrival from './components/NewArrival';
import BrandStory from './components/BrandStory';
import InstagramGallery from './components/InstagramGallery';
import Newsletter from './components/Newsletter';
import LandingFooter from './components/LandingFooter';

export default function Landing() {
  useLenis(); // buttery smooth scroll for the whole page
  const [content, setContent] = useState(null); // admin-editable hero + story copy

  // Pull the live, admin-editable landing copy (falls back to built-in defaults).
  useEffect(() => {
    let active = true;
    const load = () => api.get('/api/landing').then((r) => {
      if (active) setContent(r.data.data);
    }).catch(() => { });
    load();
    const timer = setInterval(() => { if (document.visibilityState === 'visible') load(); }, 15000);
    return () => { active = false; clearInterval(timer); };
  }, []);

  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.4 });

  return (
    <div className="relative bg-luxe-bg font-sans text-luxe-ink antialiased dark:bg-ink dark:text-white">
      {/* Scroll progress bar */}
      <motion.div style={{ scaleX: progress }} className="fixed inset-x-0 top-0 z-[60] h-0.5 origin-left bg-gold-sheen" />

      <LandingNav />

      <main>
        <Hero content={content} />
        <BrandIntro image={content?.intro_image} stats={content?.stats} />
        <CategorySection />

        {/* Necklaces — featured collection block */}
        <CollectionShowcase
          index="01"
          eyebrow="Necklaces"
          title={['Layered.', 'Luminous.']}
          description="Handstrung beads, chokers and statement strands — pieces made to layer and to love."
          image={content?.men_image || IMG.men}
          to="/category/necklaces"
          cta="Explore Necklaces"
        />

        <BestSeller />
        <FeaturedCollection />
        <NewArrival image={content?.newarrival_image} />
        <BrandStory quote={content?.story_quote} />
        <InstagramGallery />
        <Newsletter />
      </main>

      <LandingFooter />
    </div>
  );
}
