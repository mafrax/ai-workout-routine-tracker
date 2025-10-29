import axios from 'axios';
import { User, WorkoutPlan, WorkoutSession, ProgressSummary } from '../types';

// Vercel backend deployment - PostgreSQL + Migration fix
const API_BASE_URL = 'https://workout-bqxxgza02-marcs-projects-3a713b55.vercel.app/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const chatApi = {
  sendMessage: async (userId: number, message: string, sessionId?: string) => {
    const response = await api.post('/chat', { userId, message, sessionId });
    return response.data;
  },
};

export const userApi = {
  getAll: async () => {
    const response = await api.get<User[]>('/users');
    return response.data;
  },
  getById: async (id: number) => {
    const response = await api.get<User>(`/users/${id}`);
    return response.data;
  },
  create: async (user: User) => {
    const response = await api.post<User>('/users', user);
    return response.data;
  },
  update: async (id: number, user: User) => {
    const response = await api.put<User>(`/users/${id}`, user);
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
  getProgress: async (userId: number) => {
    const response = await api.get<ProgressSummary>(`/sessions/user/${userId}/progress`);
    return response.data;
  },
};

export default api;
