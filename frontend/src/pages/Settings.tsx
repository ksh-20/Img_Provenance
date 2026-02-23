import { motion } from 'framer-motion';
import { Settings, Server, Sliders, Info, Brain, Cloud } from 'lucide-react';
import { useSettingsStore } from '../store/settingsStore';
import { useState } from 'react';

function Section({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="glass-card p-5 mb-4">
      <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2 mb-4">
        <Icon size={14} className="text-cyan-400" /> {title}
      </h3>
      {children}
    </div>
  );
}

function ToggleRow({ label, desc, value, onChange }: { label: string; desc: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
      <div>
        <p className="text-sm text-white">{label}</p>
        <p className="text-xs text-slate-500">{desc}</p>
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input 
          type="checkbox" 
          className="sr-only peer" 
          checked={value} 
          onChange={(e) => onChange(e.target.checked)} 
        />
        <div className="w-10 h-5 rounded-full peer-checked:bg-cyan-500 bg-slate-700 transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:w-4 after:h-4 after:transition-all peer-checked:after:translate-x-5" />
      </label>
    </div>
  );
}

function SliderRow({ label, min, max, value, onChange, unit }: { label: string; min: number; max: number; value: number; onChange: (v: number) => void; unit: string }) {
  return (
    <div className="py-2 border-b border-white/5 last:border-0">
      <div className="flex justify-between mb-1.5">
        <span className="text-sm text-white">{label}</span>
        <span className="text-xs text-cyan-400 mono">{value}{unit}</span>
      </div>
      <input 
        type="range" 
        min={min} 
        max={max} 
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{ accentColor: '#06b6d4' }} />
    </div>
  );
}

export default function SettingsPage() {
  const settings = useSettingsStore();
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveToCloud = async () => {
    setIsSaving(true);
    await settings.saveToBackend();
    setTimeout(() => setIsSaving(false), 1000);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Settings size={28} className="text-slate-400" /> Settings
          </h1>
          <p className="text-slate-400 text-sm mt-1">Configure analysis parameters, model thresholds, and system preferences</p>
        </div>
        <button 
          onClick={handleSaveToCloud}
          disabled={isSaving}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            isSaving ? 'bg-slate-700 text-slate-400' : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/20'
          }`}
        >
          {isSaving ? (
            <>Saving...</>
          ) : (
            <>
              <Cloud size={16} /> Save to Cloud
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div>
          <Section title="Backend API" icon={Server}>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">API Base URL</label>
                <input 
                  type="text" 
                  value={settings.apiUrl}
                  onChange={(e) => settings.setSetting('apiUrl', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm bg-white/5 border border-white/10 text-white focus:outline-none focus:border-cyan-500/50 mono" />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Request Timeout (seconds)</label>
                <input 
                  type="number" 
                  value={settings.requestTimeout}
                  onChange={(e) => settings.setSetting('requestTimeout', parseInt(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg text-sm bg-white/5 border border-white/10 text-white focus:outline-none focus:border-cyan-500/50 mono" />
              </div>
              <button 
                className="w-full py-2 rounded-lg text-sm text-white font-medium hover:opacity-90 transition-opacity"
                style={{ background: 'linear-gradient(135deg, #06b6d4, #a855f7)' }}>
                Test Connection
              </button>
            </div>
          </Section>

          <Section title="Detection Thresholds" icon={Sliders}>
            <SliderRow 
              label="Deepfake Detection Threshold" 
              min={0} max={100} unit="%" 
              value={settings.deepfakeThreshold}
              onChange={(v) => settings.setSetting('deepfakeThreshold', v)}
            />
            <SliderRow 
              label="ELA Sensitivity" 
              min={1} max={20} unit="x" 
              value={settings.elaSensitivity}
              onChange={(v) => settings.setSetting('elaSensitivity', v)}
            />
            <SliderRow 
              label="Hash Similarity Threshold" 
              min={1} max={64} unit=" bits" 
              value={settings.hashThreshold}
              onChange={(v) => settings.setSetting('hashThreshold', v)}
            />
            <SliderRow 
              label="LSB Anomaly Threshold" 
              min={50} max={100} unit="%" 
              value={settings.lsbThreshold}
              onChange={(v) => settings.setSetting('lsbThreshold', v)}
            />
          </Section>
        </div>

        <div>
          <Section title="Analysis Options" icon={Brain}>
            <ToggleRow 
              label="Run ELA Analysis" 
              desc="Error Level Analysis for manipulation detection" 
              value={settings.runEla}
              onChange={(v) => settings.setSetting('runEla', v)}
            />
            <ToggleRow 
              label="LSB Steganography Scan" 
              desc="Scan least significant bits for hidden data" 
              value={settings.runLsb}
              onChange={(v) => settings.setSetting('runLsb', v)}
            />
            <ToggleRow 
              label="Build Provenance Graph" 
              desc="Auto-build lineage graph on analysis" 
              value={settings.buildGraph}
              onChange={(v) => settings.setSetting('buildGraph', v)}
            />
            <ToggleRow 
              label="Simulate Social Spread" 
              desc="Auto-run viral spread simulation" 
              value={settings.simulateSocial}
              onChange={(v) => settings.setSetting('simulateSocial', v)}
            />
            <ToggleRow 
              label="Double Compression Detection" 
              desc="JPEG ghost artifact detection" 
              value={settings.doubleCompression}
              onChange={(v) => settings.setSetting('doubleCompression', v)}
            />
          </Section>

          <Section title="About FakeLineage" icon={Info}>
            <div className="space-y-3 text-sm">
              {[
                { label: 'Version', value: '1.0.0' },
                { label: 'Model', value: 'FakeLineage-v1.0 Ensemble' },
                { label: 'Techniques', value: 'ELA, GAN-FFT, PRNU, LSB' },
                { label: 'Graph Engine', value: 'NetworkX + React Flow' },
                { label: 'Backend', value: 'FastAPI + Python 3.11' },
                { label: 'Frontend', value: 'React 18 + TypeScript + Tailwind' },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between py-1.5 border-b border-white/5 last:border-0">
                  <span className="text-slate-500">{label}</span>
                  <span className="text-slate-200 mono">{value}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 rounded-lg text-xs text-slate-400"
                 style={{ background: 'rgba(6,182,212,0.05)', border: '1px solid rgba(6,182,212,0.1)' }}>
              <strong className="text-cyan-400">Research Notice:</strong> FakeLineage is an experimental research tool
              for studying image provenance and deepfake forensics. Results should be validated by domain experts
              before use in legal or journalistic contexts.
            </div>
          </Section>
        </div>
      </div>
    </motion.div>
  );
}
