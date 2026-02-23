import { motion } from 'framer-motion';
import { Download, FileText, Shield, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import type { ForensicsReport } from '../../types';

/* ---- Verdict config ---- */
const VERDICT_CFG = {
  AUTHENTIC:   { color: '#10b981', Icon: CheckCircle,   label: 'AUTHENTIC'   },
  SUSPICIOUS:  { color: '#f59e0b', Icon: AlertTriangle, label: 'SUSPICIOUS'  },
  MANIPULATED: { color: '#a855f7', Icon: Shield,        label: 'MANIPULATED' },
  DEEPFAKE:    { color: '#ef4444', Icon: XCircle,       label: 'DEEPFAKE'    },
} as const;

/* ---- Report Summary card ---- */
interface ReportSummaryProps {
  report: ForensicsReport;
}

export function ReportSummary({ report }: ReportSummaryProps) {
  const cfg = VERDICT_CFG[report.verdict] ?? VERDICT_CFG['AUTHENTIC'];
  const { Icon } = cfg;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
      className="glass-card p-8 text-center relative overflow-hidden"
      style={{ border: `1px solid ${cfg.color}22` }}
    >
      {/* ambient glow */}
      <div className="absolute inset-0 opacity-10 pointer-events-none"
           style={{ background: `radial-gradient(circle at center, ${cfg.color}60, transparent 70%)` }} />

      <Icon size={56} style={{ color: cfg.color }} className="mx-auto mb-4 relative z-10" />
      <h2 className="text-4xl font-black tracking-widest relative z-10" style={{ color: cfg.color }}>
        {cfg.label}
      </h2>
      <p className="text-slate-300 mt-2 text-sm relative z-10">
        Authenticity Score:{' '}
        <span className="font-bold text-white">{(report.overall_authenticity_score * 100).toFixed(1)}%</span>
        &nbsp;·&nbsp;
        <span className="mono text-slate-400 text-xs">{report.report_id}</span>
      </p>
      <p className="text-slate-500 text-xs mt-1 relative z-10">
        {new Date(report.generated_at).toLocaleString()}
      </p>
    </motion.div>
  );
}

/* ---- Evidence list ---- */
interface EvidenceListProps {
  items: string[];
}

export function EvidenceList({ items }: EvidenceListProps) {
  return (
    <div className="glass-card p-5">
      <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
        <AlertTriangle size={14} className="text-amber-400" /> Evidence Summary
      </h3>
      <div className="space-y-2">
        {items.map((ev, i) => (
          <div key={i}
            className="flex items-start gap-2 p-2.5 rounded-lg text-xs"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <span className="text-slate-500 mt-0.5 flex-shrink-0 font-mono">#{i + 1}</span>
            <span className="text-slate-300">{ev}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---- Chain of custody ---- */
interface ChainOfCustodyProps {
  chain: ForensicsReport['chain_of_custody'];
}

export function ChainOfCustody({ chain }: ChainOfCustodyProps) {
  return (
    <div className="glass-card p-5">
      <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
        <Shield size={14} className="text-cyan-400" /> Chain of Custody
      </h3>
      <div className="relative">
        <div className="absolute left-4 top-0 bottom-0 w-px bg-gradient-to-b from-cyan-500/40 to-transparent" />
        {chain.map((step, i) => (
          <div key={i} className="flex items-start gap-4 mb-4 relative">
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 relative z-10 text-xs font-bold text-white"
                 style={{ background: 'linear-gradient(135deg, #06b6d4, #a855f7)' }}>
              {step.step}
            </div>
            <div className="flex-1 pt-1">
              <p className="text-sm font-medium text-white">{step.action}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {step.agent}
                {step.timestamp && ` · ${new Date(step.timestamp).toLocaleString()}`}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---- JSON export button ---- */
interface PDFExportButtonProps {
  report: ForensicsReport;
}

export function JSONExportButton({ report }: PDFExportButtonProps) {
  const download = () => {
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `fakelineage_report_${report.image_id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={download}
      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-200 border border-white/10 hover:bg-white/5 hover:border-cyan-500/30 transition-all"
    >
      <Download size={14} /> Export JSON
    </button>
  );
}

/* ---- Score ring row ---- */
interface ScoreRingsProps {
  scores: Array<{ label: string; value: number; color: string }>;
}

export function ScoreRings({ scores }: ScoreRingsProps) {
  return (
    <div className="glass-card p-5">
      <h3 className="text-sm font-semibold text-slate-300 mb-5 flex items-center gap-2">
        <FileText size={14} className="text-rose-400" /> Detection Scores
      </h3>
      <div className="flex justify-around flex-wrap gap-4">
        {scores.map(s => {
          const r = 26, circ = 2 * Math.PI * r;
          return (
            <div key={s.label} className="flex flex-col items-center gap-1">
              <div className="relative w-16 h-16">
                <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
                  <circle cx="32" cy="32" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={6} />
                  <circle cx="32" cy="32" r={r} fill="none" stroke={s.color} strokeWidth={6}
                    strokeLinecap="round"
                    strokeDasharray={`${s.value * circ} ${circ}`} />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-bold text-white">{(s.value * 100).toFixed(0)}%</span>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 text-center leading-tight max-w-[64px]">{s.label}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
