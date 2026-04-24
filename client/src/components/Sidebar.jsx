import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { FiMenu, FiX, FiLogOut, FiChevronRight } from 'react-icons/fi';

export default function Sidebar({ links, role }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login/' + role);
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full pb-20 md:pb-0">
      {/* Logo & Toggle */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        {!collapsed && (
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo.jpg" alt="Logo" className="h-9 w-9 object-contain" />
            <div className="min-w-0">
              <p className="font-display font-bold text-white text-xs leading-tight truncate">No.1 Vettri</p>
              <p className="text-gold text-[10px]">Academy</p>
            </div>
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden md:flex text-white/40 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-all ml-auto"
          aria-label="Toggle sidebar"
        >
          {collapsed ? <FiChevronRight /> : <FiMenu size={18} />}
        </button>
      </div>

      {/* User Info */}
      {!collapsed && (
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gold/20 border border-gold/30 flex items-center justify-center text-gold font-bold text-sm flex-shrink-0">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="min-w-0">
              <p className="text-white font-semibold text-sm truncate">{user?.name || 'User'}</p>
              <span className={`text-xs capitalize font-medium ${role === 'admin' ? 'text-gold' : role === 'teacher' ? 'text-purple-400' : 'text-blue-400'}`}>
                {role}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Nav Links */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto no-scrollbar">
        {links.map((link) => {
          const isActive = location.pathname === link.href || location.pathname.startsWith(link.href + '/');
          return (
            <Link
              key={link.href}
              to={link.href}
              onClick={() => setMobileOpen(false)}
              title={collapsed ? link.label : ''}
              className={`sidebar-link ${isActive ? 'active' : ''} ${collapsed ? 'justify-center' : ''}`}
            >
              <link.icon size={20} className="flex-shrink-0" />
              {!collapsed && <span className="text-sm">{link.label}</span>}
              {!collapsed && link.badge && (
                <span className="ml-auto bg-gold text-navy text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                  {link.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-white/10">
        <button
          onClick={handleLogout}
          className={`sidebar-link text-red-400 hover:text-red-300 hover:bg-red-500/10 w-full ${collapsed ? 'justify-center' : ''}`}
          id="sidebar-logout"
        >
          <FiLogOut size={20} />
          {!collapsed && <span className="text-sm">Logout</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex flex-col bg-navy border-r border-white/10 h-screen sticky top-0 transition-all duration-300 ${
          collapsed ? 'w-16' : 'w-60'
        }`}
      >
        <SidebarContent />
      </aside>

      {/* Mobile: Hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 glass-card p-2.5 border-gold/20"
        aria-label="Open menu"
      >
        <FiMenu className="text-white" size={20} />
      </button>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 bg-black/60 z-[70] md:hidden"
            />
            <motion.aside
              initial={{ x: -260 }}
              animate={{ x: 0 }}
              exit={{ x: -260 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed left-0 top-0 bottom-0 w-64 bg-navy border-r border-white/10 z-[80] md:hidden"
            >
              <div className="absolute top-3 right-3">
                <button onClick={() => setMobileOpen(false)} className="text-white/40 hover:text-white p-1.5 rounded-lg hover:bg-white/10">
                  <FiX size={20} />
                </button>
              </div>
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
