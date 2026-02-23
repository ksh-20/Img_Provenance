import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Shield, AlertTriangle, CheckCircle, ScanSearch,
  GitBranch, Activity, TrendingUp, Clock, ChevronRight
} from 'lucide-react';
import { getDashboardStats } from '../api/client';
import type { DashboardStats } from '../types';

function AnimatedCounter({ target, duration = 1.5 }: { target: number; duration?: number }) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const steps = 60;
    const inc = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += inc;
      if (current >= target) { setValue(target); clearInterval(timer); }
      else setValue(Math.floor(current));
    }, (duration * 1000) / steps);
    return () => clearInterval(timer);
  }, [target, duration]);
  return <span>{value.toLocaleString()}</span>;
}

const verdictClass = (v: string) => {
  const map: Record<string, string> = {
    DEEPFAKE: 'badge-deepfake', AUTHENTIC: 'badge-authentic',
    SUSPICIOUS: 'badge-suspicious', MANIPULATED: 'badge-manipulated', Pending: 'badge-suspicious'
  };
  return map[v] ?? 'badge-suspicious';
};

const MOCK_STATS: DashboardStats = {
  total_analyses: 0, deepfakes_detected: 0, authentic_images: 0, suspicious_images: 0,
  total_nodes_in_graphs: 0, average_integrity_score: 0.9, platforms_tracked: 8, recent_analyses: []
};

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>(MOCK_STATS);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getDashboardStats().then(setStats).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const statCards = [
    { label: 'Total Analyses', value: stats.total_analyses, icon: ScanSearch, color: '#06b6d4', glow: 'rgba(6,182,212,0.2)' },
    { label: 'Deepfakes Detected', value: stats.deepfakes_detected, icon: AlertTriangle, color: '#ef4444', glow: 'rgba(239,68,68,0.2)' },
    { label: 'Authentic Images', value: stats.authentic_images, icon: CheckCircle, color: '#10b981', glow: 'rgba(16,185,129,0.2)' },
    { label: 'Suspicious', value: stats.suspicious_images, icon: Shield, color: '#f59e0b', glow: 'rgba(245,158,11,0.2)' },
    { label: 'Graph Nodes', value: stats.total_nodes_in_graphs, icon: GitBranch, color: '#a855f7', glow: 'rgba(168,85,247,0.2)' },
    { label: 'Platforms Tracked', value: stats.platforms_tracked, icon: Activity, color: '#06b6d4', glow: 'rgba(6,182,212,0.2)' },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold text-white">Forensics Dashboard</h1>
          <span className="px-3 py-1 rounded-full text-xs font-semibold" style={{ background: 'rgba(6,182,212,0.15)', color: '#06b6d4', border: '1px solid rgba(6,182,212,0.3)' }}>
            FakeLineage v1.0
          </span>
        </div>
        <p className="text-slate-400 text-sm">Deepfake-aware image provenance analysis & social media forensics</p>
      </div>

      {/* Hero Banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="relative rounded-2xl p-8 mb-8 overflow-hidden"
        style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.12), rgba(168,85,247,0.08))', border: '1px solid rgba(6,182,212,0.15)' }}
      >
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 70% 50%, rgba(168,85,247,0.4) 0%, transparent 60%)' }} />
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Image Provenance Graph Construction
            </h2>
            <p className="text-slate-300 text-sm max-w-xl">
              Upload an image to trace its origin, detect deepfake manipulation, construct a provenance lineage graph,
              and track its viral spread across social platforms.
            </p>
            <button
              onClick={() => navigate('/analysis')}
              className="mt-4 flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #06b6d4, #a855f7)', color: 'white' }}
            >
              <ScanSearch size={16} /> Start Analysis <ChevronRight size={14} />
            </button>
          </div>
          <div className="hidden lg:flex items-center justify-center w-32 h-32 rounded-2xl"
               style={{ background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)' }}>
            <TrendingUp size={64} style={{ color: 'rgba(6,182,212,0.5)' }} />
          </div>
        </div>
      </motion.div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        {statCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.07 }}
            className="glass-card glass-card-hover p-4"
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                   style={{ background: `rgba(${card.glow.match(/\d+/g)?.slice(0,3).join(',')}, 0.15)` }}>
                <card.icon size={16} style={{ color: card.color }} />
              </div>
            </div>
            <p className="text-2xl font-bold text-white">
              {loading ? '—' : <AnimatedCounter target={card.value} />}
            </p>
            <p className="text-xs text-slate-500 mt-1">{card.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Integrity Score + Recent */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Integrity Score Gauge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="glass-card p-6 flex flex-col items-center"
        >
          <h3 className="text-sm font-semibold text-slate-400 mb-4 self-start">Avg. Chain Integrity</h3>
          <div className="relative w-32 h-32">
            <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
              <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
              <circle cx="60" cy="60" r="50" fill="none"
                stroke="url(#integrityGrad)" strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${stats.average_integrity_score * 314} 314`}
              />
              <defs>
                <linearGradient id="integrityGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#06b6d4" />
                  <stop offset="100%" stopColor="#a855f7" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-white">{(stats.average_integrity_score * 100).toFixed(0)}%</span>
              <span className="text-xs text-slate-500">integrity</span>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-4 text-center">Provenance chain trustworthiness score across all analyzed images</p>
        </motion.div>

        {/* Recent Analyses */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.45 }}
          className="glass-card p-6 lg:col-span-2"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-300">Recent Analyses</h3>
            <button onClick={() => navigate('/analysis')} className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
              <Clock size={12} /> View all
            </button>
          </div>
          {stats.recent_analyses.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-slate-600">
              <ScanSearch size={32} className="mb-2 opacity-40" />
              <p className="text-sm">No analyses yet — upload an image to begin</p>
              <button onClick={() => navigate('/analysis')}
                className="mt-3 px-4 py-2 rounded-lg text-xs font-medium text-cyan-400 border border-cyan-400/20 hover:bg-cyan-400/5 transition-colors">
                Start First Analysis
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {stats.recent_analyses.map((item) => (
                <div key={item.image_id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
                     onClick={() => navigate('/report')}>
                  <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0">
                    <ScanSearch size={14} className="text-cyan-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate font-medium">{item.filename || 'Unknown'}</p>
                    <p className="text-xs text-slate-500">{new Date(item.upload_time).toLocaleString()}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${verdictClass(item.verdict)}`}>
                    {item.verdict}
                  </span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Feature Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        {[
          { icon: ScanSearch, label: 'Deepfake Detection', desc: 'GAN artifacts, ELA, face-swap analysis', color: '#06b6d4', path: '/analysis' },
          { icon: GitBranch, label: 'Provenance Graph', desc: 'Image lineage & derivative chain', color: '#a855f7', path: '/provenance' },
          { icon: Activity, label: 'Social Spread', desc: 'Viral spread across platforms', color: '#10b981', path: '/social' },
          { icon: Shield, label: 'Steganography', desc: 'LSB hidden data detection', color: '#f59e0b', path: '/analysis' },
        ].map((f, i) => (
          <motion.div
            key={f.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + i * 0.08 }}
            className="glass-card glass-card-hover p-5 cursor-pointer"
            onClick={() => navigate(f.path)}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                 style={{ background: `${f.color}18`, border: `1px solid ${f.color}30` }}>
              <f.icon size={20} style={{ color: f.color }} />
            </div>
            <h4 className="text-sm font-semibold text-white mb-1">{f.label}</h4>
            <p className="text-xs text-slate-500">{f.desc}</p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
