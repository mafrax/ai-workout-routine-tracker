import { create } from 'zustand';
import { User, ChatMessage, ProgressSummary, WorkoutPlan } from '../types';
import { chatStorage } from '../services/localStorage';

interface AppState {
  user: User | null;
  sessionId: string | null;
  chatHistory: ChatMessage[];
  progress: ProgressSummary | null;
  isLoading: boolean;
  activeWorkoutPlan: WorkoutPlan | null;
  /** True once we've resolved whether a session exists (with or without a user). */
  authReady: boolean;

  setUser: (user: User | null) => void;
  setSessionId: (sessionId: string | null) => void;
  addChatMessage: (message: ChatMessage) => void;
  clearChatHistory: () => void;
  setProgress: (progress: ProgressSummary | null) => void;
  setLoading: (isLoading: boolean) => void;
  setActiveWorkoutPlan: (plan: WorkoutPlan | null) => void;
  setAuthReady: (ready: boolean) => void;
}

export const useStore = create<AppState>((set) => ({
  user: null,
  sessionId: null,
  chatHistory: [],
  progress: null,
  isLoading: false,
  activeWorkoutPlan: null,
  authReady: false,

  setUser: (user) => set({ user }),
  setSessionId: (sessionId) => set({ sessionId }),
  addChatMessage: (message) => set((state) => ({
    chatHistory: [...state.chatHistory, message]
  })),
  clearChatHistory: () => {
    chatStorage.clear();
    set({ chatHistory: [], sessionId: null });
  },
  setProgress: (progress) => set({ progress }),
  setLoading: (isLoading) => set({ isLoading }),
  setActiveWorkoutPlan: (plan) => set({ activeWorkoutPlan: plan }),
  setAuthReady: (ready) => set({ authReady: ready }),
}));

/**
 * Profile completeness check used as a gate before plan creation.
 * Equipment is intentionally NOT required here — adding equipment is its
 * own dedicated step in the plan-creation flow (manual / photo / skip).
 */
export function isProfileComplete(user: Partial<User> | null | undefined): boolean {
  if (!user) return false;
  const goalsOk = Array.isArray(user.goals) && user.goals.length > 0;
  return (
    typeof user.age === 'number' && user.age > 0 &&
    typeof user.weight === 'number' && user.weight > 0 &&
    typeof user.height === 'number' && user.height > 0 &&
    typeof user.fitnessLevel === 'string' && user.fitnessLevel.length > 0 &&
    goalsOk
  );
}

/** Fields the gate considers required, in the order they should be shown to the user. */
export const REQUIRED_PROFILE_FIELDS = ['age', 'weight', 'height', 'fitnessLevel', 'goals'] as const;
