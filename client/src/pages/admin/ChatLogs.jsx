import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { FiShield, FiSearch } from 'react-icons/fi';
import { getChatLogs } from '../../services/api';
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

function SkeletonConv() {
  return (
    <div className="flex items-center gap-3 p-4 border-b border-white/5 animate-pulse">
      <div className="w-10 h-10 rounded-full bg-white/10 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-white/10 rounded w-3/4" />
        <div className="h-2 bg-white/10 rounded w-1/2" />
      </div>
    </div>
  );
}

export default function ChatLogs() {
  const [conversations, setConversations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [filterTeacher, setFilterTeacher] = useState('');
  const [filterStudent, setFilterStudent] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    fetchUsers();
    fetchLogs();
  }, []);

  const fetchUsers = async () => {
    try {
      const [tRes, sRes] = await Promise.all([
        api.get('/admin/teachers', { params: { limit: 100 } }),
        api.get('/admin/students', { params: { limit: 500 } }),
      ]);
      if (tRes.data.success) setTeachers(tRes.data.teachers || []);
      if (sRes.data.success) setStudents(sRes.data.students || []);
    } catch {}
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterTeacher) params.teacherId = filterTeacher;
      if (filterStudent) params.studentId = filterStudent;
      if (dateFrom) params.from = dateFrom;
      if (dateTo) params.to = dateTo;
      const { data } = await getChatLogs(params);
      if (data.success) setConversations(data.conversations || []);
    } catch { toast.error('Failed to load chat logs'); }
    finally { setLoading(false); }
  };

  const loadMessages = async (conv) => {
    setSelected(conv);
    setLoadingMsgs(true);
    try {
      const { data } = await api.get(`/chat/messages/${conv._id}`, { params: { all: true } });
      if (data.success) setMessages(data.messages || []);
    } catch { toast.error('Failed to load messages'); }
    finally { setLoadingMsgs(false); }
  };

  const avatarSrc = (u) =>
    u?.profilePic || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(u?.displayName || u?.name || '?')}&backgroundColor=0A1628&textColor=F5A623`;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display font-bold text-2xl text-white">Chat Logs</h1>
        <p className="text-white/40 text-sm mt-1">Monitor teacher-student conversations for student safety</p>
      </div>

      {/* Safety warning */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 p-4 rounded-xl border border-blue-500/30 bg-blue-500/10">
        <FiShield className="text-blue-400 flex-shrink-0" size={20} />
        <p className="text-blue-300 text-sm">
          🔒 <strong>Chat logs are monitored for student safety only.</strong> Handle all conversations with strict confidentiality and professionalism.
        </p>
      </motion.div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <select value={filterTeacher} onChange={(e) => setFilterTeacher(e.target.value)} className="input-field py-1.5 text-xs max-w-[180px]">
          <option value="">All Teachers</option>
          {teachers.map((t) => <option key={t._id} value={t._id}>{t.displayName || t.name}</option>)}
        </select>
        <select value={filterStudent} onChange={(e) => setFilterStudent(e.target.value)} className="input-field py-1.5 text-xs max-w-[180px]">
          <option value="">All Students</option>
          {students.map((s) => <option key={s._id} value={s._id}>{s.displayName || s.name}</option>)}
        </select>
        <div className="flex items-center gap-2">
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="input-field py-1.5 text-xs" placeholder="From" />
          <span className="text-white/30 text-xs">to</span>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="input-field py-1.5 text-xs" placeholder="To" />
        </div>
        <button onClick={fetchLogs}
          className="bg-gold text-navy font-semibold px-4 py-1.5 rounded-xl hover:bg-yellow-400 transition-all text-sm flex items-center gap-1.5">
          <FiSearch size={13} /> Apply Filters
        </button>
      </div>

      {/* Split view */}
      <div className="flex gap-4 h-[calc(100vh-340px)] min-h-[400px]">
        {/* Left: Conversations */}
        <div className="w-1/3 bg-[#0F1F35] rounded-2xl border border-[#1E3A5F] flex flex-col overflow-hidden">
          <div className="p-4 border-b border-white/10">
            <p className="text-white font-semibold text-sm">{conversations.length} Conversations</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? Array.from({ length: 6 }).map((_, i) => <SkeletonConv key={i} />) :
              conversations.length === 0 ? (
                <div className="text-center py-12 text-white/30">
                  <FiShield size={28} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No conversations found</p>
                </div>
              ) : conversations.map((conv) => {
                const isSelected = selected?._id === conv._id;
                const teacher = conv.teacher;
                const student = conv.student;
                return (
                  <button key={conv._id} onClick={() => loadMessages(conv)}
                    className={`w-full flex items-start gap-3 p-4 border-b border-white/5 hover:bg-white/5 text-left transition-all ${isSelected ? 'bg-gold/10 border-l-2 border-l-gold' : ''}`}>
                    <div className="flex -space-x-2 flex-shrink-0">
                      <img src={avatarSrc(teacher)} alt={teacher?.name} className="w-8 h-8 rounded-full border-2 border-[#0F1F35]" />
                      <img src={avatarSrc(student)} alt={student?.name} className="w-8 h-8 rounded-full border-2 border-[#0F1F35]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-semibold truncate">
                        {teacher?.displayName || teacher?.name} ↔ {student?.displayName || student?.name}
                      </p>
                      <p className="text-white/40 text-[10px] truncate mt-0.5">
                        {conv.lastMessage?.type === 'file' ? '📎 File' : conv.lastMessage?.content || 'No messages'}
                      </p>
                      <p className="text-white/20 text-[10px] mt-0.5">{formatRelative(conv.lastMessage?.createdAt)}</p>
                    </div>
                  </button>
                );
              })
            }
          </div>
        </div>

        {/* Right: Messages (read-only) */}
        <div className="flex-1 bg-[#0F1F35] rounded-2xl border border-[#1E3A5F] flex flex-col overflow-hidden">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center text-white/20">
              <div className="text-center">
                <FiShield size={40} className="mx-auto mb-3 opacity-20" />
                <p>Select a conversation to view messages</p>
                <p className="text-sm mt-1 opacity-50">All messages are read-only</p>
              </div>
            </div>
          ) : (
            <>
              <div className="p-4 border-b border-white/10 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2">
                    <img src={avatarSrc(selected.teacher)} className="w-8 h-8 rounded-full border-2 border-[#0F1F35]" />
                    <img src={avatarSrc(selected.student)} className="w-8 h-8 rounded-full border-2 border-[#0F1F35]" />
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">
                      {selected.teacher?.displayName || selected.teacher?.name} ↔ {selected.student?.displayName || selected.student?.name}
                    </p>
                    <p className="text-white/30 text-xs">Read-only view · Admin monitoring</p>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {loadingMsgs ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                      <div className="h-10 bg-white/10 rounded-2xl w-48 animate-pulse" />
                    </div>
                  ))
                ) : messages.length === 0 ? (
                  <div className="text-center py-12 text-white/30 text-sm">No messages in this conversation</div>
                ) : messages.map((msg) => {
                  const isTeacher = msg.sender?._id === selected.teacher?._id || msg.sender === selected.teacher?._id;
                  return (
                    <div key={msg._id} className={`flex ${isTeacher ? 'justify-start' : 'justify-end'}`}>
                      <div className="max-w-[70%]">
                        <p className={`text-[10px] mb-1 ${isTeacher ? 'text-white/30' : 'text-right text-white/30'}`}>
                          {isTeacher
                            ? selected.teacher?.displayName || selected.teacher?.name
                            : selected.student?.displayName || selected.student?.name
                          }
                        </p>
                        <div className={`px-4 py-2.5 rounded-2xl text-sm ${isTeacher ? 'bg-white/10 text-white rounded-tl-sm' : 'bg-gold/20 text-white rounded-tr-sm'}`}>
                          {msg.type === 'file' ? (
                            <div className="flex items-center gap-2">
                              <span>📎</span>
                              <span className="text-xs truncate">{msg.fileName || 'File'}</span>
                              {msg.fileUrl && (
                                <a href={msg.fileUrl} target="_blank" rel="noreferrer" className="text-gold text-xs hover:underline">View</a>
                              )}
                            </div>
                          ) : <p>{msg.content}</p>}
                        </div>
                        <p className={`text-[10px] text-white/20 mt-0.5 ${!isTeacher ? 'text-right' : ''}`}>
                          {formatRelative(msg.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* No input bar — read-only */}
              <div className="p-3 border-t border-white/10 flex-shrink-0">
                <div className="flex items-center justify-center gap-2 text-white/20 text-xs">
                  <FiShield size={12} /> Read-only monitoring view — no messages can be sent from here
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
