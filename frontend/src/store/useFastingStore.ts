import { create } from 'zustand';
import { FastingPreset, FastingSession, FastingStats, NotificationSettings } from '../types/fasting';
import { fastingService } from '../services/fastingService';

interface FastingState {
  presets: FastingPreset[];
  selectedPresetId: string | null;
  activeSession: FastingSession | null;
  sessions: FastingSession[];
  stats: FastingStats | null;
  notificationSettings: NotificationSettings;

  // Actions
  loadPresets: () => void;
  selectPreset: (id: string) => void;
  addPreset: (name: string, durationMinutes: number) => void;
  updatePreset: (id: string, name: string, durationMinutes: number) => void;
  deletePreset: (id: string) => void;

  startFast: () => void;
  stopFast: () => FastingSession | null;
  loadActiveSession: () => void;

  loadStats: () => void;
  loadSessions: () => void;

  updateNotificationSettings: (settings: Partial<NotificationSettings>) => void;
}

const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: true,
  sendToTelegram: false,
  milestones: {
    twoHours: true,
    oneHour: true,
    thirtyMinutes: true,
    goalReached: true,
  },
  dailyReminderTime: null,
};

export const useFastingStore = create<FastingState>((set, get) => ({
  presets: [],
  selectedPresetId: null,
  activeSession: null,
  sessions: [],
  stats: null,
  notificationSettings: DEFAULT_NOTIFICATION_SETTINGS,

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
    set({ activeSession: session });
  },

  stopFast: () => {
    const session = fastingService.stopFast();
    set({ activeSession: null });
    get().loadSessions();
    get().loadStats();
    return session;
  },

  loadActiveSession: () => {
    const activeSession = fastingService.getActiveSession();
    set({ activeSession });
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
    set(state => ({
      notificationSettings: { ...state.notificationSettings, ...settings }
    }));
  },
}));
