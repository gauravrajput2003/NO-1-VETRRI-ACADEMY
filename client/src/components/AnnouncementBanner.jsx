import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX } from 'react-icons/fi';
import { getAnnouncements } from '../services/api';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';

export default function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState([]);
  const [dismissed, setDismissed] = useState(new Set());
  const { socket } = useSocket();
  const { user } = useAuth();

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handler = ({ announcement }) => {
      // Check if targeted at this user
      if (
        announcement.targetRole === 'all' ||
        announcement.targetRole === user?.role
      ) {
        setAnnouncements((prev) => [announcement, ...prev]);
      }
    };
    socket.on('announcement:new', handler);
    return () => socket.off('announcement:new', handler);
  }, [socket, user]);

  const fetchAnnouncements = async () => {
    try {
      const { data } = await getAnnouncements();
      if (data.success) setAnnouncements(data.announcements || []);
    } catch {}
  };

  const visible = announcements.filter((a) => !dismissed.has(a._id));
  if (!visible.length) return null;

  return (
    <div className="space-y-2 mb-4 no-print">
      <AnimatePresence>
        {visible.slice(0, 3).map((ann) => (
          <motion.div
            key={ann._id}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            className="flex items-start gap-3 px-4 py-3 rounded-xl border border-gold/20 bg-gold/5"
          >
            <span className="text-gold flex-shrink-0 mt-0.5 text-base leading-none">📢</span>
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm">{ann.title}</p>
              <p className="text-white/60 text-xs mt-0.5 line-clamp-2">{ann.content}</p>
            </div>
            <button
              onClick={() => setDismissed((d) => new Set([...d, ann._id]))}
              className="text-white/30 hover:text-white/60 flex-shrink-0 p-0.5"
            >
              <FiX size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
