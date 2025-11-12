import { FastingPreset, FastingSession, FastingStats, EatingWindow, TimerState } from '../types/fasting';
import { v4 as uuidv4 } from 'uuid';
import { fastingApi } from './api_backend';
import { authService } from './authService';

// Feature flag for backend migration
const USE_BACKEND = import.meta.env.VITE_USE_FASTING_BACKEND === 'true';

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
  // Helper to get current user ID
  private getUserId(): number | null {
    const user = authService.getCurrentUser();
    return user ? Number(user.id) : null;
  }

  // Helper to convert backend preset to frontend type
  private toFrontendPreset(backendPreset: any): FastingPreset {
    return {
      id: backendPreset.id,
      name: backendPreset.name,
      durationMinutes: backendPreset.durationMinutes,
    };
  }

  // Helper to convert backend session to frontend type
  private toFrontendSession(backendSession: any): FastingSession {
    return {
      id: backendSession.id,
      startTime: backendSession.startTime,
      endTime: backendSession.endTime,
      goalMinutes: backendSession.goalMinutes,
      presetName: backendSession.presetName,
      stoppedEarly: backendSession.stoppedEarly,
      eatingWindowMinutes: backendSession.eatingWindowMinutes,
    };
  }

  // Helper to convert backend eating window to frontend type
  private toFrontendEatingWindow(backendWindow: any): EatingWindow {
    return {
      id: backendWindow.id,
      startTime: backendWindow.startTime,
      endTime: backendWindow.endTime,
      expectedDurationMinutes: backendWindow.expectedDurationMinutes,
      nextFastDueTime: backendWindow.nextFastDueTime,
    };
  }

  // Presets
  async getPresets(): Promise<FastingPreset[]> {
    if (USE_BACKEND) {
      const userId = this.getUserId();
      if (!userId) {
        console.log('[FastingService] No user authenticated, using localStorage');
      } else {
        try {
          console.log('[FastingService] Fetching presets from backend');
          const backendPresets = await fastingApi.getUserPresets(userId);
          return backendPresets.map(p => this.toFrontendPreset(p));
        } catch (error) {
          console.error('[FastingService] Backend fetch failed, falling back to localStorage:', error);
        }
      }
    }

    // localStorage fallback
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

  async savePreset(preset: Omit<FastingPreset, 'id'> | FastingPreset): Promise<FastingPreset> {
    if (USE_BACKEND) {
      const userId = this.getUserId();
      if (userId) {
        try {
          console.log('[FastingService] Creating preset in backend');
          const backendPreset = await fastingApi.createPreset(
            userId,
            { name: preset.name, durationMinutes: preset.durationMinutes }
          );
          return this.toFrontendPreset(backendPreset);
        } catch (error) {
          console.error('[FastingService] Backend creation failed, falling back to localStorage:', error);
        }
      }
    }

    // localStorage fallback
    const presets = await this.getPresets();
    const newPreset: FastingPreset = {
      id: 'id' in preset ? preset.id : uuidv4(),
      name: preset.name,
      durationMinutes: preset.durationMinutes,
    };
    presets.push(newPreset);
    this.savePresets(presets);
    return newPreset;
  }

  // Legacy method for backward compatibility
  async addPreset(name: string, durationMinutes: number): Promise<FastingPreset> {
    return this.savePreset({ name, durationMinutes });
  }

  async updatePreset(id: string, updates: Partial<Omit<FastingPreset, 'id'>>): Promise<void> {
    if (USE_BACKEND) {
      const userId = this.getUserId();
      if (userId) {
        try {
          console.log('[FastingService] Updating preset in backend');
          await fastingApi.updatePreset(id, updates);
          return;
        } catch (error) {
          console.error('[FastingService] Backend update failed, falling back to localStorage:', error);
        }
      }
    }

    // localStorage fallback
    const presets = await this.getPresets();
    const index = presets.findIndex(p => p.id === id);
    if (index !== -1) {
      presets[index] = { ...presets[index], ...updates };
      this.savePresets(presets);
    }
  }

  async deletePreset(id: string): Promise<void> {
    if (USE_BACKEND) {
      const userId = this.getUserId();
      if (userId) {
        try {
          console.log('[FastingService] Deleting preset from backend');
          await fastingApi.deletePreset(id);
          return;
        } catch (error) {
          console.error('[FastingService] Backend delete failed, falling back to localStorage:', error);
        }
      }
    }

    // localStorage fallback
    const presets = await this.getPresets();
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
  async getSessions(): Promise<FastingSession[]> {
    if (USE_BACKEND) {
      const userId = this.getUserId();
      if (userId) {
        try {
          console.log('[FastingService] Fetching sessions from backend');
          const backendSessions = await fastingApi.getUserSessions(userId);
          return backendSessions.map(s => this.toFrontendSession(s));
        } catch (error) {
          console.error('[FastingService] Backend fetch failed, falling back to localStorage:', error);
        }
      }
    }

    // localStorage fallback
    const stored = localStorage.getItem(STORAGE_KEYS.SESSIONS);
    return stored ? JSON.parse(stored) : [];
  }

  saveSessions(sessions: FastingSession[]): void {
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
  }

  async saveSession(session: FastingSession): Promise<FastingSession> {
    if (USE_BACKEND) {
      const userId = this.getUserId();
      if (userId) {
        try {
          console.log('[FastingService] Saving session to backend');
          // Note: Backend doesn't have a direct save, sessions are managed through start/stop
          // This is for localStorage compatibility
          console.log('[FastingService] Session save via backend not implemented, using localStorage');
        } catch (error) {
          console.error('[FastingService] Backend save failed, falling back to localStorage:', error);
        }
      }
    }

    // localStorage fallback
    const sessions = await this.getSessions();
    sessions.push(session);
    this.saveSessions(sessions);
    return session;
  }

  async getActiveSession(): Promise<FastingSession | null> {
    if (USE_BACKEND) {
      const userId = this.getUserId();
      if (userId) {
        try {
          console.log('[FastingService] Fetching active session from backend');
          const backendSession = await fastingApi.getActiveSession(userId);
          return backendSession ? this.toFrontendSession(backendSession) : null;
        } catch (error) {
          console.error('[FastingService] Backend fetch failed, falling back to localStorage:', error);
        }
      }
    }

    // localStorage fallback
    const stored = localStorage.getItem(STORAGE_KEYS.ACTIVE_SESSION);
    return stored ? JSON.parse(stored) : null;
  }

  async stopActiveSession(): Promise<void> {
    if (USE_BACKEND) {
      const userId = this.getUserId();
      if (userId) {
        try {
          const activeSession = await this.getActiveSession();
          if (activeSession) {
            console.log('[FastingService] Stopping session in backend');
            const elapsedMinutes = this.getElapsedMinutes(activeSession);
            const stoppedEarly = elapsedMinutes < activeSession.goalMinutes;
            await fastingApi.stopSession(activeSession.id, { stoppedEarly });
            return;
          }
        } catch (error) {
          console.error('[FastingService] Backend stop failed, falling back to localStorage:', error);
        }
      }
    }

    // localStorage fallback - handled by stopFast method
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_SESSION);
  }

  // Eating Windows
  getEatingWindows(): EatingWindow[] {
    const stored = localStorage.getItem(STORAGE_KEYS.EATING_WINDOWS);
    return stored ? JSON.parse(stored) : [];
  }

  saveEatingWindows(windows: EatingWindow[]): void {
    localStorage.setItem(STORAGE_KEYS.EATING_WINDOWS, JSON.stringify(windows));
  }

  async getActiveEatingWindow(): Promise<EatingWindow | null> {
    if (USE_BACKEND) {
      const userId = this.getUserId();
      if (userId) {
        try {
          console.log('[FastingService] Fetching active eating window from backend');
          const backendWindow = await fastingApi.getActiveEatingWindow(userId);
          return backendWindow ? this.toFrontendEatingWindow(backendWindow) : null;
        } catch (error) {
          console.error('[FastingService] Backend fetch failed, falling back to localStorage:', error);
        }
      }
    }

    // localStorage fallback
    const stored = localStorage.getItem(STORAGE_KEYS.ACTIVE_EATING_WINDOW);
    return stored ? JSON.parse(stored) : null;
  }

  async saveEatingWindow(window: EatingWindow): Promise<EatingWindow> {
    if (USE_BACKEND) {
      const userId = this.getUserId();
      if (userId) {
        try {
          console.log('[FastingService] Creating eating window in backend');
          const backendWindow = await fastingApi.createEatingWindow(userId, {
            startTime: window.startTime,
            expectedDurationMinutes: window.expectedDurationMinutes,
            nextFastDueTime: window.nextFastDueTime,
          });
          return this.toFrontendEatingWindow(backendWindow);
        } catch (error) {
          console.error('[FastingService] Backend create failed, falling back to localStorage:', error);
        }
      }
    }

    // localStorage fallback
    localStorage.setItem(STORAGE_KEYS.ACTIVE_EATING_WINDOW, JSON.stringify(window));
    return window;
  }

  async clearActiveEatingWindow(): Promise<void> {
    if (USE_BACKEND) {
      const userId = this.getUserId();
      if (userId) {
        try {
          const activeWindow = await this.getActiveEatingWindow();
          if (activeWindow) {
            console.log('[FastingService] Closing eating window in backend');
            await fastingApi.closeEatingWindow(activeWindow.id);
            return;
          }
        } catch (error) {
          console.error('[FastingService] Backend close failed, falling back to localStorage:', error);
        }
      }
    }

    // localStorage fallback
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_EATING_WINDOW);
  }

  async startFast(presetId: string): Promise<FastingSession> {
    const presets = await this.getPresets();
    const preset = presets.find(p => p.id === presetId);
    if (!preset) throw new Error('Preset not found');

    // End active eating window if exists
    const activeEating = await this.getActiveEatingWindow();
    if (activeEating) {
      await this.clearActiveEatingWindow();
      activeEating.endTime = new Date().toISOString();
      const windows = this.getEatingWindows();
      windows.push(activeEating);
      this.saveEatingWindows(windows);
    }

    const eatingWindowMinutes = MINUTES_IN_DAY - preset.durationMinutes;

    if (USE_BACKEND) {
      const userId = this.getUserId();
      if (userId) {
        try {
          console.log('[FastingService] Starting fast in backend');
          const backendSession = await fastingApi.startSession(userId, {
            presetName: preset.name,
            goalMinutes: preset.durationMinutes,
            eatingWindowMinutes,
          });
          return this.toFrontendSession(backendSession);
        } catch (error) {
          console.error('[FastingService] Backend start failed, falling back to localStorage:', error);
        }
      }
    }

    // localStorage fallback
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

  async stopFast(): Promise<FastingSession | null> {
    const activeSession = await this.getActiveSession();
    if (!activeSession) return null;

    const now = new Date();
    const elapsedMinutes = this.getElapsedMinutes(activeSession);
    const stoppedEarly = elapsedMinutes < activeSession.goalMinutes;

    if (USE_BACKEND) {
      const userId = this.getUserId();
      if (userId) {
        try {
          console.log('[FastingService] Stopping fast in backend');
          const stoppedSession = await fastingApi.stopSession(activeSession.id, { stoppedEarly });

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

          await this.saveEatingWindow(eatingWindow);
          return this.toFrontendSession(stoppedSession);
        } catch (error) {
          console.error('[FastingService] Backend stop failed, falling back to localStorage:', error);
        }
      }
    }

    // localStorage fallback
    activeSession.endTime = now.toISOString();
    activeSession.stoppedEarly = stoppedEarly;

    // Add to sessions history
    const sessions = await this.getSessions();
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
  async getCurrentState(): Promise<{ state: TimerState; data: FastingSession | EatingWindow | null }> {
    const activeSession = await this.getActiveSession();
    if (activeSession) {
      return { state: 'fasting', data: activeSession };
    }

    const activeEating = await this.getActiveEatingWindow();
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
  async calculateStats(): Promise<FastingStats> {
    const sessions = await this.getSessions();
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
