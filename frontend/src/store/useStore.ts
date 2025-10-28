import { create } from 'zustand';
import { User, ChatMessage, ProgressSummary, WorkoutPlan } from '../types';

interface AppState {
  user: User | null;
  sessionId: string | null;
  chatHistory: ChatMessage[];
  progress: ProgressSummary | null;
  isLoading: boolean;
  activeWorkoutPlan: WorkoutPlan | null;

  setUser: (user: User | null) => void;
  setSessionId: (sessionId: string | null) => void;
  addChatMessage: (message: ChatMessage) => void;
  clearChatHistory: () => void;
  setProgress: (progress: ProgressSummary | null) => void;
  setLoading: (isLoading: boolean) => void;
  setActiveWorkoutPlan: (plan: WorkoutPlan | null) => void;
}

export const useStore = create<AppState>((set) => ({
  user: null,
  sessionId: null,
  chatHistory: [],
  progress: null,
  isLoading: false,
  activeWorkoutPlan: null,

  setUser: (user) => set({ user }),
  setSessionId: (sessionId) => set({ sessionId }),
  addChatMessage: (message) => set((state) => ({
    chatHistory: [...state.chatHistory, message]
  })),
  clearChatHistory: () => set({ chatHistory: [], sessionId: null }),
  setProgress: (progress) => set({ progress }),
  setLoading: (isLoading) => set({ isLoading }),
  setActiveWorkoutPlan: (plan) => set({ activeWorkoutPlan: plan }),
}));
