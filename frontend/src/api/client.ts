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

/* ---- Bearer token injection ---- */
api.interceptors.request.use((config) => {
  try {
    const raw = localStorage.getItem('fakelineage-auth');
    if (raw) {
      const parsed = JSON.parse(raw);
      const token: string | null = parsed?.state?.token ?? null;
      if (token) config.headers.Authorization = `Bearer ${token}`;
    }
  } catch { /* ignore */ }
  return config;
});

/* ---- Auto-logout on 401 ---- */
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      // Clear persisted auth and redirect to login
      localStorage.removeItem('fakelineage-auth');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

/* =========================================================
   Auth API functions
   ========================================================= */

export interface AuthPayload {
  access_token: string;
  token_type: string;
  user_id: number;
  username: string;
  email: string;
}

export interface RegisterBody {
  username: string;
  email: string;
  password: string;
}

export const register = async (body: RegisterBody): Promise<AuthPayload> => {
  const { data } = await api.post<AuthPayload>('/api/auth/register', body);
  return data;
};

export const login = async (email: string, password: string): Promise<AuthPayload> => {
  // OAuth2 form expects application/x-www-form-urlencoded with username field = email
  const params = new URLSearchParams();
  params.append('username', email);
  params.append('password', password);
  const { data } = await api.post<AuthPayload>('/api/auth/login', params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  return data;
};

export const getMe = async () => {
  const { data } = await api.get('/api/auth/me');
  return data;
};

/* =========================================================
   Existing API functions (unchanged)
   ========================================================= */

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

export const downloadReportPDF = async (imageId: string): Promise<Blob> => {
  const { data } = await api.get(`/api/reports/pdf/${imageId}`, {
    responseType: 'blob',
  });
  return data;
};

export const getDashboardStats = async (): Promise<DashboardStats> => {
  const { data } = await api.get<DashboardStats>('/api/reports/dashboard/stats');
  return data;
};

export default api;
