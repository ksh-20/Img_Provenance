import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Layers, Upload, X, Play, CheckCircle, AlertCircle, Loader2, Download } from 'lucide-react';
import { uploadImage, analyzeImage } from '../api/client';
import { useAppStore } from '../store/appStore';

interface QueueItem {
  file: File;
  status: 'queued' | 'uploading' | 'analyzing' | 'done' | 'error';
  imageId?: string;
  verdict?: string;
  score?: number;
  error?: string;
  previewUrl: string;
}

const StatusIcon = ({ status }: { status: QueueItem['status'] }) => {
  switch (status) {
    case 'done': return <CheckCircle size={16} className="text-emerald-400" />;
    case 'error': return <AlertCircle size={16} className="text-red-400" />;
    case 'uploading':
    case 'analyzing': return <Loader2 size={16} className="text-cyan-400 animate-spin" />;
    default: return <div className="w-4 h-4 rounded-full border border-slate-600" />;
  }
};

const verdictStyle = (v?: string) => {
  const m: Record<string, string> = { DEEPFAKE: 'badge-deepfake', AUTHENTIC: 'badge-authentic', SUSPICIOUS: 'badge-suspicious', MANIPULATED: 'badge-manipulated' };
  return m[v ?? ''] ?? '';
};

export default function BatchAnalysisPage() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [running, setRunning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { setCurrentImageId } = useAppStore();

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const newItems: QueueItem[] = Array.from(files)
      .filter(f => f.type.startsWith('image/'))
      .map(f => ({ file: f, status: 'queued', previewUrl: URL.createObjectURL(f) }));
    setQueue(prev => [...prev, ...newItems]);
  };

  const updateItem = (index: number, update: Partial<QueueItem>) =>
    setQueue(prev => prev.map((item, i) => i === index ? { ...item, ...update } : item));

  const runBatch = async () => {
    setRunning(true);
    for (let i = 0; i < queue.length; i++) {
      if (queue[i].status === 'done') continue;
      try {
        updateItem(i, { status: 'uploading' });
        const uploaded = await uploadImage(queue[i].file);
        updateItem(i, { status: 'analyzing', imageId: uploaded.image_id });
        setCurrentImageId(uploaded.image_id);
        const result = await analyzeImage(uploaded.image_id);
        const score = result.deepfake_score.overall_score;
        const verdict = result.deepfake_score.is_deepfake ? 'DEEPFAKE'
          : score > 0.3 ? 'SUSPICIOUS' : 'AUTHENTIC';
        updateItem(i, { status: 'done', verdict, score });
      } catch (e: any) {
        updateItem(i, { status: 'error', error: e?.response?.data?.detail || 'Failed' });
      }
    }
    setRunning(false);
  };

  const clearDone = () => setQueue(prev => prev.filter(q => q.status !== 'done'));
  const removeItem = (i: number) => setQueue(prev => prev.filter((_, idx) => idx !== i));

  const done = queue.filter(q => q.status === 'done').length;
  const errors = queue.filter(q => q.status === 'error').length;
  const deepfakes = queue.filter(q => q.verdict === 'DEEPFAKE').length;

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Layers size={28} className="text-amber-400" /> Batch Analysis
          </h1>
          <p className="text-slate-400 text-sm mt-1">Analyze multiple images in parallel — queue-based forensics pipeline</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-200 border border-white/10 hover:bg-white/5 transition-colors">
            <Upload size={14} /> Add Images
          </button>
          <button onClick={runBatch} disabled={running || queue.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:scale-105 disabled:opacity-60 disabled:scale-100"
            style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }}>
            <Play size={14} /> {running ? 'Running...' : 'Run All'}
          </button>
        </div>
      </div>

      <input ref={fileInputRef} type="file" multiple accept="image/*" className="hidden"
        onChange={e => addFiles(e.target.files)} />

      {/* Progress summary */}
      {queue.length > 0 && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total', value: queue.length, color: '#06b6d4' },
            { label: 'Completed', value: done, color: '#10b981' },
            { label: 'Deepfakes', value: deepfakes, color: '#ef4444' },
            { label: 'Errors', value: errors, color: '#f59e0b' },
          ].map(s => (
            <div key={s.label} className="glass-card p-4">
              <p className="text-xs text-slate-500 mb-1">{s.label}</p>
              <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Overall progress bar */}
      {queue.length > 0 && (
        <div className="glass-card p-4 mb-5">
          <div className="flex justify-between text-xs text-slate-400 mb-2">
            <span>Overall Progress</span>
            <span>{done}/{queue.length}</span>
          </div>
          <div className="score-meter-track h-2">
            <motion.div className="score-meter-fill"
              style={{ background: 'linear-gradient(90deg, #06b6d4, #a855f7)' }}
              animate={{ width: `${queue.length ? (done / queue.length) * 100 : 0}%` }}
              transition={{ duration: 0.5 }} />
          </div>
        </div>
      )}

      {/* Queue table */}
      {queue.length === 0 ? (
        <div
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
          className="glass-card flex flex-col items-center justify-center h-64 text-center cursor-pointer hover:border-cyan-500/30 transition-all"
          style={{ border: '2px dashed rgba(99,179,237,0.15)' }}
          onClick={() => fileInputRef.current?.click()}
        >
          <Layers size={48} className="text-amber-400/20 mb-4" />
          <p className="text-slate-500 text-sm">Drag & drop images or click to add multiple images for batch forensics</p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
            <p className="text-sm font-medium text-slate-300">{queue.length} image(s) queued</p>
            <button onClick={clearDone} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
              Clear completed
            </button>
          </div>
          <div className="divide-y divide-white/5">
            {queue.map((item, i) => (
              <motion.div key={i} layout
                initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                className="flex items-center gap-4 px-5 py-3">
                {/* Thumbnail */}
                <img src={item.previewUrl} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />

                {/* Name + status */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate font-medium">{item.file.name}</p>
                  <p className="text-xs text-slate-500">
                    {(item.file.size / 1024).toFixed(0)} KB
                    {item.status === 'uploading' && ' · Uploading...'}
                    {item.status === 'analyzing' && ' · Analyzing...'}
                    {item.error && ` · ${item.error}`}
                  </p>
                </div>

                {/* Score */}
                {item.score !== undefined && (
                  <div className="text-right">
                    <p className="text-xs font-mono text-slate-300">{(item.score * 100).toFixed(1)}%</p>
                    <div className="score-meter-track h-1 w-20 mt-1">
                      <div className="score-meter-fill" style={{
                        width: `${item.score * 100}%`,
                        background: item.score > 0.5 ? '#ef4444' : item.score > 0.3 ? '#f59e0b' : '#10b981'
                      }} />
                    </div>
                  </div>
                )}

                {/* Verdict */}
                {item.verdict && (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${verdictStyle(item.verdict)}`}>
                    {item.verdict}
                  </span>
                )}

                <StatusIcon status={item.status} />
                <button onClick={() => removeItem(i)} className="text-slate-600 hover:text-slate-400 transition-colors">
                  <X size={14} />
                </button>
              </motion.div>
            ))}
          </div>

          {/* Export */}
          {done > 0 && (
            <div className="px-5 py-3 border-t border-white/5">
              <button
                onClick={() => {
                  const results = queue.filter(q => q.status === 'done').map(q => ({
                    filename: q.file.name, imageId: q.imageId, verdict: q.verdict, score: q.score
                  }));
                  const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a'); a.href = url; a.download = 'batch_results.json'; a.click();
                }}
                className="flex items-center gap-2 text-xs text-cyan-400 hover:text-cyan-300 transition-colors">
                <Download size={12} /> Export results as JSON
              </button>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
