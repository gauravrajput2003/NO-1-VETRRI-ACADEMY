import { useState } from 'react';
import { FiArrowLeft, FiCpu, FiSend } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { askVettriAI } from '../../services/api';
import toast from 'react-hot-toast';

export default function VettriAIPage() {
  const navigate = useNavigate();
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

  return (
    <div className="fixed md:relative inset-x-0 top-[72px] bottom-[64px] md:inset-auto md:h-[calc(100vh-160px)] min-h-0 md:min-h-[500px] bg-[#0F1F35] rounded-none md:rounded-2xl border-y md:border border-[#1E3A5F] overflow-hidden flex flex-col z-50">
      <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 text-white/70 hover:text-white flex items-center justify-center"
            aria-label="Go back"
          >
            <FiArrowLeft size={15} />
          </button>
          <span className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-400/40 flex items-center justify-center">
            <FiCpu className="text-purple-300" size={16} />
          </span>
          <div>
            <h3 className="text-white text-sm font-semibold">Vettri AI</h3>
            <p className="text-white/50 text-xs">Ask in English or Tamil / ஆங்கிலம் அல்லது தமிழில் கேளுங்கள்</p>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-4 h-full overflow-y-auto overscroll-contain">
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

        <div className="rounded-xl border border-white/10 bg-white/5 p-4 min-h-[180px] max-h-[52vh] md:max-h-[320px] overflow-y-auto overscroll-contain">
          {answer ? (
            <p className="text-sm text-white/85 whitespace-pre-wrap leading-relaxed">{answer}</p>
          ) : (
            <p className="text-sm text-white/45">Your response will appear here.</p>
          )}
        </div>
      </div>
    </div>
  );
}
