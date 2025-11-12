import { FastingPreset, FastingSession, FastingStats, EatingWindow, TimerState } from '../types/fasting';
import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEYS = {
  PRESETS: 'fasting_presets',
  SESSIONS: 'fasting_sessions',
  EATING_WINDOWS: 'fasting_eating_windows',
  ACTIVE_SESSION: 'fasting_active_session',
  ACTIVE_EATING_WINDOW: 'fasting_active_eating_window',
  SELECTED_PRESET: 'fasting_selected_preset',
};

const DEFAULT_PRESETS: FastingPreset[] = [
  { id: uuidv4(), name: '12 Hours', durationMinutes: 720 },
  { id: uuidv4(), name: '16 Hours', durationMinutes: 960 },
  { id: uuidv4(), name: '18 Hours', durationMinutes: 1080 },
  { id: uuidv4(), name: '24 Hours', durationMinutes: 1440 },
];

const MINUTES_IN_DAY = 1440; // 24 hours

class FastingService {
  // Presets
  getPresets(): FastingPreset[] {
    const stored = localStorage.getItem(STORAGE_KEYS.PRESETS);
    if (!stored) {
      this.savePresets(DEFAULT_PRESETS);
      return DEFAULT_PRESETS;
    }
    return JSON.parse(stored);
  }

  savePresets(presets: FastingPreset[]): void {
    localStorage.setItem(STORAGE_KEYS.PRESETS, JSON.stringify(presets));
  }

  addPreset(name: string, durationMinutes: number): FastingPreset {
    const presets = this.getPresets();
    const newPreset: FastingPreset = {
      id: uuidv4(),
      name,
      durationMinutes,
    };
    presets.push(newPreset);
    this.savePresets(presets);
    return newPreset;
  }

  updatePreset(id: string, name: string, durationMinutes: number): void {
    const presets = this.getPresets();
    const index = presets.findIndex(p => p.id === id);
    if (index !== -1) {
      presets[index] = { ...presets[index], name, durationMinutes };
      this.savePresets(presets);
    }
  }

  deletePreset(id: string): void {
    const presets = this.getPresets();
    const filtered = presets.filter(p => p.id !== id);
    this.savePresets(filtered);
  }

  // Selected preset
  getSelectedPresetId(): string | null {
    return localStorage.getItem(STORAGE_KEYS.SELECTED_PRESET);
  }

  setSelectedPresetId(id: string): void {
    localStorage.setItem(STORAGE_KEYS.SELECTED_PRESET, id);
  }

  // Sessions
  getSessions(): FastingSession[] {
    const stored = localStorage.getItem(STORAGE_KEYS.SESSIONS);
    return stored ? JSON.parse(stored) : [];
  }

  saveSessions(sessions: FastingSession[]): void {
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
  }

  getActiveSession(): FastingSession | null {
    const stored = localStorage.getItem(STORAGE_KEYS.ACTIVE_SESSION);
    return stored ? JSON.parse(stored) : null;
  }

  // Eating Windows
  getEatingWindows(): EatingWindow[] {
    const stored = localStorage.getItem(STORAGE_KEYS.EATING_WINDOWS);
    return stored ? JSON.parse(stored) : [];
  }

  saveEatingWindows(windows: EatingWindow[]): void {
    localStorage.setItem(STORAGE_KEYS.EATING_WINDOWS, JSON.stringify(windows));
  }

  getActiveEatingWindow(): EatingWindow | null {
    const stored = localStorage.getItem(STORAGE_KEYS.ACTIVE_EATING_WINDOW);
    return stored ? JSON.parse(stored) : null;
  }

  startFast(presetId: string): FastingSession {
    const presets = this.getPresets();
    const preset = presets.find(p => p.id === presetId);
    if (!preset) throw new Error('Preset not found');

    // End active eating window if exists
    const activeEating = this.getActiveEatingWindow();
    if (activeEating) {
      activeEating.endTime = new Date().toISOString();
      const windows = this.getEatingWindows();
      windows.push(activeEating);
      this.saveEatingWindows(windows);
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_EATING_WINDOW);
    }

    const eatingWindowMinutes = MINUTES_IN_DAY - preset.durationMinutes;

    const session: FastingSession = {
      id: uuidv4(),
      startTime: new Date().toISOString(),
      endTime: null,
      goalMinutes: preset.durationMinutes,
      presetName: preset.name,
      stoppedEarly: false,
      eatingWindowMinutes,
    };

    localStorage.setItem(STORAGE_KEYS.ACTIVE_SESSION, JSON.stringify(session));
    return session;
  }

  stopFast(): FastingSession | null {
    const activeSession = this.getActiveSession();
    if (!activeSession) return null;

    const now = new Date();
    activeSession.endTime = now.toISOString();

    // Determine if stopped early
    const elapsedMinutes = this.getElapsedMinutes(activeSession);
    activeSession.stoppedEarly = elapsedMinutes < activeSession.goalMinutes;

    // Add to sessions history
    const sessions = this.getSessions();
    sessions.push(activeSession);
    this.saveSessions(sessions);

    // Clear active session
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_SESSION);

    // Start eating window
    const eatingWindowStart = new Date(now);
    const nextFastDue = new Date(now.getTime() + activeSession.eatingWindowMinutes * 60 * 1000);

    const eatingWindow: EatingWindow = {
      id: uuidv4(),
      startTime: eatingWindowStart.toISOString(),
      endTime: null,
      expectedDurationMinutes: activeSession.eatingWindowMinutes,
      nextFastDueTime: nextFastDue.toISOString(),
    };

    localStorage.setItem(STORAGE_KEYS.ACTIVE_EATING_WINDOW, JSON.stringify(eatingWindow));

    return activeSession;
  }

  // Get current timer state
  getCurrentState(): { state: TimerState; data: FastingSession | EatingWindow | null } {
    const activeSession = this.getActiveSession();
    if (activeSession) {
      return { state: 'fasting', data: activeSession };
    }

    const activeEating = this.getActiveEatingWindow();
    if (activeEating) {
      const now = Date.now();
      const dueTime = new Date(activeEating.nextFastDueTime).getTime();

      if (now >= dueTime) {
        return { state: 'overdue', data: activeEating };
      } else {
        return { state: 'eating', data: activeEating };
      }
    }

    return { state: 'eating', data: null }; // Default to ready to start
  }

  // Stats calculation
  calculateStats(): FastingStats {
    const sessions = this.getSessions();
    const completedSessions = sessions.filter(s => s.endTime !== null);

    // Success = met goal without stopping early
    const successfulSessions = completedSessions.filter(
      s => !s.stoppedEarly && this.getSessionDuration(s) >= s.goalMinutes
    );
    const failedSessions = completedSessions.filter(s => s.stoppedEarly);

    // Calculate current streak (consecutive days with successful fasts)
    let streak = 0;
    const sortedSessions = [...completedSessions].sort(
      (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const session of sortedSessions) {
      const sessionDate = new Date(session.startTime);
      sessionDate.setHours(0, 0, 0, 0);

      const daysDiff = Math.floor((today.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysDiff === streak) {
        if (!session.stoppedEarly && this.getSessionDuration(session) >= session.goalMinutes) {
          streak++;
        } else {
          break;
        }
      } else {
        break;
      }
    }

    // Calculate success rate (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentSessions = completedSessions.filter(
      s => new Date(s.startTime) >= thirtyDaysAgo
    );
    const recentSuccesses = recentSessions.filter(
      s => !s.stoppedEarly && this.getSessionDuration(s) >= s.goalMinutes
    );
    const successRate = recentSessions.length > 0
      ? (recentSuccesses.length / recentSessions.length) * 100
      : 0;

    // Calculate average duration
    const totalDuration = completedSessions.reduce(
      (sum, s) => sum + this.getSessionDuration(s),
      0
    );
    const averageDuration = completedSessions.length > 0
      ? totalDuration / completedSessions.length
      : 0;

    // Week data (last 7 days)
    const weekData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const daySession = completedSessions.find(s => {
        const sessionDate = new Date(s.startTime);
        sessionDate.setHours(0, 0, 0, 0);
        return sessionDate.getTime() === date.getTime();
      });

      if (daySession) {
        const duration = this.getSessionDuration(daySession);
        weekData.push({
          date: date.toISOString(),
          duration,
          goalMet: duration >= daySession.goalMinutes,
          stoppedEarly: daySession.stoppedEarly,
        });
      } else {
        weekData.push({
          date: date.toISOString(),
          duration: null,
          goalMet: false,
          stoppedEarly: false,
        });
      }
    }

    return {
      currentStreak: streak,
      totalFasts: completedSessions.length,
      successRate: Math.round(successRate),
      averageDuration: Math.round(averageDuration),
      totalSuccesses: successfulSessions.length,
      totalFailures: failedSessions.length,
      weekData,
    };
  }

  getSessionDuration(session: FastingSession): number {
    if (!session.endTime) return 0;
    const start = new Date(session.startTime).getTime();
    const end = new Date(session.endTime).getTime();
    return Math.floor((end - start) / (1000 * 60)); // minutes
  }

  getElapsedMinutes(session: FastingSession): number {
    const start = new Date(session.startTime).getTime();
    const now = Date.now();
    return Math.floor((now - start) / (1000 * 60));
  }

  getEatingWindowElapsed(window: EatingWindow): number {
    const start = new Date(window.startTime).getTime();
    const now = Date.now();
    return Math.floor((now - start) / (1000 * 60));
  }

  getEatingWindowRemaining(window: EatingWindow): number {
    const dueTime = new Date(window.nextFastDueTime).getTime();
    const now = Date.now();
    const remaining = Math.floor((dueTime - now) / (1000 * 60));
    return Math.max(0, remaining); // Don't return negative
  }

  getOverdueMinutes(window: EatingWindow): number {
    const dueTime = new Date(window.nextFastDueTime).getTime();
    const now = Date.now();
    const overdue = Math.floor((now - dueTime) / (1000 * 60));
    return Math.max(0, overdue); // Only positive when overdue
  }
}

export const fastingService = new FastingService();
