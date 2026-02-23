import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, ScanLine, GitBranch, Share2,
  FileText, Layers, Settings, Brain,
  ChevronLeft, ChevronRight, Activity, LogOut,
} from 'lucide-react';
import clsx from 'clsx';
import { useAuthStore } from '../../store/authStore';

const navItems = [
  { path: '/',           label: 'Dashboard',      icon: LayoutDashboard },
  { path: '/analysis',   label: 'Image Analysis',  icon: ScanLine },
  { path: '/provenance', label: 'Provenance Graph', icon: GitBranch },
  { path: '/social',     label: 'Social Spread',   icon: Share2 },
  { path: '/batch',      label: 'Batch Analysis',  icon: Layers },
  { path: '/report',     label: 'Forensics Report',icon: FileText },
  { path: '/settings',   label: 'Settings',        icon: Settings },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location  = useLocation();
  const navigate  = useNavigate();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const initials = user?.username?.slice(0, 2).toUpperCase() ?? '??';

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 240 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="flex-shrink-0 h-screen flex flex-col relative z-10"
      style={{
        background: 'rgba(8, 12, 20, 0.95)',
        borderRight: '1px solid rgba(99,179,237,0.1)',
        backdropFilter: 'blur(20px)',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-white/5">
        <div className="relative flex-shrink-0">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
               style={{ background: 'linear-gradient(135deg, #06b6d4, #a855f7)' }}>
            <Brain size={18} className="text-white" />
          </div>
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-[#080c14]" />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }} className="overflow-hidden">
              <p className="text-sm font-bold text-white leading-none tracking-wide">FakeLineage</p>
              <p className="text-xs mt-0.5" style={{ color: '#475569' }}>Forensics Platform</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Live indicator */}
      {!collapsed && (
        <div className="mx-3 mt-3 px-3 py-2 rounded-lg flex items-center gap-2"
             style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.15)' }}>
          <Activity size={12} className="text-emerald-400" />
          <span className="text-xs text-emerald-400 font-medium">System Active</span>
          <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        </div>
      )}

      {/* Nav items */}
      <nav className="flex-1 px-2 py-3 space-y-1 overflow-y-auto">
        {navItems.map(({ path, label, icon: Icon }) => {
          const isActive = location.pathname === path;
          return (
            <NavLink key={path} to={path}>
              <motion.div
                whileHover={{ x: 2 }}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative',
                  isActive ? 'text-white' : 'text-slate-400 hover:text-white'
                )}
                style={isActive ? {
                  background: 'linear-gradient(135deg, rgba(6,182,212,0.15), rgba(168,85,247,0.1))',
                  border: '1px solid rgba(6,182,212,0.2)',
                } : {}}
              >
                {isActive && (
                  <motion.div layoutId="activeNav" className="absolute inset-0 rounded-xl"
                    style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.12), rgba(168,85,247,0.08))' }} />
                )}
                <Icon size={18} className={clsx(
                  'flex-shrink-0 relative z-10',
                  isActive ? 'text-cyan-400' : 'text-slate-500 group-hover:text-slate-300'
                )} />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="text-sm font-medium relative z-10 whitespace-nowrap">
                      {label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.div>
            </NavLink>
          );
        })}
      </nav>

      {/* User profile + logout */}
      <div className="border-t border-white/5 p-3 space-y-2">
        <div className={clsx('flex items-center gap-3 px-2 py-2 rounded-xl',
          collapsed ? 'justify-center' : '')}
          style={{ background: 'rgba(255,255,255,0.03)' }}>
          {/* Avatar */}
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold text-white"
               style={{ background: 'linear-gradient(135deg, #06b6d4, #a855f7)' }}>
            {initials}
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate">{user?.username ?? 'Guest'}</p>
                <p className="text-[10px] text-slate-500 truncate">{user?.email ?? ''}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Logout */}
        <button onClick={handleLogout}
          className={clsx(
            'w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-slate-400 hover:text-red-400 hover:bg-red-500/5 transition-all',
            collapsed ? 'justify-center' : ''
          )}>
          <LogOut size={14} className="flex-shrink-0" />
          {!collapsed && <span>Sign out</span>}
        </button>

        {/* Collapse toggle */}
        <button onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-white/5 text-slate-500 hover:text-slate-300 transition-all">
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
    </motion.aside>
  );
}
