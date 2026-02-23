import { create } from 'zustand';
import type {
  ImageUploadResponse,
  AnalysisResult,
  ProvenanceGraph,
  SocialSpreadGraph,
  ForensicsReport,
} from '../types';

interface AppState {
  // Current analysis session
  currentImageId: string | null;
  uploadedImage: ImageUploadResponse | null;
  analysisResult: AnalysisResult | null;
  provenanceGraph: ProvenanceGraph | null;
  socialSpread: SocialSpreadGraph | null;
  report: ForensicsReport | null;

  // Loading states
  isUploading: boolean;
  isAnalyzing: boolean;
  isBuildingGraph: boolean;
  isLoadingSocial: boolean;
  isGeneratingReport: boolean;

  // Error
  error: string | null;

  // Upload queue (batch mode)
  uploadQueue: Array<{ file: File; status: 'queued' | 'uploading' | 'done' | 'error'; imageId?: string }>;

  // Setters
  setCurrentImageId: (id: string | null) => void;
  setUploadedImage: (img: ImageUploadResponse | null) => void;
  setAnalysisResult: (result: AnalysisResult | null) => void;
  setProvenanceGraph: (graph: ProvenanceGraph | null) => void;
  setSocialSpread: (spread: SocialSpreadGraph | null) => void;
  setReport: (report: ForensicsReport | null) => void;
  setIsUploading: (v: boolean) => void;
  setIsAnalyzing: (v: boolean) => void;
  setIsBuildingGraph: (v: boolean) => void;
  setIsLoadingSocial: (v: boolean) => void;
  setIsGeneratingReport: (v: boolean) => void;
  setError: (e: string | null) => void;
  addToQueue: (file: File) => void;
  updateQueueItem: (index: number, update: Partial<AppState['uploadQueue'][0]>) => void;
  clearQueue: () => void;
  resetSession: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentImageId: null,
  uploadedImage: null,
  analysisResult: null,
  provenanceGraph: null,
  socialSpread: null,
  report: null,
  isUploading: false,
  isAnalyzing: false,
  isBuildingGraph: false,
  isLoadingSocial: false,
  isGeneratingReport: false,
  error: null,
  uploadQueue: [],

  setCurrentImageId: (id) => set({ currentImageId: id }),
  setUploadedImage: (img) => set({ uploadedImage: img }),
  setAnalysisResult: (result) => set({ analysisResult: result }),
  setProvenanceGraph: (graph) => set({ provenanceGraph: graph }),
  setSocialSpread: (spread) => set({ socialSpread: spread }),
  setReport: (report) => set({ report }),
  setIsUploading: (v) => set({ isUploading: v }),
  setIsAnalyzing: (v) => set({ isAnalyzing: v }),
  setIsBuildingGraph: (v) => set({ isBuildingGraph: v }),
  setIsLoadingSocial: (v) => set({ isLoadingSocial: v }),
  setIsGeneratingReport: (v) => set({ isGeneratingReport: v }),
  setError: (e) => set({ error: e }),
  addToQueue: (file) =>
    set((s) => ({ uploadQueue: [...s.uploadQueue, { file, status: 'queued' }] })),
  updateQueueItem: (index, update) =>
    set((s) => ({
      uploadQueue: s.uploadQueue.map((item, i) => (i === index ? { ...item, ...update } : item)),
    })),
  clearQueue: () => set({ uploadQueue: [] }),
  resetSession: () =>
    set({
      currentImageId: null,
      uploadedImage: null,
      analysisResult: null,
      provenanceGraph: null,
      socialSpread: null,
      report: null,
      error: null,
    }),
}));
