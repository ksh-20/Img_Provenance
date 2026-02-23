import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';
import { AlertTriangle, GitBranch, Camera } from 'lucide-react';

/* ---------- types ---------- */
export interface ProvenanceNodeData {
  label: string;
  platform: string;
  deepfake_score: number;
  manipulation_type?: string;
  is_root: boolean;
  timestamp?: string;
  account_name?: string;
}

/* ---------- colour helpers ---------- */
export function nodeColor(data: ProvenanceNodeData): string {
  if (data.is_root) return '#a855f7';
  if (data.deepfake_score > 0.6) return '#ef4444';
  if (data.deepfake_score > 0.35) return '#f59e0b';
  return '#10b981';
}

/* ---------- custom node ---------- */
export function ProvenanceNode({ data }: NodeProps<ProvenanceNodeData>) {
  const color = nodeColor(data);
  const Icon = data.is_root ? Camera : data.deepfake_score > 0.5 ? AlertTriangle : GitBranch;
  const label = data.is_root ? 'Original' : data.deepfake_score > 0.6 ? 'Deepfake' : data.deepfake_score > 0.35 ? 'Suspicious' : 'Copy';

  return (
    <div
      className="provenance-node"
      style={{
        minWidth: 160,
        padding: '10px 12px',
        borderRadius: 12,
        background: 'rgba(8,12,20,0.92)',
        border: `1.5px solid ${color}45`,
        boxShadow: `0 0 18px ${color}18`,
        backdropFilter: 'blur(12px)',
      }}
    >
      <Handle type="target" position={Position.Top}
        style={{ background: color, width: 9, height: 9, border: `2px solid ${color}60` }} />

      {/* Header row */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
             style={{ background: `${color}15` }}>
          <Icon size={12} style={{ color }} />
        </div>
        <span className="text-xs font-semibold text-white truncate max-w-[108px]">{data.label}</span>
      </div>

      {/* Platform + score row */}
      <div className="flex items-center justify-between gap-1">
        <span className="px-1.5 py-0.5 rounded-md text-[10px] font-medium truncate max-w-[80px]"
              style={{ background: `${color}10`, color }}>
          {data.platform}
        </span>
        <span className="text-[10px] font-bold mono" style={{ color }}>
          {(data.deepfake_score * 100).toFixed(0)}%
        </span>
      </div>

      {/* Status badge */}
      <div className="mt-2 px-1.5 py-0.5 rounded text-[10px] text-center font-medium"
           style={{ background: `${color}08`, color }}>
        {label}
      </div>

      {/* Manipulation tag */}
      {data.manipulation_type && (
        <div className="mt-1.5 text-[10px] text-slate-400 truncate">
          ✂ {data.manipulation_type.replace(/_/g, ' ')}
        </div>
      )}

      <Handle type="source" position={Position.Bottom}
        style={{ background: color, width: 9, height: 9, border: `2px solid ${color}60` }} />
    </div>
  );
}

/* ---------- graph stats card ---------- */
interface GraphStatsProps {
  totalVersions: number;
  spreadDepth: number;
  integrityScore: number;
  chainBroken: boolean;
}

export function GraphStats({ totalVersions, spreadDepth, integrityScore, chainBroken }: GraphStatsProps) {
  const items = [
    { label: 'Total Versions', value: totalVersions },
    { label: 'Spread Depth',   value: spreadDepth },
    { label: 'Integrity',      value: `${(integrityScore * 100).toFixed(0)}%` },
    { label: 'Chain Status',   value: chainBroken ? '⚠ Broken' : '✓ Intact',
      color: chainBroken ? '#ef4444' : '#10b981' },
  ];
  return (
    <>
      {items.map(s => (
        <div key={s.label} className="glass-card p-4">
          <p className="text-xs text-slate-500 mb-0.5">{s.label}</p>
          <p className="text-xl font-bold" style={{ color: s.color ?? 'white' }}>{s.value}</p>
        </div>
      ))}
    </>
  );
}

/* ---------- graph legend ---------- */
export function GraphLegend() {
  return (
    <div className="glass-card p-4">
      <p className="text-xs font-semibold text-slate-400 mb-3">Node Legend</p>
      {[
        { color: '#a855f7', label: 'Original Source' },
        { color: '#ef4444', label: 'Deepfake (>60%)' },
        { color: '#f59e0b', label: 'Suspicious (35–60%)' },
        { color: '#10b981', label: 'Authentic Copy' },
      ].map(l => (
        <div key={l.label} className="flex items-center gap-2 mb-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ background: l.color }} />
          <span className="text-xs text-slate-400">{l.label}</span>
        </div>
      ))}
    </div>
  );
}
