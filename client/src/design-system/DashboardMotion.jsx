import { useLayoutEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);

export default function DashboardMotion({ children }) {
  const root = useRef(null);
  const reducedMotion = useReducedMotion();
  useLayoutEffect(() => {
    const media = gsap.matchMedia();
    media.add('(prefers-reduced-motion: no-preference)', () => {
      const context = gsap.context(() => {
        gsap.utils.toArray('.va-dashboard-secondary-grid > *, .va-dashboard-insights > *, [data-dashboard-reveal]').forEach(element => {
          gsap.fromTo(element, { y: 18 }, { y: 0, duration: .55, ease: 'power2.out', scrollTrigger: { trigger: element, start: 'top 94%', once: true } });
        });
      }, root);
      return () => context.revert();
    });
    return () => media.revert();
  }, []);
  return <motion.div ref={root} className="va-dashboard-stack" initial={reducedMotion ? false : { opacity: 0.85 }} animate={{ opacity: 1 }} transition={{ duration: reducedMotion ? 0 : 0.24 }}>{children}</motion.div>;
}
