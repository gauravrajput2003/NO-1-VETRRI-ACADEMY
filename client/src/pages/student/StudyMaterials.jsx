import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import api from '../../services/api';
import { FiLock, FiFileText, FiVideo, FiEye } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useSocket } from '../../context/SocketContext';

const TYPE_ICONS = { pdf: FiFileText, video: FiVideo, ppt: FiFileText, image: FiFileText };
const TYPE_COLORS = { pdf: 'text-red-400', video: 'text-purple-400', ppt: 'text-orange-400', image: 'text-blue-400' };

export default function StudyMaterials() {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState(null);
  const { socket } = useSocket();

  useEffect(() => {
    api.get('/student/materials').then(r => {
      if (r.data.success) setMaterials(r.data.materials);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!socket) return;
    
    const handler = (data) => {
      setMaterials(prev => 
        prev.map(m => 
          m._id === data.materialId
            ? { ...m, isLocked: false }
            : m
        )
      );
      toast.success(`🔓 "${data.title}" is now unlocked!`, { duration: 5000 });
    };

    socket.on('material:unlocked', handler);
    return () => socket.off('material:unlocked', handler);
  }, [socket]);

  const viewMaterial = async (material) => {
    if (material.isLocked) {
      toast.error('This material is locked. Ask your teacher to unlock it.');
      return;
    }
    try {
      const res = await api.get(`/student/materials/${material._id}/view`);
      if (res.data.success) {
        window.open(res.data.url, '_blank', 'noopener,noreferrer');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not open material');
    }
  };

  if (loading) return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array(6).fill(0).map((_, i) => <div key={i} className="skeleton h-40 rounded-xl" />)}
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-bold text-2xl text-white">Study Materials</h1>
        <p className="text-white/40 text-sm mt-1">Resources shared by your teacher — locked materials require teacher approval</p>
      </div>

      {materials.length === 0 ? (
        <div className="glass-card p-16 text-center text-white/30">
          <FiFileText size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg">No materials yet</p>
          <p className="text-sm mt-1">Your teacher will upload materials here</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {materials.map((m) => {
            const Icon = TYPE_ICONS[m.type] || FiFileText;
            const color = TYPE_COLORS[m.type] || 'text-white';
            return (
              <motion.div
                key={m._id}
                className={`dashboard-card cursor-pointer ${m.isLocked ? 'opacity-70' : 'hover:border-gold/30'}`}
                whileHover={{ y: -3 }}
                onClick={() => viewMaterial(m)}
                id={`material-${m._id}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center ${color}`}>
                    <Icon size={22} />
                  </div>
                  {m.isLocked ? (
                    <span className="badge-red text-xs flex items-center gap-1">
                      <FiLock size={10} /> Locked
                    </span>
                  ) : (
                    <span className="badge-green text-xs">Unlocked</span>
                  )}
                </div>
                <h3 className="text-white font-semibold text-sm mb-1 line-clamp-2">{m.title}</h3>
                <p className="text-white/40 text-xs">{m.subject} · {m.type.toUpperCase()}</p>
                {!m.isLocked && (
                  <div className="mt-3 flex items-center gap-1 text-gold text-xs font-medium">
                    <FiEye size={12} /> View Material
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
