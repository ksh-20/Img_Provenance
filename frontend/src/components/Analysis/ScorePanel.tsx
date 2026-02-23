import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle, Shield, XCircle, Eye } from 'lucide-react';
import type { DeepfakeScore } from '../../types';

interface ScoreBarProps {
  label: string;
  value: number;
  color: string;
  delay?: number;
}

export function ScoreBar({ label, value, color, delay = 0 }: ScoreBarProps) {
  const pct = value * 100;
  return (
    <div className="mb-3.5">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-slate-400">{label}</span>
        <span className="text-xs font-semibold mono" style={{ color }}>
          {pct.toFixed(1)}%
        </span>
      </div>
      <div className="score-meter-track h-1.5">
        <motion.div
          className="score-meter-fill"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, delay, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

/* ---- Radial gauge (SVG) ---- */
interface RadialGaugeProps {
  value: number;   // 0–1
  size?: number;
  color?: string;
  label?: string;
}

export function RadialGauge({ value, size = 88, color, label }: RadialGaugeProps) {
  const r = (size / 2) - 8;
  const circ = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value));
  const c = color ?? (pct > 0.5 ? '#ef4444' : pct > 0.3 ? '#f59e0b' : '#10b981');

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={7} />
        <circle cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={c} strokeWidth={7}
          strokeLinecap="round"
          strokeDasharray={`${pct * circ} ${circ}`}
          style={{ transition: 'stroke-dasharray 1s ease' }} />
      </svg>
      <div className="text-center -mt-14 mb-8 pointer-events-none">
        <p className="text-sm font-bold text-white mono">{(pct * 100).toFixed(0)}%</p>
      </div>
      {label && <p className="text-xs text-slate-400 text-center leading-tight">{label}</p>}
    </div>
  );
}

/* ---- Verdict badge ---- */
const VERDICT_MAP = {
  DEEPFAKE:    { color: '#ef4444', bg: 'rgba(239,68,68,0.09)',   Icon: XCircle,       label: 'DEEPFAKE DETECTED' },
  SUSPICIOUS:  { color: '#f59e0b', bg: 'rgba(245,158,11,0.09)',  Icon: AlertTriangle, label: 'SUSPICIOUS' },
  MANIPULATED: { color: '#a855f7', bg: 'rgba(168,85,247,0.09)',  Icon: Shield,        label: 'MANIPULATED' },
  AUTHENTIC:   { color: '#10b981', bg: 'rgba(16,185,129,0.09)',  Icon: CheckCircle,   label: 'LIKELY AUTHENTIC' },
} as const;
type VerdictKey = keyof typeof VERDICT_MAP;

interface VerdictCardProps {
  verdict: VerdictKey;
  score: number;
  modelVersion?: string;
}

export function VerdictCard({ verdict, score, modelVersion }: VerdictCardProps) {
  const cfg = VERDICT_MAP[verdict] ?? VERDICT_MAP['AUTHENTIC'];
  const { Icon } = cfg;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
      className="glass-card p-6 text-center relative overflow-hidden"
      style={{ border: `1px solid ${cfg.color}25`, background: cfg.bg }}
    >
      <div className="absolute inset-0 opacity-10 pointer-events-none"
           style={{ background: `radial-gradient(circle at center, ${cfg.color}60, transparent 70%)` }} />
      <Icon size={48} style={{ color: cfg.color }} className="mx-auto mb-3 relative z-10" />
      <h2 className="text-2xl font-black tracking-widest relative z-10" style={{ color: cfg.color }}>
        {cfg.label}
      </h2>
      <p className="text-slate-400 text-sm mt-1 relative z-10">
        Overall confidence: <span className="font-bold text-white">{(score * 100).toFixed(1)}%</span>
      </p>
      {modelVersion && (
        <span className="inline-block mt-2 px-3 py-0.5 rounded-full text-xs font-mono relative z-10"
              style={{ background: `${cfg.color}15`, color: cfg.color }}>
          {modelVersion}
        </span>
      )}
    </motion.div>
  );
}

/* ---- Full score breakdown panel ---- */
interface ScoreBreakdownProps {
  score: DeepfakeScore;
}

export function ScoreBreakdown({ score }: ScoreBreakdownProps) {
  const bars = [
    { label: 'GAN Artifact Score',     value: score.gan_artifact_score,       color: '#a855f7' },
    { label: 'Face Swap Score',         value: score.face_swap_score,           color: '#ef4444' },
    { label: 'ELA Manipulation',        value: score.ela_score,                 color: '#f59e0b' },
    { label: 'Noise Inconsistency',     value: score.noise_inconsistency,       color: '#06b6d4' },
    { label: 'Compression Artifacts',   value: score.compression_inconsistency, color: '#10b981' },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
      className="glass-card p-5">
      <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
        <Eye size={14} className="text-cyan-400" /> Detection Signal Breakdown
      </h3>
      {bars.map((b, i) => <ScoreBar key={b.label} {...b} delay={i * 0.1} />)}

      {/* Radial gauges row */}
      <div className="flex justify-around mt-5 pt-4 border-t border-white/5">
        {bars.slice(0, 4).map(b => (
          <RadialGauge key={b.label} value={b.value} size={72} color={b.color}
            label={b.label.split(' ')[0]} />
        ))}
      </div>
    </motion.div>
  );
}
