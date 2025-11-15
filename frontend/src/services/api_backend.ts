import axios from 'axios';
import { User, WorkoutPlan, WorkoutSession, ProgressSummary, FastingPreset, FastingSession, EatingWindow } from '../types';

// Use environment variable for API URL (defaults to production if not set)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://workout-marcs-projects-3a713b55.vercel.app/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // Default 30 second timeout
});

export const chatApi = {
  sendMessage: async (
    userId: number,
    message: string,
    chatHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
    sessionId?: string
  ) => {
    const response = await api.post('/chat', { userId, message, chatHistory, sessionId }, {
      timeout: 60000, // 60 second timeout for AI responses (can take longer)
    });
    return response.data;
  },
};

export const userApi = {
  getById: async (id: number) => {
    const response = await api.get<User>(`/users/${id}`);
    return response.data;
  },
  update: async (id: number, userData: Partial<User>) => {
    const response = await api.put<User>(`/users/${id}`, userData);
    return response.data;
  },
};

export const workoutPlanApi = {
  getUserPlans: async (userId: number) => {
    const response = await api.get<WorkoutPlan[]>(`/plans/user/${userId}`);
    return response.data;
  },
  getActivePlan: async (userId: number) => {
    const response = await api.get<WorkoutPlan>(`/plans/user/${userId}/active`);
    return response.data;
  },
  create: async (plan: WorkoutPlan) => {
    const response = await api.post<WorkoutPlan>('/plans', plan);
    return response.data;
  },
  activate: async (planId: number) => {
    const response = await api.put<WorkoutPlan>(`/plans/${planId}/activate`);
    return response.data;
  },
  updatePlan: async (planId: number, updates: Partial<WorkoutPlan>) => {
    const response = await api.put<WorkoutPlan>(`/plans/${planId}`, updates);
    return response.data;
  },
  updateExerciseWeight: async (planId: number, exerciseName: string, newWeight: string) => {
    const response = await api.post<WorkoutPlan>(`/plans/${planId}/update-exercise-weight`, {
      exerciseName,
      newWeight
    });
    return response.data;
  },
};

export const workoutSessionApi = {
  getUserSessions: async (userId: number) => {
    const response = await api.get<WorkoutSession[]>(`/sessions/user/${userId}`);
    return response.data;
  },
  create: async (session: WorkoutSession) => {
    const response = await api.post<WorkoutSession>('/sessions', session);
    return response.data;
  },
  delete: async (sessionId: number) => {
    const response = await api.delete(`/sessions/${sessionId}`);
    return response.data;
  },
  deleteByPlanAndDay: async (planId: number, day: number) => {
    const response = await api.delete(`/sessions/plan/${planId}/day/${day}`);
    return response.data;
  },
  getProgress: async (userId: number) => {
    const response = await api.get<ProgressSummary>(`/sessions/user/${userId}/progress`);
    return response.data;
  },
};

export const telegramConfigApi = {
  get: async (userId: number) => {
    const response = await api.get(`/telegram-config/user/${userId}`);
    return response.data;
  },
  save: async (userId: number, config: { botToken: string; chatId: string; dailyTasksStartHour?: number }) => {
    const response = await api.post(`/telegram-config/user/${userId}`, config);
    return response.data;
  },
};

// Request types for fasting endpoints
export interface CreateFastingPresetRequest {
  name: string;
  durationMinutes: number;
}

export interface UpdateFastingPresetRequest {
  name?: string;
  durationMinutes?: number;
}

export interface StartFastingSessionRequest {
  presetName: string;
  goalMinutes: number;
  eatingWindowMinutes: number;
}

export interface StopFastingSessionRequest {
  stoppedEarly: boolean;
}

export interface CreateEatingWindowRequest {
  startTime: string; // ISO string
  expectedDurationMinutes: number;
  nextFastDueTime: string; // ISO string
}

// Fasting API methods
export const fastingApi = {
  // Preset methods
  getUserPresets: async (userId: number): Promise<FastingPreset[]> => {
    const response = await api.get<FastingPreset[]>(`/fasting/presets/user/${userId}`);
    return response.data;
  },

  createPreset: async (userId: number, data: CreateFastingPresetRequest): Promise<FastingPreset> => {
    const response = await api.post<FastingPreset>(`/fasting/presets/user/${userId}`, data);
    return response.data;
  },

  updatePreset: async (id: string, data: UpdateFastingPresetRequest): Promise<FastingPreset> => {
    const response = await api.put<FastingPreset>(`/fasting/presets/${id}`, data);
    return response.data;
  },

  deletePreset: async (id: string): Promise<void> => {
    await api.delete(`/fasting/presets/${id}`);
  },

  // Session methods
  getUserSessions: async (userId: number): Promise<FastingSession[]> => {
    const response = await api.get<FastingSession[]>(`/fasting/sessions/user/${userId}`);
    return response.data;
  },

  getActiveSession: async (userId: number): Promise<FastingSession | null> => {
    const response = await api.get<FastingSession | null>(`/fasting/sessions/user/${userId}/active`);
    return response.data;
  },

  startSession: async (userId: number, data: StartFastingSessionRequest): Promise<FastingSession> => {
    const response = await api.post<FastingSession>(`/fasting/sessions/user/${userId}/start`, data);
    return response.data;
  },

  stopSession: async (id: string, data: StopFastingSessionRequest): Promise<FastingSession> => {
    const response = await api.post<FastingSession>(`/fasting/sessions/${id}/stop`, data);
    return response.data;
  },

  // Eating window methods
  getActiveEatingWindow: async (userId: number): Promise<EatingWindow | null> => {
    const response = await api.get<EatingWindow | null>(`/fasting/eating-windows/user/${userId}/active`);
    return response.data;
  },

  createEatingWindow: async (userId: number, data: CreateEatingWindowRequest): Promise<EatingWindow> => {
    const response = await api.post<EatingWindow>(`/fasting/eating-windows/user/${userId}`, data);
    return response.data;
  },

  closeEatingWindow: async (id: string): Promise<EatingWindow> => {
    const response = await api.post<EatingWindow>(`/fasting/eating-windows/${id}/close`);
    return response.data;
  },
};

export default api;
