import { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, RefreshCw } from 'lucide-react';
import { getReport, downloadReportPDF } from '../api/client';
import { useAppStore } from '../store/appStore';
import type { ForensicsReport } from '../types';
import {
  ReportSummary, EvidenceList, ChainOfCustody, JSONExportButton, ScoreRings,
} from '../components/Reports';

export default function ForensicsReportPage() {
  const [report, setReport] = useState<ForensicsReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { currentImageId, setReport: storeSetReport } = useAppStore();

  const load = async () => {
    if (!currentImageId) { setError('Analyze an image and run provenance + social analysis first.'); return; }
    setLoading(true); setError(null);
    try {
      const r = await getReport(currentImageId);
      setReport(r); storeSetReport(r);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Report generation failed. Run all analyses first.');
    } finally { setLoading(false); }
  };

  const handleDownloadPDF = async () => {
    if (!currentImageId) return;
    try {
      const blob = await downloadReportPDF(currentImageId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `FakeLineage_Report_${currentImageId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e) {
      console.error('PDF download failed', e);
    }
  };

  const scoreRings = report ? [
    { label: 'Overall Deepfake', value: report.deepfake_analysis.overall_score,           color: '#ef4444' },
    { label: 'GAN Artifacts',    value: report.deepfake_analysis.gan_artifact_score,       color: '#a855f7' },
    { label: 'Face Swap',        value: report.deepfake_analysis.face_swap_score,           color: '#f59e0b' },
    { label: 'ELA Score',        value: report.deepfake_analysis.ela_score,                 color: '#06b6d4' },
    { label: 'Noise',            value: report.deepfake_analysis.noise_inconsistency,       color: '#10b981' },
  ] : [];

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <FileText size={28} className="text-rose-400" /> Forensics Report
          </h1>
          <p className="text-slate-400 text-sm mt-1">Comprehensive chain-of-custody report with evidence summary</p>
        </div>
        <div className="flex gap-3">
          {report && (
            <>
              <JSONExportButton report={report} />
              <button 
                onClick={handleDownloadPDF}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white border border-rose-400/30 hover:bg-white/5 transition-all"
              >
                <FileText size={14} /> Export PDF
              </button>
            </>
          )}
          <button onClick={load} disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white hover:scale-105 transition-all disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #ef4444, #a855f7)' }}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Generating…' : 'Generate Report'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl text-sm text-amber-400"
             style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
          ⚠ {error}
        </div>
      )}

      {report ? (
        <div className="space-y-5">
          <ReportSummary report={report} />
          <ScoreRings scores={scoreRings} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <EvidenceList items={report.evidence_summary} />
            <ChainOfCustody chain={report.chain_of_custody} />
          </div>

          {/* Provenance + social quick stats */}
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-slate-300 mb-4">Provenance & Spread Summary</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Image Versions', value: report.provenance_graph.total_versions },
                { label: 'Spread Depth',   value: report.provenance_graph.spread_depth },
                { label: 'Chain Integrity', value: `${(report.provenance_graph.integrity_score * 100).toFixed(0)}%` },
                { label: 'Total Reach',    value: report.social_spread.total_reach.toLocaleString() },
              ].map(s => (
                <div key={s.label} className="text-center p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)' }}>
                  <p className="text-xl font-bold text-white">{s.value}</p>
                  <p className="text-xs text-slate-500 mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-card flex flex-col items-center justify-center h-80 text-center text-slate-600">
          <FileText size={56} className="mb-4 opacity-20" />
          <p className="text-sm">Generate the report after completing all analysis steps</p>
          <p className="text-xs mt-2 text-slate-600">Upload → Analyze → Build Graph → Simulate Spread → Generate Report</p>
        </div>
      )}
    </motion.div>
  );
}
