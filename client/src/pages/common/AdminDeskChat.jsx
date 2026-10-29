import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import api, { getMessages, markAsRead, sendFile, sendMessage } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import MediaRecorderInput from '../../components/MediaRecorderInput';

const conversationKey = (a, b) => [String(a), String(b)].sort().join('_');

export default function AdminDeskChat({ contact }) {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [admin, setAdmin] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [typing, setTyping] = useState(false);
  const typingTimer = useRef(null);
  const bottom = useRef(null);
  const key = admin && user ? conversationKey(user._id, admin._id) : null;

  const refresh = useCallback(async (conversationId) => {
    const { data } = await getMessages(conversationId, { page: 1, limit: 30 });
    if (data.success) setMessages(data.messages || []);
    setPage(1); setTotal(data.total || 0);
    await markAsRead(conversationId).catch(() => {});
  }, []);

  useEffect(() => {
    let active = true;
    if (contact) {
      setAdmin(contact); setLoading(true);
      refresh(conversationKey(user._id, contact._id)).catch(() => toast.error('Unable to load messages')).finally(() => setLoading(false));
      return () => { active = false; };
    }
    api.get('/chat/admin-contact').then(async ({ data }) => {
      if (!active || !data.success) return;
      setAdmin(data.admin);
      await refresh(conversationKey(user._id, data.admin._id));
    }).catch((error) => toast.error(error.response?.data?.message || 'Unable to open Admin Desk'))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user?._id, contact?._id, refresh]);

  useEffect(() => {
    if (!socket || !key) return;
    const onMessage = (message) => {
      if (message.conversationId !== key) return;
      setMessages((items) => items.some((item) => item._id === message._id) ? items : [...items, message]);
      markAsRead(key).catch(() => {});
    };
    const onConnect = () => refresh(key).catch(() => {});
    const onTyping = (event) => { if (event.conversationId !== key) return; setTyping(Boolean(event.isTyping)); clearTimeout(typingTimer.current); typingTimer.current = setTimeout(() => setTyping(false), 3000); };
    const onRead = (event) => { if (event.conversationId === key) setMessages((items) => items.map((item) => ({ ...item, isRead: true }))); };
    const onDeleted = (event) => { if (event.conversationId === key) setMessages((items) => items.filter((item) => item._id !== event.messageId)); };
    socket.on('chat:message', onMessage);
    socket.on('connect', onConnect);
    socket.on('chat:typing', onTyping); socket.on('chat:read', onRead); socket.on('chat:deleted', onDeleted);
    return () => { socket.off('chat:message', onMessage); socket.off('connect', onConnect); socket.off('chat:typing', onTyping); socket.off('chat:read', onRead); socket.off('chat:deleted', onDeleted); clearTimeout(typingTimer.current); };
  }, [socket, key, refresh]);

  useEffect(() => { bottom.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length]);

  const submit = async (event) => {
    event.preventDefault();
    if ((!text.trim() && !file) || !admin || sending) return;
    setSending(true);
    try {
      let response;
      if (file) {
        const form = new FormData();
        form.append('receiverId', admin._id);
        form.append('file', file);
        response = await sendFile(form);
        if (text.trim()) await sendMessage({ receiverId: admin._id, message: text.trim() });
      } else {
        response = await sendMessage({ receiverId: admin._id, message: text.trim() });
      }
      if (response.data.success) {
        setMessages((items) => items.some((item) => item._id === response.data.message._id)
          ? items : [...items, response.data.message]);
        setText('');
        setFile(null);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Message could not be sent');
    } finally { setSending(false); }
  };

  return <section className="glass-card flex flex-col h-[calc(100vh-190px)] min-h-[420px]" aria-label="Admin Desk chat">
    <header className="p-4 border-b border-white/10">
      <h1 className="text-white font-semibold text-xl">{contact ? 'Conversation' : 'Admin Desk'}</h1>
      <p className="text-white/50 text-sm">{admin?.displayName || admin?.name || 'Academy support'}</p>
    </header>
    <div className="flex-1 overflow-y-auto p-4 space-y-3" aria-live="polite">
      {messages.length < total && <button className="text-gold" onClick={async () => { try { const { data } = await getMessages(key, { page: page + 1, limit: 30 }); setMessages((items) => [...(data.messages || []).filter((item) => !items.some((existing) => existing._id === item._id)), ...items]); setPage(page + 1); } catch { toast.error('Unable to load earlier messages'); } }}>Load earlier messages</button>}
      {loading ? <p className="text-white/50">Loading messages…</p> : messages.length === 0 ?
        <p className="text-white/50">Send a message to the academy admin.</p> : messages.map((message) => {
          const mine = String(message.senderId?._id || message.senderId) === String(user?._id);
          return <div key={message._id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-xl p-3 ${mine ? 'bg-gold text-navy' : 'bg-white/10 text-white'}`}>
              {message.messageType === 'image' && <img src={message.fileUrl} alt={message.fileName || 'Chat image'} className="max-h-60 rounded-lg" />}
              {message.messageType === 'audio' && <audio controls src={message.fileUrl} className="max-w-full" />}
              {message.messageType === 'video' && <video controls src={message.fileUrl} className="max-h-60" />}
              {message.fileUrl ? <a href={message.fileUrl} target="_blank" rel="noreferrer" className="underline">
                {message.fileName || 'Open attachment'}</a> : <p className="whitespace-pre-wrap">{message.message}</p>}
              <time className="block text-xs opacity-60 mt-1">{new Date(message.createdAt).toLocaleString('en-IN')}</time>
              {mine && <span className="text-xs opacity-70">{message.isRead ? 'Read' : 'Sent'}</span>}
              {(mine || user.role === 'admin') && !message.credentialType && <button type="button" className="block text-xs underline opacity-60" onClick={async () => { if (!window.confirm('Remove this message?')) return; try { await api.delete(`/chat/message/${message._id}`); setMessages((items) => items.filter((item) => item._id !== message._id)); } catch { toast.error('Unable to remove message'); } }}>Remove</button>}
            </div>
          </div>;
        })}
      <div ref={bottom} />
      {typing && <p className="text-white/50 text-sm">Typing…</p>}
    </div>
    <form onSubmit={submit} className="p-4 border-t border-white/10 space-y-2">
      <MediaRecorderInput onFile={setFile} />
      {file && <div className="text-white/70 text-sm">{file.name} <button type="button" onClick={() => setFile(null)} className="text-gold ml-2">Remove</button></div>}
      <div className="flex gap-2">
        <label className="text-gold cursor-pointer self-center" title="Attach file">Attach
          <input type="file" className="sr-only" onChange={(event) => setFile(event.target.files?.[0] || null)} />
        </label>
        <input className="input-field flex-1" value={text} onChange={(event) => { setText(event.target.value); socket?.emit('chat:typing', { conversationId: key, targetUserId: admin?._id, isTyping: Boolean(event.target.value) }); }} placeholder="Write a message" aria-label="Message" />
        <button className="btn-primary px-4" type="submit" disabled={sending || (!text.trim() && !file)}>{sending ? 'Sending…' : 'Send'}</button>
      </div>
    </form>
  </section>;
}
