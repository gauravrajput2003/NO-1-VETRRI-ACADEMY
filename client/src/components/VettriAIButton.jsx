import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import { FiCpu, FiSend, FiX } from 'react-icons/fi';
import { useLocation, useNavigate } from 'react-router-dom';
import { askVettriAI } from '../services/api';
import toast from 'react-hot-toast';

export default function VettriAIButton() {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAsk = async () => {
    const trimmed = question.trim();
    if (!trimmed) {
      toast.error('Please enter your question / உங்கள் கேள்வியை உள்ளிடவும்.');
      return;
    }

    try {
      setLoading(true);
      const { data } = await askVettriAI(trimmed);
      if (data.success) setAnswer(data.answer || 'No response received.');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Vettri AI is unavailable right now.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleOpen = () => {
    if (typeof window !== 'undefined' && window.innerWidth <= 1024) {
      const path = location.pathname || '';
      if (path.endsWith('/ai')) return;
      if (path.startsWith('/student')) {
        navigate('/student/ai');
        return;
      }
      if (path.startsWith('/teacher')) {
        navigate('/teacher/ai');
        return;
      }
    }
    setOpen(true);
  };

  return (
    <>
      <button
        onClick={handleOpen}
        className="relative p-2 rounded-lg bg-purple-500/10 border border-purple-400/30 hover:bg-purple-500/20 transition-all"
        aria-label="Open Vettri AI"
        id="vettri-ai-button"
        title="Ask Vettri AI"
      >
        <FiCpu size={18} className="text-purple-300" />
      </button>

      <AnimatePresence>
        {open && createPortal(
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-[1200]"
              onClick={handleClose}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 14 }}
              transition={{ duration: 0.18 }}
              className="fixed z-[1210] inset-x-0 top-[68px] bottom-[72px] rounded-none bg-[#0A1628] shadow-2xl overflow-hidden md:inset-auto md:left-1/2 md:top-1/2 md:bottom-auto md:w-[92vw] md:max-w-2xl md:h-auto md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl md:border md:border-white/15"
            >
              <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-400/40 flex items-center justify-center">
                    <FiCpu className="text-purple-300" size={16} />
                  </span>
                  <div>
                    <h3 className="text-white text-sm font-semibold">Vettri AI</h3>
                    <p className="text-white/50 text-xs">Ask in English or Tamil / ஆங்கிலம் அல்லது தமிழில் கேளுங்கள்</p>
                  </div>
                </div>
                <button onClick={handleClose} className="text-white/60 hover:text-white transition-colors" aria-label="Close Vettri AI">
                  <FiX size={18} />
                </button>
              </div>

              <div className="p-5 space-y-4 h-full md:h-auto overflow-y-auto overscroll-contain">
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  rows={4}
                  className="w-full rounded-xl bg-white/5 border border-white/15 text-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400/40 resize-none max-h-40 overflow-y-auto"
                  placeholder="Example: Explain Newton's laws / நியூட்டனின் இயக்க விதிகளை எளிதாக விளக்கவும்"
                  maxLength={2000}
                />

                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-white/40">{question.length}/2000</span>
                  <button
                    onClick={handleAsk}
                    disabled={loading}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-sm font-semibold hover:opacity-95 disabled:opacity-60"
                  >
                    <FiSend size={14} />
                    {loading ? 'Thinking...' : 'Ask Vettri AI / கேள்'}
                  </button>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/5 p-4 min-h-[180px] max-h-[46vh] md:max-h-[320px] overflow-y-auto overscroll-contain">
                  {answer ? (
                    <p className="text-sm text-white/85 whitespace-pre-wrap leading-relaxed">{answer}</p>
                  ) : (
                    <p className="text-sm text-white/45">Your response will appear here.</p>
                  )}
                </div>
              </div>
            </motion.div>
          </>,
          document.body
        )}
      </AnimatePresence>
    </>
  );
}
