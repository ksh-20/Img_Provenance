import { useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScanSearch } from 'lucide-react';
import { uploadImage, analyzeImage } from '../api/client';
import { useAppStore } from '../store/appStore';
import { ImageDropzone } from '../components/Upload';
import { VerdictCard, ScoreBreakdown } from '../components/Analysis';
import { ELAViewer, MetadataPanel } from '../components/Forensics';

export default function AnalysisPage() {
  const {
    isUploading, isAnalyzing, analysisResult, uploadedImage, error, previewUrl,
    setIsUploading, setIsAnalyzing, setUploadedImage, setAnalysisResult,
    setCurrentImageId, setError, setPreviewUrl, resetSession
  } = useAppStore();

  const fileRef = useRef<File | null>(null);

  const handleFile = useCallback((file: File) => {
    fileRef.current = file;
    setPreviewUrl(URL.createObjectURL(file));
    setAnalysisResult(null);
    setError(null);
  }, [setAnalysisResult, setError, setPreviewUrl]);

  const handleClear = () => {
    fileRef.current = null;
    resetSession();
  };

  const handleReset = () => {
    handleClear();
  };

  const runAnalysis = async () => {
    const file = fileRef.current;
    if (!file) return;
    try {
      setIsUploading(true); setError(null);
      const uploaded = await uploadImage(file);
      setUploadedImage(uploaded);
      setCurrentImageId(uploaded.image_id);
      setIsUploading(false);

      setIsAnalyzing(true);
      const result = await analyzeImage(uploaded.image_id);
      setAnalysisResult(result);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Analysis failed. Is the backend running on port 8000?');
    } finally {
      setIsUploading(false); setIsAnalyzing(false);
    }
  };

  const df = analysisResult?.deepfake_score;
  const verdict = df
    ? (df.is_deepfake ? 'DEEPFAKE' : df.overall_score > 0.3 ? 'SUSPICIOUS' : 'AUTHENTIC')
    : null;

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <ScanSearch size={28} className="text-cyan-400" /> Image Analysis
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Upload an image to run deepfake detection, ELA analysis, and metadata forensics
            </p>
          </div>
          {(analysisResult || previewUrl) && (
            <button
              onClick={handleReset}
              className="px-4 py-2 rounded-xl text-sm font-medium border border-white/10 text-slate-300 hover:bg-white/5 transition-colors"
            >
              Start New Analysis
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* ---- Left column: upload + metadata ---- */}
        <div className="space-y-5">
          <ImageDropzone
            onFile={handleFile}
            previewUrl={previewUrl}
            onClear={handleClear}
            uploading={isUploading}
            analyzing={isAnalyzing}
            imageInfo={uploadedImage ?? undefined}
            onAnalyze={runAnalysis}
          />

          {error && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="p-4 rounded-xl text-sm text-red-400"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
              ⚠ {error}
            </motion.div>
          )}

          {analysisResult?.metadata && (
            <MetadataPanel metadata={analysisResult.metadata} />
          )}
        </div>

        {/* ---- Right column: results ---- */}
        <div className="space-y-5">
          <AnimatePresence>
            {analysisResult && df && verdict && (
              <>
                <VerdictCard
                  key="verdict"
                  verdict={verdict as any}
                  score={df.overall_score}
                  modelVersion={df.model_version}
                />

                <ScoreBreakdown key="scores" score={df} />

                {analysisResult.ela_map && (
                  <ELAViewer
                    key="ela"
                    elaMap={analysisResult.ela_map}
                    manipulationRegions={analysisResult.manipulation_regions}
                  />
                )}
              </>
            )}

            {!analysisResult && !isAnalyzing && !previewUrl && (
              <motion.div key="placeholder"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="glass-card h-96 flex flex-col items-center justify-center text-center p-8">
                <ScanSearch size={48} className="text-cyan-400/20 mb-4" />
                <p className="text-slate-500 text-sm">Upload an image to begin forensic analysis</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
