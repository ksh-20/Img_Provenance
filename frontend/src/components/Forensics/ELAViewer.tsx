import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Eye, AlertTriangle } from 'lucide-react';
import type { ManipulationRegion, MetadataAnalysis } from '../../types';

/* ===================== ELA Canvas ===================== */
interface ELACanvasProps {
  elaMap: number[][];
  className?: string;
}

export function ELACanvas({ elaMap, className = '' }: ELACanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !elaMap?.length) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const h = elaMap.length, w = elaMap[0].length;
    canvas.width = w; canvas.height = h;
    const imgData = ctx.createImageData(w, h);

    for (let r = 0; r < h; r++) {
      for (let c = 0; c < w; c++) {
        const v   = elaMap[r][c];
        const idx = (r * w + c) * 4;
        imgData.data[idx]   = Math.floor(Math.min(255, v * 3.2 * 255));
        imgData.data[idx+1] = Math.floor(Math.min(255, (1 - Math.abs(v - 0.5) * 2) * 255));
        imgData.data[idx+2] = Math.floor(Math.min(255, (1 - v) * 3.2 * 255));
        imgData.data[idx+3] = Math.floor(105 + v * 150);
      }
    }
    ctx.putImageData(imgData, 0, 0);
  }, [elaMap]);

  return (
    <canvas
      ref={canvasRef}
      className={`ela-canvas w-full h-full object-cover ${className}`}
      style={{ imageRendering: 'pixelated' }}
    />
  );
}

/* ===================== ELA Legend ===================== */
export function ELALegend() {
  return (
    <div className="flex items-center gap-2 mt-2">
      <span className="text-xs text-slate-500">Low</span>
      <div className="flex-1 h-2 rounded-full" style={{
        background: 'linear-gradient(to right, #000066, #00aaff, #00ff88, #ffff00, #ff0000)'
      }} />
      <span className="text-xs text-slate-500">High tampering</span>
    </div>
  );
}

/* ===================== ELA Viewer Panel ===================== */
interface ELAViewerProps {
  elaMap: number[][];
  manipulationRegions?: ManipulationRegion[];
}

export function ELAViewer({ elaMap, manipulationRegions = [] }: ELAViewerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="glass-card p-5"
    >
      <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
        <Eye size={14} className="text-cyan-400" /> ELA Heatmap — Manipulation Map
      </h3>

      <div className="rounded-xl overflow-hidden" style={{ height: 210 }}>
        <ELACanvas elaMap={elaMap} />
      </div>
      <ELALegend />
      <p className="text-xs text-slate-500 mt-1.5">
        Red/yellow zones indicate high error levels — potential manipulation regions
      </p>

      {manipulationRegions.length > 0 && (
        <div className="mt-4 space-y-1.5">
          <p className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
            <AlertTriangle size={11} className="text-amber-400" />
            {manipulationRegions.length} suspicious region(s)
          </p>
          {manipulationRegions.slice(0, 5).map((r, i) => (
            <div key={i}
              className="flex items-center gap-2 text-xs p-2 rounded-lg"
              style={{ background: 'rgba(168,85,247,0.07)' }}>
              <span className="px-1.5 py-0.5 rounded text-purple-400 bg-purple-500/10 font-mono text-[10px]">
                {r.type}
              </span>
              <span className="text-slate-400">
                ({r.x}, {r.y}) · w{r.width}×h{r.height} · {(r.confidence * 100).toFixed(0)}% conf
              </span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

/* ===================== Metadata Panel ===================== */
interface MetadataPanelProps {
  metadata: MetadataAnalysis;
}

export function MetadataPanel({ metadata }: MetadataPanelProps) {
  const rows = [
    { k: 'Has EXIF',      v: metadata.has_exif ? '✓ Present' : '✗ Stripped' },
    { k: 'Camera',        v: [metadata.camera_make, metadata.camera_model].filter(Boolean).join(' ') || '—' },
    { k: 'Software',      v: metadata.software || '—' },
    { k: 'Date Captured', v: metadata.datetime_original || '—' },
    { k: 'GPS',           v: metadata.gps_latitude != null ? `${metadata.gps_latitude.toFixed(4)}, ${metadata.gps_longitude?.toFixed(4)}` : 'None' },
    { k: 'JPEG Quality',  v: metadata.compression_quality != null ? `${metadata.compression_quality}%` : '—' },
    { k: 'Consistency',   v: `${(metadata.consistency_score * 100).toFixed(0)}%` },
    { k: 'Steganography', v: metadata.steganography_detected ? `⚠ Detected (${(metadata.lsb_anomaly_score * 100).toFixed(0)}%)` : '✓ None' },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5">
      <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
        <Eye size={14} className="text-cyan-400" /> Metadata Analysis
      </h3>

      <div>
        {rows.map(({ k, v }) => (
          <div key={k} className="flex items-center justify-between text-xs py-1.5 border-b border-white/5 last:border-0">
            <span className="text-slate-500">{k}</span>
            <span className="text-slate-200 mono text-right max-w-[55%] truncate">{v}</span>
          </div>
        ))}
      </div>

      {metadata.suspicious_flags.length > 0 && (
        <div className="mt-3 space-y-1">
          {metadata.suspicious_flags.map((f, i) => (
            <div key={i}
              className="flex items-start gap-2 text-xs text-amber-300 p-2 rounded-lg"
              style={{ background: 'rgba(245,158,11,0.07)' }}>
              <AlertTriangle size={11} className="mt-0.5 flex-shrink-0" /> {f}
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
