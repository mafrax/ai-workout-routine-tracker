import { create } from 'zustand';
import { User, ChatMessage, ProgressSummary } from '../types';

/**
 * Zustand store — keep this small.
 *
 * If the data has a backend source of truth, prefer a react-query hook:
 *   - user profile  -> useCurrentUser  (hooks/useUserQuery.ts)
 *   - active plan   -> useActivePlan   (hooks/useActivePlan.ts)
 *   - workout plans -> useWorkoutPlans (hooks/useWorkoutQueries.ts)
 *   - workout sessions -> useWorkoutSessions
 *
 * What lives here is genuinely client-only state: the OAuth identity slice
 * (auth_token decoded), the chat session id and history (mid-session
 * conversation), and the bootstrap auth-ready signal.
 */
interface AppState {
  /** Authenticated identity slice from the OAuth token. Full profile via useCurrentUser. */
  user: User | null;
  sessionId: string | null;
  chatHistory: ChatMessage[];
  /** Aggregated stats summary; written by Progress.tsx and read by header widgets. */
  progress: ProgressSummary | null;
  /** Generic "we're in the middle of something" flag for the chat UI. */
  isLoading: boolean;
  /** True once we've resolved whether a session exists (with or without a user). */
  authReady: boolean;

  setUser: (user: User | null) => void;
  setSessionId: (sessionId: string | null) => void;
  addChatMessage: (message: ChatMessage) => void;
  clearChatHistory: () => void;
  setProgress: (progress: ProgressSummary | null) => void;
  setLoading: (isLoading: boolean) => void;
  setAuthReady: (ready: boolean) => void;
}

export const useStore = create<AppState>((set) => ({
  user: null,
  sessionId: null,
  chatHistory: [],
  progress: null,
  isLoading: false,
  authReady: false,

  setUser: (user) => set({ user }),
  setSessionId: (sessionId) => set({ sessionId }),
  addChatMessage: (message) => set((state) => ({
    chatHistory: [...state.chatHistory, message]
  })),
  clearChatHistory: () => {
    set({ chatHistory: [], sessionId: null });
  },
  setProgress: (progress) => set({ progress }),
  setLoading: (isLoading) => set({ isLoading }),
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
