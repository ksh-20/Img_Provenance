import axios from 'axios';
import type {
  ImageUploadResponse,
  AnalysisResult,
  ProvenanceGraph,
  SocialSpreadGraph,
  ForensicsReport,
  DashboardStats,
} from '../types';

const api = axios.create({
  baseURL: 'http://localhost:8000',
  timeout: 60000,
});

export const uploadImage = async (file: File): Promise<ImageUploadResponse> => {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await api.post<ImageUploadResponse>('/api/images/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};

export const analyzeImage = async (imageId: string): Promise<AnalysisResult> => {
  const { data } = await api.post<AnalysisResult>(`/api/images/analyze/${imageId}`);
  return data;
};

export const getElaMap = async (imageId: string): Promise<{ image_id: string; ela_map: number[][] }> => {
  const { data } = await api.get(`/api/images/ela/${imageId}`);
  return data;
};

export const getImageInfo = async (imageId: string) => {
  const { data } = await api.get(`/api/images/${imageId}`);
  return data;
};

export const listImages = async () => {
  const { data } = await api.get('/api/images/');
  return data;
};

export const getProvenanceGraph = async (imageId: string): Promise<ProvenanceGraph> => {
  const { data } = await api.get<ProvenanceGraph>(`/api/provenance/graph/${imageId}`);
  return data;
};

export const getIntegrityScore = async (imageId: string) => {
  const { data } = await api.get(`/api/provenance/integrity/${imageId}`);
  return data;
};

export const getSocialSpread = async (imageId: string): Promise<SocialSpreadGraph> => {
  const { data } = await api.get<SocialSpreadGraph>(`/api/social/spread/${imageId}`);
  return data;
};

export const getReport = async (imageId: string): Promise<ForensicsReport> => {
  const { data } = await api.get<ForensicsReport>(`/api/reports/${imageId}`);
  return data;
};

export const getDashboardStats = async (): Promise<DashboardStats> => {
  const { data } = await api.get<DashboardStats>('/api/reports/dashboard/stats');
  return data;
};

export default api;
