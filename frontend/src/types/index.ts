/**
 * Bodyweight exercise the user has personally calibrated.
 *
 * `unit === 'reps'` for movements like Pull-ups, Push-ups, Squats — `max`
 * is the maximum number of clean reps the user can do in one set.
 *
 * `unit === 'seconds'` for static holds like Plank, Wall Sit, L-sit —
 * `max` is the maximum hold duration in seconds.
 *
 * The retroactive cap script and the regenerate-incomplete endpoint
 * both switch on `unit` to enforce ceilings correctly.
 *
 * Legacy `{ name, maxReps }` rows (from before Phase D) are migrated
 * on read by `normalizeBodyweightExercises()` in
 * `src/utils/bodyweight.ts`; never write that shape going forward.
 */
export interface BodyweightExercise {
  name: string;
  unit: 'reps' | 'seconds';
  max: number;
}

export interface User {
  id?: number;
  email: string;
  name: string;
  age?: number;
  gender?: string;
  weight?: number;
  height?: number;
  fitnessLevel?: string;
  availableEquipment?: string[];
  goals?: string[];
  bodyweightExercises?: BodyweightExercise[];
}

export interface WorkoutPlan {
  id?: number;
  userId: number;
  name: string;
  description: string;
  durationWeeks: number;
  daysPerWeek: number;
  planDetails: string;
  difficultyLevel: string;
  isActive: boolean;
  completedWorkouts?: number[]; // Array of completed day numbers (e.g., [1, 2, 3])
  color?: string; // Hex color code for this plan (e.g., '#667eea')
  isArchived?: boolean; // Whether plan is archived
  telegramPreviewHour?: number; // Hour (0-23) to send Telegram preview of next workout
  reminderTime?: string; // Time in HH:MM format for daily workout reminders (e.g., '09:00')
}

export interface WorkoutSession {
  id?: number;
  userId: number;
  workoutPlanId?: number;
  dayNumber?: number;
  sessionDate: string;
  durationMinutes?: number;
  exercises: string;
  completionRate?: number;
  difficultyRating?: number;
  notes?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ProgressSummary {
  totalSessions: number;
  averageCompletionRate: number;
  averageDifficultyRating: number;
  totalMinutesTrained: number;
  trend: string;
}

export * from './fasting';
