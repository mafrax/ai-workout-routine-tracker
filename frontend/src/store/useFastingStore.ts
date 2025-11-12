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

  // Actions
  loadPresets: () => void;
  selectPreset: (id: string) => void;
  addPreset: (name: string, durationMinutes: number) => void;
  updatePreset: (id: string, name: string, durationMinutes: number) => void;
  deletePreset: (id: string) => void;

  startFast: () => void;
  stopFast: () => FastingSession | null;
  loadActiveState: () => void;

  loadStats: () => void;
  loadSessions: () => void;

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

  loadPresets: () => {
    const presets = fastingService.getPresets();
    const selectedPresetId = fastingService.getSelectedPresetId() || presets[0]?.id || null;
    set({ presets, selectedPresetId });
  },

  selectPreset: (id: string) => {
    fastingService.setSelectedPresetId(id);
    set({ selectedPresetId: id });
  },

  addPreset: (name: string, durationMinutes: number) => {
    const newPreset = fastingService.addPreset(name, durationMinutes);
    const presets = fastingService.getPresets();
    set({ presets });
  },

  updatePreset: (id: string, name: string, durationMinutes: number) => {
    fastingService.updatePreset(id, name, durationMinutes);
    const presets = fastingService.getPresets();
    set({ presets });
  },

  deletePreset: (id: string) => {
    fastingService.deletePreset(id);
    const presets = fastingService.getPresets();
    set({ presets });
  },

  startFast: () => {
    const { selectedPresetId } = get();
    if (!selectedPresetId) return;

    const session = fastingService.startFast(selectedPresetId);
    set({ activeSession: session, activeEatingWindow: null, timerState: 'fasting' });
  },

  stopFast: () => {
    const session = fastingService.stopFast();
    const activeEatingWindow = fastingService.getActiveEatingWindow();
    set({ activeSession: null, activeEatingWindow, timerState: 'eating' });
    get().loadSessions();
    get().loadStats();
    return session;
  },

  loadActiveState: () => {
    const { state, data } = fastingService.getCurrentState();

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
  },

  loadStats: () => {
    const stats = fastingService.calculateStats();
    set({ stats });
  },

  loadSessions: () => {
    const sessions = fastingService.getSessions();
    set({ sessions });
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
