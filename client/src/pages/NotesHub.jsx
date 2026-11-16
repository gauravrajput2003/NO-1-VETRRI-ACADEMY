import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, BookOpen, Check, MessageCircle, Sparkles } from 'lucide-react';
import academyLogo from '../assets/academy-logo.png';
import './notes-hub.css';

const whatsappHref = `https://wa.me/919047758389?text=${encodeURIComponent('Hi No.1 Vettri Academy, I’m interested in the Class 10 AI Mathematics guide. Please share the current price and access details.')}`;
const editions = [
  {
    id: 'cbse', title: 'CBSE Edition', subtitle: 'AI Mathematics · Class 10', image: '/notes/cbsemaths/cbse-cover.jpeg',
    description: 'A focused companion for CBSE learners, built around clear revision and purposeful exam practice.',
    points: ['NCERT examples and exercises', 'NCERT Exemplar solutions', 'Previous-year questions', 'MCQs and practice questions'],
    badge: 'CBSE · 2026–27', featured: true,
  },
  {
    id: 'matriculation', title: 'Matriculation Edition', subtitle: 'AI Mathematics · Class 10', image: '/notes/cbsemaths/matriculation-cover.jpeg',
    description: 'A visual guide to help Matriculation students understand concepts and practise each step with confidence.',
    points: ['Mind maps and key formulae', 'Worked examples with solutions', 'Exercise practice with solutions', 'Previous-year and creative questions'],
    badge: 'MATRICULATION · 2026–27', featured: false,
  },
];

const reveal = { hidden: { opacity: 0, y: 22 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } } };

export default function NotesHub() {
  useEffect(() => {
    const oldTitle = document.title;
    document.title = 'Class 10 Mathematics Notes | No.1 Vettri Academy';
    return () => { document.title = oldTitle; };
  }, []);

  return (
    <main className="nh-page">
      <header className="nh-header">
        <Link to="/" className="nh-brand" aria-label="No.1 Vettri Academy home"><img src={academyLogo} alt="" /><span>No.1 Vettri Academy<small>LEARN WITH CLARITY · SINCE 2003</small></span></Link>
        <nav aria-label="Math notes navigation"><a href="#editions">Choose your edition</a><a href="#inside">What’s inside</a><a className="nh-header-cta" href={whatsappHref} target="_blank" rel="noreferrer"><MessageCircle size={17} /> Ask on WhatsApp</a></nav>
      </header>

      <section className="nh-hero">
        <div className="nh-hero-copy">
          <motion.span className="nh-eyebrow" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>CLASS 10 · MATHEMATICS · 2026–27</motion.span>
          <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .06 }}>Maths made clear.<br /><em>Confidence, built step by step.</em></motion.h1>
          <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .14 }}>Explore the No.1 Vettri AI Mathematics guide for Class 10. Choose the edition that matches your syllabus: CBSE or Matriculation.</motion.p>
          <motion.div className="nh-hero-actions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: .22 }}><a className="nh-button nh-button-primary" href="#editions">Choose your edition <ArrowRight size={19} /></a><a className="nh-button nh-button-quiet" href={whatsappHref} target="_blank" rel="noreferrer"><MessageCircle size={18} /> Ask about the guide</a></motion.div>
          <div className="nh-hero-points"><span><BookOpen /> Mind maps & key formulae</span><span><Check /> Worked examples & practice</span><span><Sparkles /> Prepared with educators</span></div>
        </div>
        <motion.div className="nh-hero-art" initial={{ opacity: 0, scale: .96, rotate: 1 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} transition={{ duration: .7, delay: .12 }}>
          <div className="nh-art-halo" /><div className="nh-art-orbit nh-orbit-a" /><div className="nh-art-orbit nh-orbit-b" />
          <div className="nh-hero-book"><img src="/notes/cbsemaths/cbse-cover.jpeg" alt="No.1 Vettri AI Mathematics CBSE Class 10 guide cover" /></div>
          <div className="nh-art-note"><span>10<sup>TH</sup></span><small>THINK · PRACTISE<br />PROGRESS</small></div>
          <div className="nh-art-tag">CBSE MATHEMATICS <i>·</i> CLASS 10</div>
        </motion.div>
      </section>

      <section className="nh-value-strip" id="inside"><span>UNDERSTAND THE CONCEPT</span><i>✳</i><span>FOLLOW THE SOLUTION</span><i>✳</i><span>PRACTISE WITH PURPOSE</span></section>

      <section className="nh-editions" id="editions">
        <motion.div className="nh-section-title" variants={reveal} initial="hidden" whileInView="visible" viewport={{ once: true, amount: .2 }}><span className="nh-eyebrow">TWO EDITIONS · ONE STRONG FOUNDATION</span><h2>Choose the guide<br />for <em>your board.</em></h2><p>Both guides are made for Class 10 Mathematics. Select the syllabus that matches the student’s school.</p></motion.div>
        <div className="nh-edition-grid">
          {editions.map((edition, index) => <motion.article key={edition.id} className={`nh-edition-card${edition.featured ? ' nh-edition-featured' : ''}`} variants={reveal} initial="hidden" whileInView="visible" viewport={{ once: true, amount: .15 }} transition={{ delay: index * .1 }}>
            <div className="nh-edition-cover"><img src={edition.image} alt={`No.1 Vettri ${edition.title} Class 10 AI Mathematics guide cover`} /><span>{edition.badge}</span></div>
            <div className="nh-edition-info"><span className="nh-edition-kicker">CLASS 10 · MATHEMATICS</span><h3>{edition.title}</h3><b className="nh-edition-subtitle">{edition.subtitle}</b><p>{edition.description}</p><ul>{edition.points.map((point) => <li key={point}><Check size={17} />{point}</li>)}</ul><Link className="nh-button nh-edition-button" to="/notes/cbsemaths">View guide details <ArrowRight size={18} /></Link></div>
          </motion.article>)}
        </div>
        <p className="nh-price-note">Message the academy to confirm the current price and delivery details before payment.</p>
      </section>

      <section className="nh-final-cta"><div><span className="nh-eyebrow">NOT SURE WHICH EDITION TO CHOOSE?</span><h2>We’ll help you find<br /><em>the right guide.</em></h2><p>Tell us the student’s board and class. Our team will share the matching edition and access details.</p><a className="nh-button nh-button-primary" href={whatsappHref} target="_blank" rel="noreferrer"><MessageCircle size={18} /> Chat with the academy <ArrowRight size={18} /></a></div></section>

      <footer className="nh-footer"><Link to="/" className="nh-brand"><img src={academyLogo} alt="" /><span>No.1 Vettri Academy<small>LEARN WITH CLARITY · SINCE 2003</small></span></Link><span>Class 10 Mathematics · CBSE & Matriculation</span><a href={whatsappHref} target="_blank" rel="noreferrer">WhatsApp us <ArrowRight size={16} /></a></footer>
    </main>
  );
}
