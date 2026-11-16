import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowDown, ArrowRight, BookOpen, Check, Clock3, Menu,
  MessageCircle, QrCode, Sparkles, X,
} from 'lucide-react';
import academyLogo from '../assets/academy-logo.png';
import './cbse-maths-notes.css';

const WHATSAPP = 'https://wa.me/919047758389';
const whatsappMessage = encodeURIComponent(
  'Hi No.1 Vettri Academy, I’m interested in the Class 10 AI Mathematics guide. Please share the current price and how I can get the notes.'
);
const whatsAppHref = `${WHATSAPP}?text=${whatsappMessage}`;

const chapters = [
  'Real Numbers', 'Polynomials', 'Pair of Linear Equations', 'Quadratic Equations',
  'Arithmetic Progressions', 'Triangles', 'Coordinate Geometry', 'Trigonometry',
  'Circles & Constructions', 'Areas, Surface Areas & Volumes', 'Statistics & Probability',
];

const reveal = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
};

function AccessDialog({ onClose }) {
  useEffect(() => {
    const onKeyDown = (event) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <motion.div className="cmn-dialog-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <motion.section className="cmn-dialog" role="dialog" aria-modal="true" aria-labelledby="cmn-dialog-title" initial={{ opacity: 0, y: 18, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.98 }}>
        <button className="cmn-dialog-close" type="button" onClick={onClose} aria-label="Close access options"><X size={20} /></button>
        <span className="cmn-eyebrow"><Sparkles size={15} /> GET YOUR GUIDE</span>
        <h2 id="cmn-dialog-title">Choose how you’d like to get the notes</h2>
        <p className="cmn-dialog-intro">Our team will confirm the current price and help you receive the right edition.</p>
        <a className="cmn-access-option cmn-access-whatsapp" href={whatsAppHref} target="_blank" rel="noreferrer">
          <span className="cmn-option-icon"><MessageCircle size={22} /></span>
          <span><strong>Ask us on WhatsApp</strong><small>Confirm price, edition and delivery with our team</small></span>
          <ArrowRight size={19} />
        </a>
        <div className="cmn-payment-option">
          <div className="cmn-payment-copy"><span className="cmn-option-icon cmn-qr-icon"><QrCode size={21} /></span><span><strong>Pay by UPI QR</strong><small>Confirm the amount with us before making payment.</small></span></div>
          <img src="/notes/cbsemaths/payment-qr.jpeg" alt="UPI payment QR code for No.1 Vettri Academy" />
          <p>After payment, send the receipt and your preferred edition on WhatsApp so we can arrange access.</p>
          <a className="cmn-button cmn-button-outline cmn-receipt-button" href={`${WHATSAPP}?text=${encodeURIComponent('Hi No.1 Vettri Academy, I have paid for the Class 10 AI Mathematics guide. I’m sharing my payment receipt here. Please help me access the notes.')}`} target="_blank" rel="noreferrer">I’ve paid — send receipt <ArrowRight size={17} /></a>
        </div>
        <p className="cmn-secure-note"><Check size={15} /> Access is shared by the academy after confirmation.</p>
      </motion.section>
    </motion.div>
  );
}

export default function CbseMathsNotes() {
  const [accessOpen, setAccessOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const oldTitle = document.title;
    document.title = 'Class 10 AI Mathematics Guide | No.1 Vettri Academy';
    return () => { document.title = oldTitle; };
  }, []);

  return (
    <main className="cmn-page">
      <div className="cmn-grain" aria-hidden="true" />
      <header className={`cmn-nav${mobileMenuOpen ? ' cmn-nav-open' : ''}`}>
        <a className="cmn-brand" href="/" aria-label="No.1 Vettri Academy home"><span className="cmn-brand-mark"><img src={academyLogo} alt="" /></span><span>No.1 Vettri <small>ACADEMY · SINCE 2003</small></span></a>
        <nav className="cmn-nav-links" aria-label="Page navigation"><a href="#inside" onClick={() => setMobileMenuOpen(false)}>Inside the guide</a><a href="#samples" onClick={() => setMobileMenuOpen(false)}>Sample pages</a></nav>
        <div className="cmn-nav-actions"><button className="cmn-nav-cta" type="button" onClick={() => { setMobileMenuOpen(false); setAccessOpen(true); }}>Get the guide <ArrowRight size={17} /></button><button className="cmn-menu-toggle" type="button" aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={mobileMenuOpen} onClick={() => setMobileMenuOpen((open) => !open)}>{mobileMenuOpen ? <X size={21} /> : <Menu size={21} />}</button></div>
      </header>

      <section className="cmn-hero">
        <div className="cmn-hero-copy">
          <motion.div className="cmn-kicker" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.45 }}><span /> CLASS 10 · 2026–27 EDITION</motion.div>
          <motion.h1 initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65, delay: 0.08 }}>MATHEMATICS,<br /><em>made clear.</em></motion.h1>
          <motion.p className="cmn-hero-lead" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.18 }}>A complete AI-powered maths guide for Class 10 students—built to turn difficult chapters into clear ideas, confident practice and exam-ready revision.</motion.p>
          <motion.div className="cmn-hero-actions" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.28 }}>
            <button className="cmn-button cmn-button-primary" type="button" onClick={() => setAccessOpen(true)}>Explore access options <ArrowRight size={18} /></button>
            <a className="cmn-text-link" href="#samples">See sample pages <ArrowDown size={16} /></a>
          </motion.div>
          <motion.div className="cmn-hero-note" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.48 }}><span className="cmn-avatar-stack"><i>V</i><i>10</i><i>∑</i></span><span>Thoughtfully prepared by educators<br /><b>for students, parents and teachers</b></span></motion.div>
        </div>
        <motion.div className="cmn-hero-art" initial={{ opacity: 0, y: 26, rotate: 1.5 }} animate={{ opacity: 1, y: 0, rotate: 0 }} transition={{ duration: 0.8, delay: 0.12, ease: 'easeOut' }}>
          <div className="cmn-art-glow" />
          <div className="cmn-orbit cmn-orbit-one" /><div className="cmn-orbit cmn-orbit-two" />
          <motion.div className="cmn-cover-float" animate={{ y: [0, -8, 0], rotate: [0, 0.7, 0] }} transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }}><img src="/notes/cbsemaths/cbse-cover.jpeg" alt="No.1 Vettri’s AI Mathematics CBSE Class 10 guide cover" /></motion.div>
          <div className="cmn-art-sticker"><Sparkles size={15} /> LEARN · PRACTICE · GROW</div>
          <div className="cmn-edition-chip"><span>2 editions</span><small>CBSE + Matriculation</small></div>
        </motion.div>
        <div className="cmn-hero-bottom"><span>GOOD MATHS STARTS WITH CLARITY</span><span>01 / YOUR CLASS 10 COMPANION</span></div>
      </section>

      <section className="cmn-proof-strip" aria-label="Guide highlights"><div><span>01</span><b>Understand</b><small>Concepts made visual</small></div><div><span>02</span><b>Work through</b><small>Step-by-step solutions</small></div><div><span>03</span><b>Get exam-ready</b><small>Practise with purpose</small></div></section>

      <section className="cmn-section cmn-inside" id="inside">
        <motion.div className="cmn-section-heading" variants={reveal} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.25 }}><span className="cmn-eyebrow">A BETTER WAY TO REVISE</span><h2>From “I don’t get it”<br />to <em>“I can solve this.”</em></h2><p>Clear explanations and visual revision aids help students build understanding chapter by chapter—with a parent-friendly structure that makes progress easier to follow.</p></motion.div>
        <div className="cmn-feature-grid">
          <motion.article className="cmn-feature-card cmn-feature-teal" variants={reveal} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }}><span className="cmn-feature-no">01 / UNDERSTAND</span><div className="cmn-feature-symbol">∑</div><h3>See the idea behind the formula</h3><p>Mind maps and important formulae put the chapter’s key ideas in one clear view.</p></motion.article>
          <motion.article className="cmn-feature-card cmn-feature-pink" variants={reveal} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} transition={{ delay: 0.08 }}><span className="cmn-feature-no">02 / PRACTISE</span><div className="cmn-feature-symbol">✳</div><h3>Learn by solving, step by step</h3><p>Worked examples and exercise solutions guide students through the method, not just the answer.</p></motion.article>
          <motion.article className="cmn-feature-card cmn-feature-gold" variants={reveal} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} transition={{ delay: 0.16 }}><span className="cmn-feature-no">03 / PREPARE</span><div className="cmn-feature-symbol">✓</div><h3>Practise for the paper ahead</h3><p>Use MCQs, practice questions and previous-year questions to revise with focus.</p></motion.article>
        </div>
      </section>

      <section className="cmn-editions-section">
        <div className="cmn-editions-inner">
          <motion.div className="cmn-editions-copy" variants={reveal} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.25 }}><span className="cmn-eyebrow">ONE STRONG FOUNDATION</span><h2>Choose the edition<br />that fits your <em>classroom.</em></h2><p>Two Class 10 editions, each designed around its board’s learning and practice needs.</p><button type="button" className="cmn-button cmn-button-dark" onClick={() => setAccessOpen(true)}>Ask which edition is right <ArrowRight size={17} /></button></motion.div>
          <motion.div className="cmn-edition-books" variants={reveal} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.18 }}>
            <article className="cmn-edition-book cmn-book-cbse"><div className="cmn-book-img"><img src="/notes/cbsemaths/cbse-cover.jpeg" alt="CBSE Class 10 AI Mathematics guide cover" /></div><div className="cmn-book-label"><span>CBSE · CLASS 10</span><b>NCERT-aligned<br />practice & revision</b><small>Examples · Exercises · Exemplar · MCQs</small></div></article>
            <article className="cmn-edition-book cmn-book-matric"><div className="cmn-book-img"><img src="/notes/cbsemaths/matriculation-cover.jpeg" alt="Matriculation Class 10 AI Mathematics guide cover" /></div><div className="cmn-book-label"><span>MATRICULATION · CLASS 10</span><b>Learn today.<br />Feel ready tomorrow.</b><small>Worked examples · Practice · Past questions</small></div></article>
          </motion.div>
        </div>
      </section>

      <section className="cmn-section cmn-samples" id="samples">
        <motion.div className="cmn-samples-heading" variants={reveal} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.25 }}><div><span className="cmn-eyebrow">A LOOK INSIDE</span><h2>Made to make maths <em>click.</em></h2></div><p>Explore sample mind maps from the guide. Each page brings definitions, formulae and examples together for quick, visual revision.</p></motion.div>
        <div className="cmn-sample-grid">
          <motion.figure className="cmn-sample-card" variants={reveal} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.18 }}><div className="cmn-sample-image"><img src="/notes/cbsemaths/sample-real-numbers.png" alt="Sample guide page showing Real Numbers mind map and important formulae" loading="lazy" /></div><figcaption><span>CHAPTER 01</span><b>Real Numbers</b><small>Key concepts · Prime factorisation · Rational & irrational numbers</small></figcaption></motion.figure>
          <motion.figure className="cmn-sample-card" variants={reveal} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.18 }} transition={{ delay: 0.1 }}><div className="cmn-sample-image"><img src="/notes/cbsemaths/sample-polynomials.png" alt="Sample guide page showing Polynomials mind map and important formulae" loading="lazy" /></div><figcaption><span>CHAPTER 02</span><b>Polynomials</b><small>Degrees · Types · Graphs · Key forms and examples</small></figcaption></motion.figure>
        </div>
        <div className="cmn-chapter-line"><BookOpen size={19} /><b>Build your revision chapter by chapter</b><span>{chapters.slice(0, 5).join('  ·  ')}  ·  and more</span></div>
      </section>

      <section className="cmn-parent-note">
        <motion.div className="cmn-parent-note-inner" variants={reveal} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.25 }}><div className="cmn-parent-quote-mark">“</div><div><span className="cmn-eyebrow">FOR THE PEOPLE BEHIND EVERY STUDENT</span><h2>Give them a guide.<br /><em>Let confidence grow.</em></h2><p>When a student can see the steps, practise at their own pace and revisit a chapter with clarity, maths feels more manageable. That’s the idea behind this guide.</p><span className="cmn-since">NO.1 VETTRI ACADEMY <i>·</i> SUPPORTING LEARNERS SINCE 2003</span></div><div className="cmn-parent-doodle">10<sup>th</sup><span>YOU’VE<br />GOT THIS</span></div></motion.div>
      </section>

      <section className="cmn-chapters-section">
        <div className="cmn-chapters-wrap"><motion.div variants={reveal} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }}><span className="cmn-eyebrow">THE FULL SYLLABUS, IN VIEW</span><h2>Stay on track,<br /><em>one chapter at a time.</em></h2><p>Designed to support steady revision across the Class 10 mathematics syllabus.</p></motion.div><div className="cmn-chapter-list">{chapters.map((chapter, index) => <motion.div key={chapter} variants={reveal} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.4 }} transition={{ delay: Math.min(index * 0.025, 0.22) }}><span>{String(index + 1).padStart(2, '0')}</span>{chapter}<Check size={15} /></motion.div>)}</div></div>
      </section>

      <section className="cmn-final-cta" id="get-notes"><div className="cmn-final-spark cmn-final-spark-one">✳</div><div className="cmn-final-spark cmn-final-spark-two">＋</div><motion.div variants={reveal} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }}><span className="cmn-eyebrow">A SMALL STEP TOWARD BIGGER CONFIDENCE</span><h2>Make this the year<br />maths <em>makes sense.</em></h2><p>Ask our team about the CBSE or Matriculation Class 10 AI Mathematics guide.</p><button className="cmn-button cmn-button-primary" type="button" onClick={() => setAccessOpen(true)}>Get access details <ArrowRight size={18} /></button><small><Clock3 size={14} /> Our team will confirm price and delivery before payment.</small></motion.div></section>

      <footer className="cmn-footer"><a className="cmn-brand" href="/" aria-label="No.1 Vettri Academy home"><span className="cmn-brand-mark"><img src={academyLogo} alt="" /></span><span>No.1 Vettri <small>ACADEMY · SINCE 2003</small></span></a><span>Clear learning. Confident futures.</span><a href={whatsAppHref} target="_blank" rel="noreferrer">Talk to our team <ArrowRight size={15} /></a></footer>

      <AnimatePresence>{accessOpen && <AccessDialog onClose={() => setAccessOpen(false)} />}</AnimatePresence>
    </main>
  );
}
