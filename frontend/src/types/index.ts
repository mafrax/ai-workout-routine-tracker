export interface BodyweightExercise {
  name: string;
  maxReps: number;
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
