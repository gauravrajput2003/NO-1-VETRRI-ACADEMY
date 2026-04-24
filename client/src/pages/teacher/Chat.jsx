import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { FiSearch, FiSend, FiPaperclip, FiFile, FiX, FiMessageCircle, FiCheck, FiCheckCircle } from 'react-icons/fi';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import {
  getConversations, getMessages, sendMessage, sendFile, markAsRead,
} from '../../services/api';
import api from '../../services/api';

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

export default function TeacherChat() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [conversations, setConversations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const [typing, setTyping] = useState(false);
  const [canShareFiles, setCanShareFiles] = useState(false);
  const [filePreview, setFilePreview] = useState(null);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const messagesEndRef = useRef(null);
  const typingTimer = useRef(null);
  const fileInputRef = useRef(null);

  // Fetch conversations
  useEffect(() => {
    loadConversations();
    loadPermissions();
  }, []);

  const loadConversations = async () => {
    setLoadingConvs(true);
    try {
      const { data } = await getConversations();
      if (data.success) setConversations(data.conversations || []);
    } catch { toast.error('Failed to load conversations'); }
    finally { setLoadingConvs(false); }
  };

  const loadPermissions = async () => {
    try {
      const { data } = await api.get('/chat/my-permissions');
      if (data.success) setCanShareFiles(data.permissions?.canShareFiles ?? false);
    } catch {}
  };

  // Load messages when conversation selected
  useEffect(() => {
    if (!selected) return;
    loadMessages(selected._id);
    markAsRead(selected._id).catch(() => {});
    // Update unread in list
    setConversations((cs) => cs.map((c) => c._id === selected._id ? { ...c, unreadCount: 0 } : c));
  }, [selected?._id]);

  const loadMessages = async (convId) => {
    setLoadingMsgs(true);
    try {
      const { data } = await getMessages(convId);
      if (data.success) setMessages(data.messages || []);
    } catch {}
    finally { setLoadingMsgs(false); }
  };

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Socket events
  useEffect(() => {
    if (!socket) return;

    const onMessage = (msg) => {
      if (msg.conversationId === selected?._id) {
        setMessages((ms) => [...ms, msg]);
      }
      setConversations((cs) => cs.map((c) =>
        c._id === msg.conversationId
          ? { ...c, lastMessage: msg, unreadCount: c._id === selected?._id ? 0 : (c.unreadCount || 0) + 1 }
          : c
      ));
    };

    const onTyping = ({ conversationId, isTyping: t }) => {
      if (conversationId === selected?._id) setTyping(t);
    };

    const onPermission = ({ canShareFiles: newVal }) => {
      setCanShareFiles(newVal);
      toast(newVal ? '✅ File sharing enabled by admin' : '⛔ File sharing disabled', { icon: '🔐' });
    };

    const onOnline = ({ userId }) => setOnlineUsers((s) => new Set([...s, userId]));
    const onOffline = ({ userId }) => setOnlineUsers((s) => { const n = new Set(s); n.delete(userId); return n; });

    socket.on('chat:message', onMessage);
    socket.on('chat:typing', onTyping);
    socket.on('permission:updated', onPermission);
    socket.on('user:online', onOnline);
    socket.on('user:offline', onOffline);

    return () => {
      socket.off('chat:message', onMessage);
      socket.off('chat:typing', onTyping);
      socket.off('permission:updated', onPermission);
      socket.off('user:online', onOnline);
      socket.off('user:offline', onOffline);
    };
  }, [socket, selected?._id]);

  const handleTyping = useCallback(() => {
    if (!socket || !selected) return;
    socket.emit('chat:typing', { conversationId: selected._id, isTyping: true });
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      socket.emit('chat:typing', { conversationId: selected._id, isTyping: false });
    }, 2000);
  }, [socket, selected]);

  const handleSend = async () => {
    if ((!text.trim() && !filePreview) || sending) return;
    setSending(true);
    try {
      if (filePreview) {
        const fd = new FormData();
        fd.append('file', filePreview.file);
        fd.append('conversationId', selected._id);
        const { data } = await sendFile(fd);
        if (data.success) {
          setMessages((ms) => [...ms, data.message]);
          setConversations((cs) => cs.map((c) => c._id === selected._id ? { ...c, lastMessage: data.message } : c));
          socket?.emit('chat:message', { conversationId: selected._id, message: data.message });
        }
        setFilePreview(null);
      } else {
        const { data } = await sendMessage({ conversationId: selected._id, content: text.trim() });
        if (data.success) {
          setMessages((ms) => [...ms, data.message]);
          setConversations((cs) => cs.map((c) => c._id === selected._id ? { ...c, lastMessage: data.message } : c));
          socket?.emit('chat:message', { conversationId: selected._id, message: data.message });
        }
        setText('');
      }
    } catch { toast.error('Failed to send message'); }
    finally { setSending(false); }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error('File must be < 10MB'); return; }
    setFilePreview({ file, name: file.name, size: file.size, type: file.type });
  };

  const filteredConvs = conversations.filter((c) =>
    (c.student?.displayName || c.student?.name || '').toLowerCase().includes(search.toLowerCase())
  );

  const otherUser = selected?.student;
  const avatarSrc = (u) => u?.profilePic || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(u?.displayName || u?.name || '?')}&backgroundColor=0A1628&textColor=F5A623`;
  const isOnline = (uid) => onlineUsers.has(uid);

  return (
    <div className="h-[calc(100vh-160px)] min-h-[500px] flex gap-4">
      {/* Left: Conversation List */}
      <div className="w-[30%] bg-[#0F1F35] rounded-2xl border border-[#1E3A5F] flex flex-col overflow-hidden">
        <div className="p-4 border-b border-white/10">
          <h2 className="text-white font-semibold mb-3">Messages</h2>
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={14} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search students..."
              className="w-full bg-white/5 border border-white/10 text-white placeholder-white/30 rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:border-gold/50"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingConvs ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-4 border-b border-white/5 animate-pulse">
                <div className="w-10 h-10 rounded-full bg-white/10" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-white/10 rounded w-2/3" />
                  <div className="h-2 bg-white/10 rounded w-3/4" />
                </div>
              </div>
            ))
          ) : filteredConvs.length === 0 ? (
            <div className="text-center py-12 text-white/30">
              <FiMessageCircle size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No conversations</p>
            </div>
          ) : (
            filteredConvs.map((conv) => {
              const student = conv.student;
              const isSelected = selected?._id === conv._id;
              const online = isOnline(student?._id);
              return (
                <button
                  key={conv._id}
                  onClick={() => setSelected(conv)}
                  className={`w-full flex items-center gap-3 p-4 border-b border-white/5 hover:bg-white/5 transition-all text-left ${isSelected ? 'bg-gold/10 border-l-2 border-l-gold' : ''}`}
                >
                  <div className="relative flex-shrink-0">
                    <img src={avatarSrc(student)} alt={student?.name} className="w-10 h-10 rounded-full border border-white/10" />
                    {online && <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 rounded-full border border-[#0F1F35]" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-white text-sm font-medium truncate">{student?.displayName || student?.name}</p>
                      <span className="text-white/30 text-[10px] flex-shrink-0">{formatRelative(conv.lastMessage?.createdAt)}</span>
                    </div>
                    <p className="text-white/40 text-xs truncate">
                      {conv.lastMessage?.type === 'file' ? '📎 File' : conv.lastMessage?.content || 'No messages yet'}
                    </p>
                  </div>
                  {conv.unreadCount > 0 && (
                    <span className="flex-shrink-0 w-5 h-5 bg-gold text-navy text-[10px] font-bold rounded-full flex items-center justify-center">
                      {conv.unreadCount}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Right: Messages */}
      <div className="flex-1 bg-[#0F1F35] rounded-2xl border border-[#1E3A5F] flex flex-col overflow-hidden">
        {!selected ? (
          <div className="flex-1 flex items-center justify-center text-white/20">
            <div className="text-center">
              <FiMessageCircle size={48} className="mx-auto mb-3 opacity-20" />
              <p className="text-lg">Select a student to start chatting</p>
              <p className="text-sm mt-1 text-white/20">Messages are monitored for student safety</p>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center gap-3 p-4 border-b border-white/10">
              <div className="relative">
                <img src={avatarSrc(otherUser)} alt={otherUser?.name} className="w-10 h-10 rounded-full border border-white/10" />
                {isOnline(otherUser?._id) && <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 rounded-full border border-[#0F1F35]" />}
              </div>
              <div>
                <p className="text-white font-semibold">{otherUser?.displayName || otherUser?.name}</p>
                <p className="text-xs">{isOnline(otherUser?._id) ? <span className="text-green-400">● Online</span> : <span className="text-white/30">Offline</span>}</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loadingMsgs ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                    <div className="h-10 bg-white/10 rounded-xl w-48 animate-pulse" />
                  </div>
                ))
              ) : messages.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-white/20 py-12">
                  <p className="text-sm">No messages yet. Start the conversation!</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMine = msg.sender === user?._id || msg.sender?._id === user?._id;
                  return (
                    <div key={msg._id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] group`}>
                        <div className={`px-4 py-2.5 rounded-2xl text-sm ${isMine ? 'bg-gold text-navy rounded-tr-sm' : 'bg-white/10 text-white rounded-tl-sm'}`}>
                          {msg.type === 'file' ? (
                            <div className="flex items-center gap-3">
                              <FiFile size={20} className={isMine ? 'text-navy' : 'text-gold'} />
                              <div>
                                <p className="font-medium text-xs">{msg.fileName || 'File'}</p>
                                {msg.fileSize && <p className="text-[10px] opacity-60">{formatBytes(msg.fileSize)}</p>}
                              </div>
                              <a href={msg.fileUrl} target="_blank" rel="noreferrer"
                                className={`text-xs font-semibold px-2 py-1 rounded-lg border ${isMine ? 'border-navy/30 text-navy hover:bg-navy/10' : 'border-gold/30 text-gold hover:bg-gold/10'} transition-all`}>
                                View
                              </a>
                            </div>
                          ) : (
                            <p>{msg.content}</p>
                          )}
                        </div>
                        <div className={`flex items-center gap-1 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity ${isMine ? 'justify-end' : 'justify-start'}`}>
                          <span className="text-white/30 text-[10px]">{formatRelative(msg.createdAt)}</span>
                          {isMine && (msg.isRead ? <FiCheckCircle size={10} className="text-gold" /> : <FiCheck size={10} className="text-white/30" />)}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
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

            {/* File Preview */}
            {filePreview && (
              <div className="px-4 py-2 border-t border-white/10 flex items-center gap-3 bg-white/5">
                <FiFile className="text-gold" size={16} />
                <span className="text-white/70 text-sm flex-1 truncate">{filePreview.name}</span>
                <span className="text-white/30 text-xs">{formatBytes(filePreview.size)}</span>
                <button onClick={() => setFilePreview(null)} className="text-white/30 hover:text-red-400 transition-colors">
                  <FiX size={14} />
                </button>
              </div>
            )}

            {/* Input */}
            <div className="p-4 border-t border-white/10">
              <div className="flex items-end gap-2">
                {canShareFiles && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-shrink-0 w-10 h-10 flex items-center justify-center text-white/40 hover:text-gold hover:bg-gold/10 rounded-xl transition-all"
                    title="Attach file"
                  >
                    <FiPaperclip size={18} />
                  </button>
                )}
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept=".pdf,.ppt,.pptx,.doc,.docx,image/*"
                  onChange={handleFileSelect}
                />
                <textarea
                  value={text}
                  onChange={(e) => { setText(e.target.value); handleTyping(); }}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder="Type a message..."
                  rows={1}
                  className="flex-1 bg-white/5 border border-white/10 text-white placeholder-white/30 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-gold/50 resize-none max-h-28 overflow-y-auto"
                  style={{ minHeight: '42px' }}
                />
                <button
                  onClick={handleSend}
                  disabled={(!text.trim() && !filePreview) || sending}
                  className="flex-shrink-0 w-10 h-10 bg-gold text-navy rounded-xl flex items-center justify-center hover:bg-yellow-400 transition-all disabled:opacity-40"
                >
                  {sending ? <div className="w-4 h-4 border-2 border-navy/30 border-t-navy rounded-full animate-spin" /> : <FiSend size={16} />}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
