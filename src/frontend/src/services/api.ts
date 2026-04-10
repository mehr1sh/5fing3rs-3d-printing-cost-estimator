import axios from 'axios';
import type {
  User,
  TokenResponse,
  Job,
  SlicingParams,
  CostEstimate,
  Material,
} from './types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: async (username: string, password: string, email?: string): Promise<User> => {
    const response = await api.post('/api/auth/register', { username, password, email });
    return response.data;
  },
  login: async (username: string, password: string): Promise<TokenResponse> => {
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);
    const response = await api.post('/api/auth/login', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
  verifyOtp: async (username: string, code: string): Promise<TokenResponse> => {
    const response = await api.post('/api/auth/verify-otp', { username, code });
    return response.data;
  },
  getMe: async (): Promise<User> => {
    const response = await api.get('/api/auth/me');
    return response.data;
  },
};

// Upload API
export const uploadAPI = {
  upload: async (file: File): Promise<Job> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/api/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
  getJobs: async (): Promise<Job[]> => {
    const response = await api.get('/api/jobs');
    return response.data;
  },
  getJob: async (jobId: string): Promise<Job> => {
    const response = await api.get(`/api/job/${jobId}`);
    return response.data;
  },
  downloadModel: async (jobId: string): Promise<Blob> => {
    const response = await api.get(`/api/files/${jobId}/model.stl`, {
      responseType: 'blob',
    });
    return response.data;
  },
};

// Slicing API
export const slicingAPI = {
  slice: async (jobId: string, params: SlicingParams): Promise<{ message: string; job_id: string; status: string }> => {
    const response = await api.post(`/api/slice/${jobId}`, params);
    return response.data;
  },
  downloadGcode: async (jobId: string): Promise<Blob> => {
    const response = await api.get(`/api/files/${jobId}/output.gcode`, {
      responseType: 'blob',
    });
    return response.data;
  },
};

// Estimation API
export const estimationAPI = {
  estimate: async (jobId: string): Promise<CostEstimate> => {
    const response = await api.post(`/api/estimate/${jobId}`);
    return response.data;
  },
};

// Admin API
export const adminAPI = {
  getMaterials: async (): Promise<Material[]> => {
    const response = await api.get('/api/admin/materials');
    return response.data;
  },
  createMaterial: async (material: Omit<Material, 'id' | 'created_at'>): Promise<Material> => {
    const response = await api.post('/api/admin/materials', material);
    return response.data;
  },
  updateMaterial: async (id: number, material: Partial<Material>): Promise<Material> => {
    const response = await api.put(`/api/admin/materials/${id}`, material);
    return response.data;
  },
  deleteMaterial: async (id: number): Promise<void> => {
    await api.delete(`/api/admin/materials/${id}`);
  },
  getConfig: async (): Promise<Record<string, string>> => {
    const response = await api.get('/api/admin/config');
    return response.data.config;
  },
  updateConfig: async (key: string, value: string, description?: string): Promise<Record<string, string>> => {
    const response = await api.put('/api/admin/config', { key, value, description });
    return response.data.config;
  },
  getLogs: async (skip = 0, limit = 100): Promise<any[]> => {
    const response = await api.get('/api/admin/logs', { params: { skip, limit } });
    return response.data;
  },
};

export default api;
