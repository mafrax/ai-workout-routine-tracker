export interface FastingPreset {
  id: string;
  name: string;
  durationMinutes: number;
}

export interface FastingSession {
  id: string;
  startTime: string; // ISO string
  endTime: string | null;
  goalMinutes: number;
  presetName: string;
  stoppedEarly: boolean; // true if stopped before reaching goal
  eatingWindowMinutes: number; // duration of eating window (24h - fast duration)
}

export interface EatingWindow {
  id: string;
  startTime: string; // ISO string (when fast ended)
  endTime: string | null; // when next fast started (or null if ongoing)
  expectedDurationMinutes: number; // 24h - previous fast goal
  nextFastDueTime: string; // ISO string - when next fast should start
}

export interface FastingStats {
  currentStreak: number;
  totalFasts: number;
  successRate: number; // percentage - goals met without stopping early
  averageDuration: number; // minutes
  totalSuccesses: number; // fasts that met goal
  totalFailures: number; // fasts stopped early
  weekData: {
    date: string;
    duration: number | null;
    goalMet: boolean;
    stoppedEarly: boolean;
  }[];
}

export interface NotificationSettings {
  enabled: boolean;
  sendToTelegram: boolean;
  fastingMilestones: {
    twoHours: boolean;
    oneHour: boolean;
    thirtyMinutes: boolean;
    goalReached: boolean;
  };
  eatingWindowReminders: {
    twoHours: boolean;
    oneHour: boolean;
    thirtyMinutes: boolean;
    timeToFast: boolean; // when eating window ends
  };
  dailyReminderTime: string | null;
}

export type TimerState = 'fasting' | 'eating' | 'overdue';
