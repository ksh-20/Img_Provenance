import { useCallback, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, ImageIcon, Zap } from 'lucide-react';
import clsx from 'clsx';

interface ImageDropzoneProps {
  onFile: (file: File) => void;
  previewUrl?: string | null;
  onClear?: () => void;
  uploading?: boolean;
  analyzing?: boolean;
  imageInfo?: { width: number; height: number; format: string } | null;
  onAnalyze?: () => void;
  disabled?: boolean;
}

export default function ImageDropzone({
  onFile, previewUrl, onClear,
  uploading = false, analyzing = false,
  imageInfo, onAnalyze, disabled = false,
}: ImageDropzoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith('image/')) onFile(file);
  }, [onFile]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFile(file);
  }, [onFile]);

  const busy = uploading || analyzing;

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !previewUrl && !busy && inputRef.current?.click()}
        className={clsx(
          'relative rounded-2xl overflow-hidden transition-all duration-300',
          previewUrl ? '' : 'cursor-pointer hover:border-cyan-500/30',
          dragOver && 'dropzone-active scale-[1.01]',
        )}
        style={{ minHeight: 264, border: '2px dashed rgba(99,179,237,0.2)', background: 'rgba(8,12,20,0.6)' }}
      >
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleChange} />

        <AnimatePresence mode="wait">
          {previewUrl ? (
            <motion.div key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="relative w-full h-64">
              <img src={previewUrl} alt="Preview" className="w-full h-full object-contain" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />
              {imageInfo && (
                <div className="absolute bottom-3 left-3 text-xs text-white/70 mono bg-black/40 px-2 py-1 rounded-lg">
                  {imageInfo.width}×{imageInfo.height} · {imageInfo.format}
                </div>
              )}
              <button
                onClick={e => { e.stopPropagation(); onClear?.(); }}
                className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-red-500/70 transition-colors"
              >
                <X size={13} />
              </button>
            </motion.div>
          ) : (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center h-64 gap-4 p-6 text-center">
              <motion.div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background: 'rgba(6,182,212,0.07)', border: '1px dashed rgba(6,182,212,0.3)' }}
                animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}>
                <Upload size={28} style={{ color: 'rgba(6,182,212,0.6)' }} />
              </motion.div>
              <div>
                <p className="text-slate-300 font-medium">Drag & drop an image</p>
                <p className="text-slate-500 text-sm mt-1">or click to browse · PNG, JPG, WEBP, BMP</p>
              </div>
              <div className="flex items-center gap-3 flex-wrap justify-center">
                {['deepfake detection', 'ELA heatmap', 'metadata forensics'].map(tag => (
                  <span key={tag} className="px-2 py-0.5 rounded-full text-[10px] text-slate-500 border border-white/10">{tag}</span>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Drag overlay */}
        <AnimatePresence>
          {dragOver && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
              style={{ background: 'rgba(6,182,212,0.07)' }}>
              <div className="flex flex-col items-center gap-2">
                <ImageIcon size={32} className="text-cyan-400" />
                <p className="text-cyan-400 font-semibold text-sm">Drop to analyze</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Analyze button */}
      <AnimatePresence>
        {previewUrl && onAnalyze && (
          <motion.button
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            onClick={onAnalyze}
            disabled={busy || disabled}
            className="w-full py-3.5 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all duration-200 hover:scale-[1.02] active:scale-100 disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100"
            style={{ background: 'linear-gradient(135deg, #06b6d4, #a855f7)' }}
          >
            {busy ? (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                {uploading ? 'Uploading…' : 'Analyzing…'}
              </>
            ) : (
              <><Zap size={15} /> Run Forensic Analysis</>
            )}
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
