import { useState } from 'react';
import { motion } from 'framer-motion';
import { Share2, RefreshCw, Bot, Users, TrendingUp, Activity, Radio } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from 'recharts';
import { getSocialSpread } from '../api/client';
import { useAppStore } from '../store/appStore';
import type { SocialSpreadGraph } from '../types';

const PLATFORM_COLORS: Record<string, string> = {
  Twitter: '#1d9bf0', Instagram: '#e1306c', Facebook: '#1877f2',
  Reddit: '#ff4500', Telegram: '#26a5e4', TikTok: '#69c9d0',
  WhatsApp: '#25d366', '4chan': '#9fef00',
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card p-3 text-xs space-y-1 border border-cyan-500/20">
      <p className="text-slate-300 font-semibold mb-1">{new Date(label).toLocaleString()}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-slate-400">{p.name}:</span>
          <span className="text-white font-mono">{p.value?.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
};

export default function SocialTrackerPage() {
  const [spread, setSpread] = useState<SocialSpreadGraph | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { currentImageId, setSocialSpread } = useAppStore();

  const load = async () => {
    if (!currentImageId) { setError('Analyze an image first on the Analysis page.'); return; }
    setLoading(true); setError(null);
    try {
      const s = await getSocialSpread(currentImageId);
      setSpread(s); setSocialSpread(s);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to load social spread data');
    } finally { setLoading(false); }
  };

  // Build timeline chart data (group by hour)
  const timelineData = spread?.spread_timeline.slice(0, 30).map(n => ({
    time: n.timestamp,
    reach: n.reach,
    shares: n.shares,
    platform: n.platform,
  })) ?? [];

  // Platform aggregation
  const platformData = spread ? Object.entries(
    spread.spread_timeline.reduce((acc, n) => {
      acc[n.platform] = (acc[n.platform] ?? 0) + n.reach;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, reach]) => ({ name, reach })) : [];

  const botCount = spread?.spread_timeline.filter(n => n.is_bot).length ?? 0;
  const totalPosts = spread?.spread_timeline.length ?? 0;
  const botRatio = totalPosts ? (botCount / totalPosts) * 100 : 0;

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Share2 size={28} className="text-emerald-400" /> Social Spread Tracker
          </h1>
          <p className="text-slate-400 text-sm mt-1">Cross-platform viral propagation analysis & bot detection</p>
        </div>
        <button
          onClick={load} disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:scale-105 disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, #10b981, #06b6d4)' }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Simulating...' : 'Simulate Spread'}
        </button>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl text-sm text-amber-400"
             style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
          ⚠ {error}
        </div>
      )}

      {spread ? (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Total Reach', value: spread.total_reach.toLocaleString(), icon: Users, color: '#06b6d4' },
              { label: 'Viral Coefficient', value: spread.viral_coefficient.toFixed(2), icon: TrendingUp, color: '#a855f7' },
              { label: 'Platforms', value: spread.platforms.length, icon: Radio, color: '#10b981' },
              { label: 'Bot Activity', value: `${botRatio.toFixed(0)}%`, icon: Bot, color: botRatio > 30 ? '#ef4444' : '#f59e0b' },
            ].map((k, i) => (
              <motion.div key={k.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                className="glass-card p-5">
                <div className="flex items-center gap-2 mb-2">
                  <k.icon size={16} style={{ color: k.color }} />
                  <span className="text-xs text-slate-400">{k.label}</span>
                </div>
                <p className="text-2xl font-bold text-white mono">{k.value}</p>
              </motion.div>
            ))}
          </div>

          {/* Platform badges */}
          <div className="flex flex-wrap gap-2 mb-6">
            {spread.platforms.map(p => (
              <span key={p} className="px-3 py-1 rounded-full text-xs font-semibold"
                    style={{ background: `${PLATFORM_COLORS[p] ?? '#666'}20`, color: PLATFORM_COLORS[p] ?? '#aaa', border: `1px solid ${PLATFORM_COLORS[p] ?? '#666'}40` }}>
                {p}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-5">
            {/* Reach timeline */}
            <div className="xl:col-span-2 glass-card p-5">
              <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
                <Activity size={14} className="text-emerald-400" /> Reach Over Time
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={timelineData}>
                  <defs>
                    <linearGradient id="reachGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="sharesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="time" tick={{ fill: '#475569', fontSize: 10 }}
                    tickFormatter={v => new Date(v).toLocaleDateString()} />
                  <YAxis tick={{ fill: '#475569', fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="reach" stroke="#06b6d4" fill="url(#reachGrad)" strokeWidth={2} name="Reach" />
                  <Area type="monotone" dataKey="shares" stroke="#a855f7" fill="url(#sharesGrad)" strokeWidth={2} name="Shares" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Platform reach bar */}
            <div className="glass-card p-5">
              <h3 className="text-sm font-semibold text-slate-300 mb-4">Reach by Platform</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={platformData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis type="number" tick={{ fill: '#475569', fontSize: 10 }} />
                  <YAxis dataKey="name" type="category" tick={{ fill: '#94a3b8', fontSize: 11 }} width={70} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="reach" radius={[0, 4, 4, 0]}>
                    {platformData.map((entry) => (
                      <Cell key={entry.name} fill={PLATFORM_COLORS[entry.name] ?? '#06b6d4'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Spread timeline table */}
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-slate-300 mb-4">Spread Timeline</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-500 border-b border-white/5">
                    {['Platform', 'Account', 'Time', 'Reach', 'Shares', 'Likes', 'Deepfake%', 'Bot'].map(h => (
                      <th key={h} className="text-left py-2 px-3 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {spread.spread_timeline.slice(0, 15).map((n, i) => (
                    <tr key={i} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                      <td className="py-2 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                              style={{ background: `${PLATFORM_COLORS[n.platform] ?? '#666'}15`, color: PLATFORM_COLORS[n.platform] ?? '#aaa' }}>
                          {n.platform}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-300 mono">{n.account_name}</td>
                      <td className="py-2 px-3 text-slate-500">{new Date(n.timestamp).toLocaleString()}</td>
                      <td className="py-2 px-3 text-cyan-400 mono">{n.reach.toLocaleString()}</td>
                      <td className="py-2 px-3 text-slate-300 mono">{n.shares.toLocaleString()}</td>
                      <td className="py-2 px-3 text-slate-300 mono">{n.likes.toLocaleString()}</td>
                      <td className="py-2 px-3">
                        <span className={n.deepfake_score > 0.5 ? 'text-red-400' : 'text-green-400'}>
                          {(n.deepfake_score * 100).toFixed(0)}%
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        {n.is_bot
                          ? <span className="px-1.5 py-0.5 rounded text-[10px] badge-deepfake"><Bot size={10} className="inline mr-1" />Bot</span>
                          : <span className="text-slate-500">Human</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="glass-card flex flex-col items-center justify-center h-80 text-center text-slate-600">
          <Share2 size={56} className="mb-4 opacity-20" />
          <p className="text-sm">Simulate social spread after analyzing an image</p>
        </div>
      )}
    </motion.div>
  );
}
