export interface DailyTaskDto {
  id: number;
  userId: number;
  title: string;
  completed: boolean;
  createdAt: string;
}

export interface CreateDailyTaskRequest {
  title: string;
}

export interface TelegramConfigDto {
  id: bigint;
  userId: bigint;
  botToken?: string;
  chatId?: string;
  dailyTasksStartHour: number;
  lastTaskReminderSent?: Date;
  createdAt: Date;
}

export interface WorkoutPlanDto {
  id: bigint;
  userId: bigint;
  name: string;
  planDetails?: string;
  isActive: boolean;
  isArchived: boolean;
  completedWorkouts: number[];
  telegramPreviewHour?: number;
  createdAt: Date;
}

export interface WorkoutSessionDto {
  id: bigint;
  userId: bigint;
  planId?: bigint;
  dayNumber?: number;
  sessionDate: string;
  durationMinutes?: number;
  completionRate?: number;
  notes?: string;
  createdAt: Date;
}

export interface MigrationRequest {
  userId: bigint;
  tasks: Array<{
    title: string;
    completed: boolean;
  }>;
  workoutPlans: Array<{
    name: string;
    planDetails: string;
    isActive: boolean;
    isArchived: boolean;
    completedWorkouts: number[];
    telegramPreviewHour?: number | null;
  }>;
  workoutSessions: Array<{
    planId?: bigint | null;
    dayNumber?: number | null;
    sessionDate: string;
    durationMinutes?: number | null;
    completionRate?: number | null;
    notes?: string | null;
  }>;
  telegramConfig?: {
    botToken?: string | null;
    chatId?: string | null;
    startHour?: number | null;
  };
  userProfile?: {
    name?: string | null;
    email?: string | null;
    age?: number | null;
    weight?: number | null;
    height?: number | null;
    fitnessLevel?: string | null;
    goals?: string[] | null;
    availableEquipment?: string[] | null;
    bodyweightExercises?: Array<{ name: string; maxReps: number }> | null;
  } | null;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface HealthResponse {
  status: string;
  timestamp: string;
  version: string;
  uptime: number;
}

export enum PressureLevel {
  GENTLE = 'gentle',
  MODERATE = 'moderate',
  URGENT = 'urgent',
  CRITICAL = 'critical'
}

export interface Workout {
  day: string;
  exercises: string[];
}