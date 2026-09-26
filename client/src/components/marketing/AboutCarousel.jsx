import { useEffect, useRef, useState } from 'react';
import { FiArrowLeft, FiArrowRight } from 'react-icons/fi';

const slides = [
  { src: '/landing-templates/assets/crausel1.png', title: 'Learn from anywhere', detail: 'Interactive online tuition', shape: 'landscape' },
  { src: '/landing-templates/assets/crausel2.png', title: 'Explore science', detail: 'Live lessons and guided practice', shape: 'portrait' },
  { src: '/landing-templates/assets/crausel3.png', title: 'Revise with purpose', detail: 'Focused support for board exams', shape: 'portrait' },
  { src: '/landing-templates/assets/crausel4.png', title: 'Build digital skills', detail: 'A wider world of learning', shape: 'portrait' },
];

export default function AboutCarousel({ reducedMotion }) {
  const [active, setActive] = useState(0);
  const [visible, setVisible] = useState(false);
  const [paused, setPaused] = useState(false);
  const root = useRef(null);
  const touchStart = useRef(null);

  useEffect(() => {
    if (!root.current) return undefined;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.2 });
    observer.observe(root.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || paused || reducedMotion) return undefined;
    const timer = window.setInterval(() => setActive(index => (index + 1) % slides.length), 5200);
    return () => window.clearInterval(timer);
  }, [visible, paused, reducedMotion]);

  const go = (direction) => setActive(index => (index + direction + slides.length) % slides.length);

  return (
    <div ref={root} className="about-gallery" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false); }}>
      <div className="about-gallery__topline"><span>Inside Vettri Academy</span><span>0{active + 1} / 0{slides.length}</span></div>
      <div
        className="about-gallery__stage"
        role="region"
        aria-roledescription="carousel"
        aria-label="Vettri Academy programmes"
        onTouchStart={(event) => { touchStart.current = event.touches[0].clientX; }}
        onTouchEnd={(event) => {
          if (touchStart.current === null) return;
          const distance = event.changedTouches[0].clientX - touchStart.current;
          if (Math.abs(distance) > 45) go(distance < 0 ? 1 : -1);
          touchStart.current = null;
        }}
      >
        {slides.map((slide, index) => (
          <div key={slide.src} className={`about-gallery__slide ${index === active ? 'is-active' : ''}`} aria-hidden={index !== active}>
            <div className="about-gallery__wash" style={{ backgroundImage: `url(${slide.src})` }} />
            <img src={slide.src} alt={index === active ? `${slide.title}: ${slide.detail}` : ''} className={`about-gallery__image about-gallery__image--${slide.shape}`} loading="lazy" decoding="async" />
          </div>
        ))}
      </div>
      <div className="about-gallery__footer">
        <div className="about-gallery__caption" aria-live="polite">
          <span className="about-gallery__number">0{active + 1} / 0{slides.length}</span>
          <strong>{slides[active].title}</strong>
          <span>{slides[active].detail}</span>
        </div>
        <div className="about-gallery__arrows">
          <button type="button" onClick={() => go(-1)} aria-label="Previous image"><FiArrowLeft /></button>
          <button type="button" onClick={() => go(1)} aria-label="Next image"><FiArrowRight /></button>
        </div>
      </div>
      <div className="about-gallery__dots" aria-label="Choose image">
        {slides.map((slide, index) => <button type="button" key={slide.src} className={index === active ? 'is-active' : ''} onClick={() => setActive(index)} aria-label={`Show image ${index + 1}`} aria-current={index === active ? 'true' : undefined} />)}
      </div>
    </div>
  );
}
