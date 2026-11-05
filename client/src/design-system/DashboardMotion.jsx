import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);

export default function DashboardMotion({ children }) {
  const root = useRef(null);
  useLayoutEffect(() => {
    const media = gsap.matchMedia();
    media.add('(prefers-reduced-motion: no-preference)', () => {
      const context = gsap.context(() => {
        gsap.utils.toArray('.va-dashboard-secondary-grid > *, .va-dashboard-insights > *').forEach(element => {
          gsap.fromTo(element, { y: 18 }, { y: 0, duration: .55, ease: 'power2.out', scrollTrigger: { trigger: element, start: 'top 94%', once: true } });
        });
      }, root);
      return () => context.revert();
    });
    return () => media.revert();
  }, []);
  return <div ref={root} className="va-dashboard-stack">{children}</div>;
}
