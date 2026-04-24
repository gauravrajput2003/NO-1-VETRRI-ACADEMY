import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { FiToggleLeft, FiToggleRight, FiUser } from 'react-icons/fi';
import { getAllTeacherPermissions, updateTeacherPermissions } from '../../services/api';

const PERMISSION_KEYS = [
  { key: 'canMessage', label: 'Messages' },
  { key: 'canShareFiles', label: 'File Sharing' },
  { key: 'canUploadMaterials', label: 'Upload Materials' },
  { key: 'canViewStudentList', label: 'Student List Access' },
];

function Toggle({ value, onChange, loading }) {
  return (
    <button
      onClick={onChange}
      disabled={loading}
      className={`relative w-12 h-6 rounded-full transition-all duration-200 focus:outline-none disabled:opacity-60 ${
        value ? 'bg-green-500' : 'bg-red-500/50'
      }`}
      aria-label={value ? 'Enabled' : 'Disabled'}
    >
      <span
        className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transform transition-transform shadow-sm ${
          value ? 'translate-x-6' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: 6 }).map((_, i) => (
        <td key={i} className="py-4 px-4">
          <div className="h-4 bg-white/10 rounded w-3/4" />
        </td>
      ))}
    </tr>
  );
}

export default function TeacherPermissions() {
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState({});

  useEffect(() => { fetchPermissions(); }, []);

  const fetchPermissions = async () => {
    setLoading(true);
    try {
      const { data } = await getAllTeacherPermissions();
      if (data.success) setPermissions(data.permissions || []);
    } catch { toast.error('Failed to load permissions'); }
    finally { setLoading(false); }
  };

  const handleToggle = async (teacherId, key, currentValue) => {
    const newValue = !currentValue;
    // Optimistic update
    setPermissions((ps) =>
      ps.map((p) =>
        p.teacher?._id === teacherId
          ? { ...p, [key]: newValue }
          : p
      )
    );
    setUpdating((u) => ({ ...u, [`${teacherId}-${key}`]: true }));
    try {
      const { data } = await updateTeacherPermissions(teacherId, { [key]: newValue });
      if (data.success) {
        toast.success(`${newValue ? '✅ Enabled' : '🚫 Disabled'}: ${PERMISSION_KEYS.find((k) => k.key === key)?.label || key}`);
      }
    } catch {
      // Revert on error
      setPermissions((ps) =>
        ps.map((p) =>
          p.teacher?._id === teacherId ? { ...p, [key]: currentValue } : p
        )
      );
      toast.error('Failed to update permission');
    }
    setUpdating((u) => ({ ...u, [`${teacherId}-${key}`]: false }));
  };

  const avatarSrc = (teacher) =>
    teacher?.profilePic ||
    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(teacher?.displayName || teacher?.name || '?')}&backgroundColor=0A1628&textColor=F5A623`;

  const allOn = (perm) => PERMISSION_KEYS.every((k) => perm[k.key]);
  const handleEnableAll = async (perm) => {
    const teacherId = perm.teacher?._id;
    const all = PERMISSION_KEYS.reduce((acc, k) => ({ ...acc, [k.key]: true }), {});
    setPermissions((ps) => ps.map((p) => p.teacher?._id === teacherId ? { ...p, ...all } : p));
    try {
      await updateTeacherPermissions(teacherId, all);
      toast.success('✅ All permissions enabled');
    } catch { toast.error('Failed'); fetchPermissions(); }
  };
  const handleDisableAll = async (perm) => {
    const teacherId = perm.teacher?._id;
    const all = PERMISSION_KEYS.reduce((acc, k) => ({ ...acc, [k.key]: false }), {});
    setPermissions((ps) => ps.map((p) => p.teacher?._id === teacherId ? { ...p, ...all } : p));
    try {
      await updateTeacherPermissions(teacherId, all);
      toast.success('🚫 All permissions disabled');
    } catch { toast.error('Failed'); fetchPermissions(); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-bold text-2xl text-white">Teacher Permissions</h1>
        <p className="text-white/40 text-sm mt-1">Control what each teacher can access and do on the platform</p>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="w-10 h-5 rounded-full bg-green-500 flex items-center justify-end pr-1">
            <span className="w-3.5 h-3.5 bg-white rounded-full" />
          </span>
          <span className="text-white/50 text-sm">Enabled</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-10 h-5 rounded-full bg-red-500/50 flex items-center justify-start pl-1">
            <span className="w-3.5 h-3.5 bg-white rounded-full" />
          </span>
          <span className="text-white/50 text-sm">Disabled</span>
        </div>
        <p className="text-white/30 text-xs">Changes are saved immediately</p>
      </div>

      {/* Permissions Table */}
      <div className="bg-[#0F1F35] rounded-2xl border border-[#1E3A5F] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Teacher</th>
                {PERMISSION_KEYS.map((pk) => (
                  <th key={pk.key} className="text-center">{pk.label}</th>
                ))}
                <th className="text-center">Quick Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />) :
                permissions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-white/30">
                      <FiUser size={28} className="mx-auto mb-2 opacity-30" />
                      No teachers found
                    </td>
                  </tr>
                ) : permissions.map((perm) => {
                  const t = perm.teacher;
                  return (
                    <motion.tr
                      key={perm._id || t?._id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-white/5 transition-colors"
                    >
                      {/* Teacher info */}
                      <td>
                        <div className="flex items-center gap-3">
                          <img
                            src={avatarSrc(t)}
                            alt={t?.name}
                            className="w-9 h-9 rounded-full border border-white/10 flex-shrink-0"
                          />
                          <div>
                            <p className="text-white font-medium text-sm">{t?.displayName || t?.name || '—'}</p>
                            <p className="text-white/30 text-xs">{t?.qualification || '—'}</p>
                          </div>
                        </div>
                      </td>

                      {/* Toggles */}
                      {PERMISSION_KEYS.map((pk) => (
                        <td key={pk.key} className="text-center">
                          <div className="flex justify-center">
                            <Toggle
                              value={!!perm[pk.key]}
                              onChange={() => handleToggle(t?._id, pk.key, !!perm[pk.key])}
                              loading={!!updating[`${t?._id}-${pk.key}`]}
                            />
                          </div>
                        </td>
                      ))}

                      {/* Quick actions */}
                      <td className="text-center">
                        <div className="flex justify-center gap-2">
                          {!allOn(perm) ? (
                            <button
                              onClick={() => handleEnableAll(perm)}
                              className="text-[10px] bg-green-500/10 text-green-400 border border-green-500/30 px-2.5 py-1 rounded-lg hover:bg-green-500/20 transition-all whitespace-nowrap"
                            >
                              Enable All
                            </button>
                          ) : (
                            <button
                              onClick={() => handleDisableAll(perm)}
                              className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/30 px-2.5 py-1 rounded-lg hover:bg-red-500/20 transition-all whitespace-nowrap"
                            >
                              Disable All
                            </button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  );
                })
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
