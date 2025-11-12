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
}

export interface FastingStats {
  currentStreak: number;
  totalFasts: number;
  successRate: number; // percentage
  averageDuration: number; // minutes
  weekData: {
    date: string;
    duration: number | null;
    goalMet: boolean;
  }[];
}

export interface NotificationSettings {
  enabled: boolean;
  sendToTelegram: boolean;
  milestones: {
    twoHours: boolean;
    oneHour: boolean;
    thirtyMinutes: boolean;
    goalReached: boolean;
  };
  dailyReminderTime: string | null;
}
