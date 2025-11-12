import { create } from 'zustand';
import { FastingPreset, FastingSession, FastingStats, NotificationSettings, EatingWindow, TimerState } from '../types/fasting';
import { fastingService } from '../services/fastingService';
import { notificationService } from '../services/notificationService';
import { notificationScheduler } from '../services/notificationScheduler';

interface FastingState {
  presets: FastingPreset[];
  selectedPresetId: string | null;
  activeSession: FastingSession | null;
  activeEatingWindow: EatingWindow | null;
  sessions: FastingSession[];
  stats: FastingStats | null;
  notificationSettings: NotificationSettings;
  timerState: TimerState;
  isLoading: boolean;
  loadingItems: Set<string>; // Track what's loading: 'presets', 'sessions', 'stats', etc.

  // Actions
  setLoading: (item: string, loading: boolean) => void;
  loadPresets: () => Promise<void>;
  selectPreset: (id: string) => void;
  addPreset: (name: string, durationMinutes: number) => Promise<void>;
  updatePreset: (id: string, name: string, durationMinutes: number) => Promise<void>;
  deletePreset: (id: string) => Promise<void>;

  startFast: () => Promise<void>;
  stopFast: () => Promise<FastingSession | null>;
  loadActiveState: () => Promise<void>;

  loadStats: () => Promise<void>;
  loadSessions: () => Promise<void>;

  updateNotificationSettings: (settings: Partial<NotificationSettings>) => void;
  loadNotificationSettings: () => void;
  startNotificationScheduler: () => void;
  stopNotificationScheduler: () => void;
}

const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: false,
  localNotifications: true,
  telegramNotifications: false,
  eatingWindowReminders: {
    twoHours: true,
    oneHour: true,
    thirtyMinutes: true,
    windowEnding: true,
  },
  overdueReminders: {
    fifteenMinutes: true,
    thirtyMinutes: true,
    oneHour: true,
  },
  fastingMilestones: {
    goalReached: true,
    twoHoursExtra: false,
  },
};

export const useFastingStore = create<FastingState>((set, get) => ({
  presets: [],
  selectedPresetId: null,
  activeSession: null,
  activeEatingWindow: null,
  sessions: [],
  stats: null,
  notificationSettings: DEFAULT_NOTIFICATION_SETTINGS,
  timerState: 'eating',
  isLoading: false,
  loadingItems: new Set(),

  setLoading: (item: string, loading: boolean) => {
    const loadingItems = new Set(get().loadingItems);
    if (loading) {
      loadingItems.add(item);
    } else {
      loadingItems.delete(item);
    }
    set({ loadingItems, isLoading: loadingItems.size > 0 });
  },

  loadPresets: async () => {
    get().setLoading('presets', true);
    try {
      const presets = await fastingService.getPresets();
      const selectedPresetId = fastingService.getSelectedPresetId() || presets[0]?.id || null;
      set({ presets, selectedPresetId });
    } catch (error) {
      console.error('Failed to load presets:', error);
    } finally {
      get().setLoading('presets', false);
    }
  },

  selectPreset: (id: string) => {
    fastingService.setSelectedPresetId(id);
    set({ selectedPresetId: id });
  },

  addPreset: async (name: string, durationMinutes: number) => {
    const newPreset = await fastingService.addPreset(name, durationMinutes);
    const presets = await fastingService.getPresets();
    set({ presets });
  },

  updatePreset: async (id: string, name: string, durationMinutes: number) => {
    await fastingService.updatePreset(id, { name, durationMinutes });
    const presets = await fastingService.getPresets();
    set({ presets });
  },

  deletePreset: async (id: string) => {
    await fastingService.deletePreset(id);
    const presets = await fastingService.getPresets();
    set({ presets });
  },

  startFast: async () => {
    const { selectedPresetId } = get();
    if (!selectedPresetId) return;

    const session = await fastingService.startFast(selectedPresetId);
    set({ activeSession: session, activeEatingWindow: null, timerState: 'fasting' });
  },

  stopFast: async () => {
    const session = await fastingService.stopFast();
    const activeEatingWindow = await fastingService.getActiveEatingWindow();
    set({ activeSession: null, activeEatingWindow, timerState: 'eating' });
    await get().loadSessions();
    await get().loadStats();
    return session;
  },

  loadActiveState: async () => {
    get().setLoading('activeState', true);
    try {
      const { state, data } = await fastingService.getCurrentState();

      if (state === 'fasting') {
        set({
          activeSession: data as FastingSession,
          activeEatingWindow: null,
          timerState: 'fasting'
        });
      } else {
        set({
          activeSession: null,
          activeEatingWindow: data as EatingWindow | null,
          timerState: state
        });
      }
    } catch (error) {
      console.error('Failed to load active state:', error);
    } finally {
      get().setLoading('activeState', false);
    }
  },

  loadStats: async () => {
    get().setLoading('stats', true);
    try {
      const stats = await fastingService.calculateStats();
      set({ stats });
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      get().setLoading('stats', false);
    }
  },

  loadSessions: async () => {
    get().setLoading('sessions', true);
    try {
      const sessions = await fastingService.getSessions();
      set({ sessions });
    } catch (error) {
      console.error('Failed to load sessions:', error);
    } finally {
      get().setLoading('sessions', false);
    }
  },

  updateNotificationSettings: (settings: Partial<NotificationSettings>) => {
    const newSettings = { ...get().notificationSettings, ...settings };
    set({ notificationSettings: newSettings });

    // Update the notification service settings
    notificationService.updateSettings(newSettings);

    // Start/stop scheduler based on enabled state
    if (newSettings.enabled) {
      notificationScheduler.start();
    } else {
      notificationScheduler.stop();
    }
  },

  loadNotificationSettings: () => {
    const settings = notificationService.getSettings();
    set({ notificationSettings: settings });
  },

  startNotificationScheduler: () => {
    const { notificationSettings } = get();
    if (notificationSettings.enabled) {
      notificationScheduler.start();
    }
  },

  stopNotificationScheduler: () => {
    notificationScheduler.stop();
  },
}));
