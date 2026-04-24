import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiBell, FiCheck } from 'react-icons/fi';
import { useSocket } from '../context/SocketContext';
import { getNotifications, getNotificationUnreadCount, markAllNotificationsRead, markNotificationRead } from '../services/api';
import { useNavigate } from 'react-router-dom';

const typeIcons = {
  class_starting: '🔔',
  new_score: '📊',
  recording_available: '🎬',
  material_unlocked: '📚',
  leave_approved: '✅',
  leave_rejected: '❌',
  fee_reminder: '💰',
  new_message: '💬',
  class_cancelled: '🚫',
};

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const { socket } = useSocket();
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();
  }, []);

  // Real-time
  useEffect(() => {
    if (!socket) return;
    const handler = (notif) => {
      setNotifications((prev) => [notif, ...prev].slice(0, 20));
      setUnreadCount((c) => c + 1);
    };
    socket.on('notification:new', handler);
    return () => socket.off('notification:new', handler);
  }, [socket]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (!dropdownRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchNotifications = async () => {
    try {
      const { data } = await getNotifications();
      if (data.success) setNotifications(data.notifications);
    } catch {}
  };

  const fetchUnreadCount = async () => {
    try {
      const { data } = await getNotificationUnreadCount();
      if (data.success) setUnreadCount(data.count);
    } catch {}
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead();
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const handleClick = async (notif) => {
    if (!notif.isRead) {
      await markNotificationRead(notif._id);
      setUnreadCount((c) => Math.max(0, c - 1));
      setNotifications((prev) => prev.map((n) => n._id === notif._id ? { ...n, isRead: true } : n));
    }
    if (notif.link) navigate(notif.link);
    setOpen(false);
  };

  const timeAgo = (date) => {
    const diff = (Date.now() - new Date(date)) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div className="relative no-print" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-white/10 transition-all"
        aria-label="Notifications"
        id="notification-bell"
      >
        <FiBell size={20} className="text-white/70" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-80 bg-navy-light border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden"
            style={{ background: '#0d1f3c' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <h3 className="text-white font-semibold text-sm">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-xs text-gold/80 hover:text-gold flex items-center gap-1 transition-colors"
                >
                  <FiCheck size={12} />
                  Mark all read
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-white/40 text-sm">
                  <FiBell size={28} className="mx-auto mb-2 opacity-30" />
                  No notifications yet
                </div>
              ) : (
                notifications.map((notif) => (
                  <button
                    key={notif._id}
                    onClick={() => handleClick(notif)}
                    className={`w-full text-left px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors ${!notif.isRead ? 'bg-gold/5' : ''}`}
                  >
                    <div className="flex gap-3">
                      <span className="text-lg flex-shrink-0 mt-0.5">{typeIcons[notif.type] || '🔔'}</span>
                      <div className="min-w-0 flex-1">
                        <p className={`text-xs font-semibold truncate ${notif.isRead ? 'text-white/60' : 'text-white'}`}>
                          {notif.title}
                        </p>
                        <p className="text-xs text-white/40 mt-0.5 line-clamp-2">{notif.message}</p>
                        <p className="text-[10px] text-gold/50 mt-1">{timeAgo(notif.createdAt)}</p>
                      </div>
                      {!notif.isRead && <div className="w-2 h-2 bg-gold rounded-full flex-shrink-0 mt-1.5" />}
                    </div>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
