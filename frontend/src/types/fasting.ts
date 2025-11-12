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

export interface NotificationMilestone {
  type: 'eating_2h' | 'eating_1h' | 'eating_30min' | 'eating_end' | 'overdue_15min' | 'overdue_30min' | 'overdue_1h';
  minutesRemaining: number; // negative for overdue
  triggered: boolean;
  timestamp: string | null;
}

export interface NotificationState {
  eatingWindowId: string | null;
  milestones: NotificationMilestone[];
  lastChecked: string | null;
}

export interface NotificationSettings {
  enabled: boolean;
  localNotifications: boolean;
  telegramNotifications: boolean;
  eatingWindowReminders: {
    twoHours: boolean;
    oneHour: boolean;
    thirtyMinutes: boolean;
    windowEnding: boolean; // When eating window ends
  };
  overdueReminders: {
    fifteenMinutes: boolean;
    thirtyMinutes: boolean;
    oneHour: boolean;
  };
  fastingMilestones: {
    goalReached: boolean;
    twoHoursExtra: boolean; // Optional: notify when 2h past goal
  };
}

export type TimerState = 'fasting' | 'eating' | 'overdue';
