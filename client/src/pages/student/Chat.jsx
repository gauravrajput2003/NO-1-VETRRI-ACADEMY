import { useEffect, useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  FiSend, FiFile, FiMessageCircle, FiCheck, FiCheckCircle,
} from 'react-icons/fi';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import { getConversations, getMessages, sendMessage, markAsRead } from '../../services/api';

function formatRelative(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  if (diffH < 48) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

function formatBytes(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function StudentChat() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isOnlineTeacher, setIsOnlineTeacher] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimer = useRef(null);

  // Load single conversation on mount
  useEffect(() => {
    loadConversation();
  }, []);

  const loadConversation = async () => {
    setLoading(true);
    try {
      const { data } = await getConversations();
      if (data.success && data.conversations?.length) {
        const conv = data.conversations[0];
        setConversation(conv);
        await loadMessages(conv._id);
        markAsRead(conv._id).catch(() => {});
      }
    } catch { toast.error('Failed to load conversation'); }
    finally { setLoading(false); }
  };

  const loadMessages = async (convId) => {
    try {
      const { data } = await getMessages(convId);
      if (data.success) setMessages(data.messages || []);
    } catch {}
  };

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Socket events
  useEffect(() => {
    if (!socket || !conversation) return;

    const onMessage = (msg) => {
      if (msg.conversationId === conversation._id) {
        setMessages((ms) => [...ms, msg]);
        markAsRead(conversation._id).catch(() => {});
      }
    };

    const onTyping = ({ conversationId, isTyping: t }) => {
      if (conversationId === conversation._id) setTyping(t);
    };

    const onOnline = ({ userId }) => {
      if (userId === conversation.teacher?._id) setIsOnlineTeacher(true);
    };
    const onOffline = ({ userId }) => {
      if (userId === conversation.teacher?._id) setIsOnlineTeacher(false);
    };

    socket.on('chat:message', onMessage);
    socket.on('chat:typing', onTyping);
    socket.on('user:online', onOnline);
    socket.on('user:offline', onOffline);

    return () => {
      socket.off('chat:message', onMessage);
      socket.off('chat:typing', onTyping);
      socket.off('user:online', onOnline);
      socket.off('user:offline', onOffline);
    };
  }, [socket, conversation?._id, conversation?.teacher?._id]);

  const handleTyping = useCallback(() => {
    if (!socket || !conversation) return;
    socket.emit('chat:typing', { conversationId: conversation._id, isTyping: true });
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      socket.emit('chat:typing', { conversationId: conversation._id, isTyping: false });
    }, 2000);
  }, [socket, conversation]);

  const handleSend = async () => {
    if (!text.trim() || sending || !conversation) return;
    setSending(true);
    const msgContent = text.trim();
    setText('');
    try {
      const { data } = await sendMessage({ conversationId: conversation._id, content: msgContent });
      if (data.success) {
        setMessages((ms) => [...ms, data.message]);
        socket?.emit('chat:message', { conversationId: conversation._id, message: data.message });
      }
    } catch {
      toast.error('Failed to send message');
      setText(msgContent);
    }
    setSending(false);
  };

  const teacher = conversation?.teacher;
  const avatarSrc = (u) =>
    u?.profilePic || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(u?.displayName || u?.name || '?')}&backgroundColor=0A1628&textColor=F5A623`;

  if (loading) {
    return (
      <div className="h-[calc(100vh-160px)] bg-[#0F1F35] rounded-2xl border border-[#1E3A5F] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-gold/30 border-t-gold rounded-full animate-spin mx-auto mb-3" />
          <p className="text-white/40 text-sm">Loading conversation...</p>
        </div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="h-[calc(100vh-160px)] bg-[#0F1F35] rounded-2xl border border-[#1E3A5F] flex items-center justify-center">
        <div className="text-center text-white/20">
          <FiMessageCircle size={48} className="mx-auto mb-3 opacity-20" />
          <p className="text-lg">No teacher assigned yet</p>
          <p className="text-sm mt-1 text-white/20">Contact your admin to get assigned a teacher</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-230px)] md:h-[calc(100vh-160px)] min-h-[420px] md:min-h-[500px] bg-[#0F1F35] rounded-2xl border border-[#1E3A5F] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-white/10 flex-shrink-0">
        <div className="relative">
          <img src={avatarSrc(teacher)} alt={teacher?.name} className="w-10 h-10 rounded-full border border-white/10" />
          {isOnlineTeacher && (
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 rounded-full border border-[#0F1F35]" />
          )}
        </div>
        <div>
          <p className="text-white font-semibold">{teacher?.displayName || teacher?.name || 'Your Teacher'}</p>
          <p className="text-xs">
            {isOnlineTeacher
              ? <span className="text-green-400">● Online</span>
              : <span className="text-white/30">Offline</span>
            }
          </p>
        </div>
        <div className="ml-auto">
          <span className="badge badge-gold text-[10px]">Your Teacher</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && !loading ? (
          <div className="flex items-center justify-center h-full text-white/20">
            <div className="text-center">
              <FiMessageCircle size={40} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm">No messages yet. Say hello! 👋</p>
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isMine = msg.sender === user?._id || msg.sender?._id === user?._id;
            return (
              <div key={msg._id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div className="max-w-[70%] group">
                  <div
                    className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      isMine
                        ? 'bg-gold text-navy rounded-tr-sm'
                        : 'bg-white/10 text-white rounded-tl-sm'
                    }`}
                  >
                    {msg.type === 'file' ? (
                      /* Students can receive files but cannot send them */
                      <div className="flex items-center gap-3">
                        <FiFile size={20} className={isMine ? 'text-navy' : 'text-gold'} />
                        <div className="min-w-0">
                          <p className="font-medium text-xs truncate">{msg.fileName || 'File'}</p>
                          {msg.fileSize && <p className="text-[10px] opacity-60">{formatBytes(msg.fileSize)}</p>}
                        </div>
                        <a
                          href={msg.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-lg border border-gold/30 text-gold hover:bg-gold/10 transition-all"
                        >
                          View
                        </a>
                      </div>
                    ) : (
                      <p>{msg.content}</p>
                    )}
                  </div>
                  <div className={`flex items-center gap-1 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity ${isMine ? 'justify-end' : 'justify-start'}`}>
                    <span className="text-white/30 text-[10px]">{formatRelative(msg.createdAt)}</span>
                    {isMine && (
                      msg.isRead
                        ? <FiCheckCircle size={10} className="text-gold" />
                        : <FiCheck size={10} className="text-white/30" />
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Typing indicator */}
        {typing && (
          <div className="flex justify-start">
            <div className="bg-white/10 px-4 py-2.5 rounded-2xl rounded-tl-sm flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input — Text only for students, no file attach */}
      <div className="p-4 border-t border-white/10 flex-shrink-0">
        <div className="flex items-end gap-2">
          <textarea
            value={text}
            onChange={(e) => { setText(e.target.value); handleTyping(); }}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Type a message to your teacher..."
            rows={1}
            className="flex-1 bg-white/5 border border-white/10 text-white placeholder-white/30 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-gold/50 resize-none max-h-28 overflow-y-auto"
            style={{ minHeight: '42px' }}
          />
          <button
            onClick={handleSend}
            disabled={!text.trim() || sending}
            className="flex-shrink-0 w-10 h-10 bg-gold text-navy rounded-xl flex items-center justify-center hover:bg-yellow-400 transition-all disabled:opacity-40"
          >
            {sending
              ? <div className="w-4 h-4 border-2 border-navy/30 border-t-navy rounded-full animate-spin" />
              : <FiSend size={16} />
            }
          </button>
        </div>
        <p className="text-white/20 text-[10px] mt-1.5 text-center">
          You can send text messages only. Your teacher may share files with you.
        </p>
      </div>
    </div>
  );
}
