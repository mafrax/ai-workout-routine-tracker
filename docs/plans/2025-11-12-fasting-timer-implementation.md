# Fasting Timer Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an intermittent fasting timer with customizable presets, live tracking, history/stats, and Telegram notifications.

**Architecture:** Frontend-first with localStorage persistence. Timer button at center, preset chips at top, quick stats at bottom. Timer persists via stored start timestamp (calculates elapsed time on resume). Later migration path to backend API.

**Tech Stack:** React + Ionic, Zustand state management, localStorage, Capacitor Local Notifications, existing Telegram service integration

---

## Task 1: Create Data Types and Models

**Files:**
- Create: `frontend/src/types/fasting.ts`

**Step 1: Create TypeScript interfaces for fasting data**

Create `frontend/src/types/fasting.ts`:

```typescript
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
```

**Step 2: Export from main types index**

Add to `frontend/src/types/index.ts`:

```typescript
export * from './fasting';
```

**Step 3: Commit**

```bash
git add frontend/src/types/fasting.ts frontend/src/types/index.ts
git commit -m "feat(fasting): add TypeScript types for fasting feature"
```

---

## Task 2: Create Fasting Service (localStorage)

**Files:**
- Create: `frontend/src/services/fastingService.ts`

**Step 1: Create fasting service with localStorage operations**

Create `frontend/src/services/fastingService.ts`:

```typescript
import { FastingPreset, FastingSession, FastingStats } from '../types/fasting';
import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEYS = {
  PRESETS: 'fasting_presets',
  SESSIONS: 'fasting_sessions',
  ACTIVE_SESSION: 'fasting_active_session',
  SELECTED_PRESET: 'fasting_selected_preset',
};

const DEFAULT_PRESETS: FastingPreset[] = [
  { id: uuidv4(), name: '12 Hours', durationMinutes: 720 },
  { id: uuidv4(), name: '16 Hours', durationMinutes: 960 },
  { id: uuidv4(), name: '18 Hours', durationMinutes: 1080 },
  { id: uuidv4(), name: '24 Hours', durationMinutes: 1440 },
];

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

  startFast(presetId: string): FastingSession {
    const presets = this.getPresets();
    const preset = presets.find(p => p.id === presetId);
    if (!preset) throw new Error('Preset not found');

    const session: FastingSession = {
      id: uuidv4(),
      startTime: new Date().toISOString(),
      endTime: null,
      goalMinutes: preset.durationMinutes,
      presetName: preset.name,
    };

    localStorage.setItem(STORAGE_KEYS.ACTIVE_SESSION, JSON.stringify(session));
    return session;
  }

  stopFast(): FastingSession | null {
    const activeSession = this.getActiveSession();
    if (!activeSession) return null;

    activeSession.endTime = new Date().toISOString();

    // Add to sessions history
    const sessions = this.getSessions();
    sessions.push(activeSession);
    this.saveSessions(sessions);

    // Clear active session
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_SESSION);

    return activeSession;
  }

  // Stats calculation
  calculateStats(): FastingStats {
    const sessions = this.getSessions();
    const completedSessions = sessions.filter(s => s.endTime !== null);

    // Calculate current streak
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
        const duration = this.getSessionDuration(session);
        if (duration >= session.goalMinutes) {
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
    const successfulSessions = recentSessions.filter(
      s => this.getSessionDuration(s) >= s.goalMinutes
    );
    const successRate = recentSessions.length > 0
      ? (successfulSessions.length / recentSessions.length) * 100
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
        });
      } else {
        weekData.push({
          date: date.toISOString(),
          duration: null,
          goalMet: false,
        });
      }
    }

    return {
      currentStreak: streak,
      totalFasts: completedSessions.length,
      successRate: Math.round(successRate),
      averageDuration: Math.round(averageDuration),
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
}

export const fastingService = new FastingService();
```

**Step 2: Install uuid dependency**

```bash
cd frontend && npm install uuid @types/uuid
```

**Step 3: Commit**

```bash
git add frontend/src/services/fastingService.ts frontend/package.json frontend/package-lock.json
git commit -m "feat(fasting): add fasting service with localStorage persistence"
```

---

## Task 3: Create Fasting Store

**Files:**
- Create: `frontend/src/store/useFastingStore.ts`

**Step 1: Create Zustand store for fasting state**

Create `frontend/src/store/useFastingStore.ts`:

```typescript
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
```

**Step 2: Commit**

```bash
git add frontend/src/store/useFastingStore.ts
git commit -m "feat(fasting): add Zustand store for fasting state management"
```

---

## Task 4: Create Timer Button Component

**Files:**
- Create: `frontend/src/components/Fasting/TimerButton.tsx`
- Create: `frontend/src/components/Fasting/TimerButton.css`

**Step 1: Create timer button component**

Create `frontend/src/components/Fasting/TimerButton.tsx`:

```typescript
import React, { useState, useEffect } from 'react';
import { IonButton } from '@ionic/react';
import { useFastingStore } from '../../store/useFastingStore';
import { fastingService } from '../../services/fastingService';
import './TimerButton.css';

interface TimerButtonProps {
  onStop: () => void;
}

const TimerButton: React.FC<TimerButtonProps> = ({ onStop }) => {
  const { activeSession, selectedPresetId, presets, startFast } = useFastingStore();
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!activeSession) {
      setElapsedSeconds(0);
      return;
    }

    // Calculate initial elapsed time
    const updateElapsed = () => {
      const elapsed = fastingService.getElapsedMinutes(activeSession) * 60;
      setElapsedSeconds(elapsed);
    };

    updateElapsed();

    // Update every second
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [activeSession]);

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const selectedPreset = presets.find(p => p.id === selectedPresetId);
  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  const progressPercent = activeSession
    ? Math.min((elapsedMinutes / activeSession.goalMinutes) * 100, 100)
    : 0;
  const goalMet = activeSession && elapsedMinutes >= activeSession.goalMinutes;

  if (activeSession) {
    return (
      <div className="timer-button-container">
        <button className="timer-button timer-button-active" onClick={onStop}>
          <div className="timer-display">
            <div className="timer-time">{formatTime(elapsedSeconds)}</div>
            <div className="timer-progress">
              {formatDuration(elapsedMinutes)} / {formatDuration(activeSession.goalMinutes)}
            </div>
            <div className="timer-percentage">{Math.round(progressPercent)}%</div>
            {goalMet && <div className="timer-badge">Goal met ✓</div>}
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className="timer-button-container">
      <button
        className="timer-button timer-button-inactive"
        onClick={() => startFast()}
        disabled={!selectedPresetId}
      >
        <div className="timer-display">
          <div className="timer-start-text">START FAST</div>
          {selectedPreset && (
            <div className="timer-goal">Goal: {formatDuration(selectedPreset.durationMinutes)}</div>
          )}
        </div>
      </button>
    </div>
  );
};

export default TimerButton;
```

**Step 2: Create timer button styles**

Create `frontend/src/components/Fasting/TimerButton.css`:

```css
.timer-button-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 2rem 1rem;
}

.timer-button {
  width: min(300px, 70vw);
  height: min(300px, 70vw);
  border-radius: 50%;
  border: none;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.timer-button:active {
  transform: scale(0.95);
}

.timer-button-inactive {
  background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
  box-shadow: 0 8px 24px rgba(34, 197, 94, 0.4);
}

.timer-button-active {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  box-shadow: 0 8px 24px rgba(239, 68, 68, 0.4);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% {
    box-shadow: 0 8px 24px rgba(239, 68, 68, 0.4);
  }
  50% {
    box-shadow: 0 8px 32px rgba(239, 68, 68, 0.6);
  }
}

.timer-display {
  text-align: center;
  color: white;
}

.timer-time {
  font-size: 3rem;
  font-weight: bold;
  margin-bottom: 0.5rem;
}

.timer-progress {
  font-size: 1rem;
  opacity: 0.9;
  margin-bottom: 0.25rem;
}

.timer-percentage {
  font-size: 1.25rem;
  font-weight: 600;
}

.timer-start-text {
  font-size: 2rem;
  font-weight: bold;
  margin-bottom: 0.5rem;
}

.timer-goal {
  font-size: 1.125rem;
  opacity: 0.9;
}

.timer-badge {
  margin-top: 0.5rem;
  padding: 0.25rem 0.75rem;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 1rem;
  font-size: 0.875rem;
  font-weight: 600;
  display: inline-block;
}
```

**Step 3: Commit**

```bash
git add frontend/src/components/Fasting/
git commit -m "feat(fasting): add timer button component with live countdown"
```

---

## Task 5: Create Preset Selector Component

**Files:**
- Create: `frontend/src/components/Fasting/PresetSelector.tsx`
- Create: `frontend/src/components/Fasting/PresetSelector.css`

**Step 1: Create preset selector component**

Create `frontend/src/components/Fasting/PresetSelector.tsx`:

```typescript
import React from 'react';
import { IonChip, IonIcon, IonButton } from '@ionic/react';
import { add } from 'ionicons/icons';
import { useFastingStore } from '../../store/useFastingStore';
import './PresetSelector.css';

interface PresetSelectorProps {
  onAddPreset: () => void;
  disabled?: boolean;
}

const PresetSelector: React.FC<PresetSelectorProps> = ({ onAddPreset, disabled = false }) => {
  const { presets, selectedPresetId, selectPreset } = useFastingStore();

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  return (
    <div className="preset-selector">
      <div className="preset-chips">
        {presets.map(preset => (
          <IonChip
            key={preset.id}
            color={selectedPresetId === preset.id ? 'primary' : 'medium'}
            onClick={() => !disabled && selectPreset(preset.id)}
            disabled={disabled}
            className="preset-chip"
          >
            {preset.name} ({formatDuration(preset.durationMinutes)})
          </IonChip>
        ))}
        <IonButton
          fill="outline"
          size="small"
          onClick={onAddPreset}
          disabled={disabled}
          className="add-preset-button"
        >
          <IonIcon icon={add} slot="start" />
          Add Preset
        </IonButton>
      </div>
    </div>
  );
};

export default PresetSelector;
```

**Step 2: Create preset selector styles**

Create `frontend/src/components/Fasting/PresetSelector.css`:

```css
.preset-selector {
  padding: 1rem;
  overflow-x: auto;
}

.preset-chips {
  display: flex;
  gap: 0.5rem;
  flex-wrap: nowrap;
  padding-bottom: 0.5rem;
}

.preset-chip {
  flex-shrink: 0;
  cursor: pointer;
  transition: transform 0.2s;
}

.preset-chip:active {
  transform: scale(0.95);
}

.add-preset-button {
  flex-shrink: 0;
}
```

**Step 3: Commit**

```bash
git add frontend/src/components/Fasting/PresetSelector.tsx frontend/src/components/Fasting/PresetSelector.css
git commit -m "feat(fasting): add preset selector with horizontal scroll"
```

---

## Task 6: Create Stop Fast Modal Component

**Files:**
- Create: `frontend/src/components/Fasting/StopFastModal.tsx`

**Step 1: Create stop fast confirmation modal**

Create `frontend/src/components/Fasting/StopFastModal.tsx`:

```typescript
import React from 'react';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonButtons,
  IonIcon,
  IonCard,
  IonCardContent,
} from '@ionic/react';
import { close } from 'ionicons/icons';
import { FastingSession } from '../../types/fasting';
import { fastingService } from '../../services/fastingService';

interface StopFastModalProps {
  isOpen: boolean;
  activeSession: FastingSession | null;
  onConfirm: () => void;
  onCancel: () => void;
}

const StopFastModal: React.FC<StopFastModalProps> = ({
  isOpen,
  activeSession,
  onConfirm,
  onCancel,
}) => {
  if (!activeSession) return null;

  const elapsedMinutes = fastingService.getElapsedMinutes(activeSession);
  const goalMet = elapsedMinutes >= activeSession.goalMinutes;

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onCancel}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>End Your Fast?</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onCancel}>
              <IonIcon icon={close} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <IonCard color={goalMet ? 'success' : 'warning'}>
          <IonCardContent>
            <h2 style={{ margin: '0 0 1rem 0' }}>
              {goalMet ? '✓ Goal Met!' : 'Goal Not Met'}
            </h2>
            <div style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>
              <strong>Duration:</strong> {formatDuration(elapsedMinutes)}
            </div>
            <div style={{ fontSize: '1.125rem' }}>
              <strong>Goal:</strong> {formatDuration(activeSession.goalMinutes)}
            </div>
          </IonCardContent>
        </IonCard>

        <p style={{ textAlign: 'center', margin: '1.5rem 0', fontSize: '1rem' }}>
          {goalMet
            ? 'Congratulations! You reached your fasting goal.'
            : 'You can still continue fasting or end now.'}
        </p>

        <IonButton
          expand="block"
          color="danger"
          onClick={onConfirm}
          style={{ marginBottom: '1rem' }}
        >
          End Fast
        </IonButton>
        <IonButton expand="block" fill="outline" onClick={onCancel}>
          Continue Fasting
        </IonButton>
      </IonContent>
    </IonModal>
  );
};

export default StopFastModal;
```

**Step 2: Commit**

```bash
git add frontend/src/components/Fasting/StopFastModal.tsx
git commit -m "feat(fasting): add stop fast confirmation modal"
```

---

## Task 7: Create Quick Stats Component

**Files:**
- Create: `frontend/src/components/Fasting/QuickStats.tsx`
- Create: `frontend/src/components/Fasting/QuickStats.css`

**Step 1: Create quick stats component**

Create `frontend/src/components/Fasting/QuickStats.tsx`:

```typescript
import React from 'react';
import { IonCard, IonCardContent } from '@ionic/react';
import { FastingStats } from '../../types/fasting';
import './QuickStats.css';

interface QuickStatsProps {
  stats: FastingStats | null;
}

const QuickStats: React.FC<QuickStatsProps> = ({ stats }) => {
  if (!stats) return null;

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const lastFast = stats.weekData
    .filter(d => d.duration !== null)
    .pop();

  return (
    <div className="quick-stats">
      <div className="stat-card">
        <div className="stat-value">{stats.currentStreak}</div>
        <div className="stat-label">Day Streak</div>
      </div>
      <div className="stat-card">
        <div className="stat-value">
          {lastFast ? formatDuration(lastFast.duration!) : 'N/A'}
        </div>
        <div className="stat-label">Last Fast</div>
      </div>
      <div className="stat-card">
        <div className="stat-value">{stats.successRate}%</div>
        <div className="stat-label">This Week</div>
      </div>
    </div>
  );
};

export default QuickStats;
```

**Step 2: Create quick stats styles**

Create `frontend/src/components/Fasting/QuickStats.css`:

```css
.quick-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
  padding: 1rem;
}

.stat-card {
  background: var(--ion-color-light);
  border-radius: 12px;
  padding: 1rem 0.5rem;
  text-align: center;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: bold;
  color: var(--ion-color-primary);
  margin-bottom: 0.25rem;
}

.stat-label {
  font-size: 0.75rem;
  color: var(--ion-color-medium);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
```

**Step 3: Commit**

```bash
git add frontend/src/components/Fasting/QuickStats.tsx frontend/src/components/Fasting/QuickStats.css
git commit -m "feat(fasting): add quick stats component"
```

---

## Task 8: Create Preset Modal Component

**Files:**
- Create: `frontend/src/components/Fasting/PresetModal.tsx`

**Step 1: Create preset add/edit modal**

Create `frontend/src/components/Fasting/PresetModal.tsx`:

```typescript
import React, { useState, useEffect } from 'react';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonButtons,
  IonIcon,
  IonItem,
  IonLabel,
  IonInput,
} from '@ionic/react';
import { close } from 'ionicons/icons';
import { useFastingStore } from '../../store/useFastingStore';

interface PresetModalProps {
  isOpen: boolean;
  presetId?: string | null;
  onClose: () => void;
}

const PresetModal: React.FC<PresetModalProps> = ({ isOpen, presetId, onClose }) => {
  const { presets, addPreset, updatePreset } = useFastingStore();
  const [name, setName] = useState('');
  const [hours, setHours] = useState(16);
  const [minutes, setMinutes] = useState(0);

  const isEditing = !!presetId;
  const preset = presets.find(p => p.id === presetId);

  useEffect(() => {
    if (preset) {
      setName(preset.name);
      setHours(Math.floor(preset.durationMinutes / 60));
      setMinutes(preset.durationMinutes % 60);
    } else {
      setName('');
      setHours(16);
      setMinutes(0);
    }
  }, [preset, isOpen]);

  const handleSave = () => {
    const durationMinutes = hours * 60 + minutes;

    if (isEditing && presetId) {
      updatePreset(presetId, name, durationMinutes);
    } else {
      addPreset(name, durationMinutes);
    }

    onClose();
  };

  const isValid = name.trim().length > 0 && (hours > 0 || minutes > 0);

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{isEditing ? 'Edit Preset' : 'Add Preset'}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onClose}>
              <IonIcon icon={close} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <IonItem>
          <IonLabel position="stacked">Preset Name</IonLabel>
          <IonInput
            value={name}
            placeholder="e.g., Weekday Fast"
            onIonInput={(e) => setName(e.detail.value || '')}
          />
        </IonItem>

        <IonItem style={{ marginTop: '1rem' }}>
          <IonLabel position="stacked">Hours</IonLabel>
          <IonInput
            type="number"
            value={hours}
            min={0}
            max={48}
            onIonInput={(e) => setHours(parseInt(e.detail.value || '0'))}
          />
        </IonItem>

        <IonItem>
          <IonLabel position="stacked">Minutes</IonLabel>
          <IonInput
            type="number"
            value={minutes}
            min={0}
            max={59}
            onIonInput={(e) => setMinutes(parseInt(e.detail.value || '0'))}
          />
        </IonItem>

        <IonButton
          expand="block"
          onClick={handleSave}
          disabled={!isValid}
          style={{ marginTop: '2rem' }}
        >
          {isEditing ? 'Update Preset' : 'Add Preset'}
        </IonButton>
      </IonContent>
    </IonModal>
  );
};

export default PresetModal;
```

**Step 2: Commit**

```bash
git add frontend/src/components/Fasting/PresetModal.tsx
git commit -m "feat(fasting): add preset creation and editing modal"
```

---

## Task 9: Create Main Fasting Page

**Files:**
- Create: `frontend/src/pages/Fasting.tsx`
- Create: `frontend/src/pages/Fasting.css`

**Step 1: Create fasting page**

Create `frontend/src/pages/Fasting.tsx`:

```typescript
import React, { useEffect, useState } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonRefresher,
  IonRefresherContent,
} from '@ionic/react';
import { useFastingStore } from '../store/useFastingStore';
import TimerButton from '../components/Fasting/TimerButton';
import PresetSelector from '../components/Fasting/PresetSelector';
import StopFastModal from '../components/Fasting/StopFastModal';
import QuickStats from '../components/Fasting/QuickStats';
import PresetModal from '../components/Fasting/PresetModal';
import './Fasting.css';

const Fasting: React.FC = () => {
  const {
    loadPresets,
    loadActiveSession,
    loadStats,
    activeSession,
    stats,
    stopFast,
  } = useFastingStore();

  const [showStopModal, setShowStopModal] = useState(false);
  const [showPresetModal, setShowPresetModal] = useState(false);

  useEffect(() => {
    loadPresets();
    loadActiveSession();
    loadStats();
  }, []);

  const handleStopClick = () => {
    setShowStopModal(true);
  };

  const handleStopConfirm = () => {
    stopFast();
    setShowStopModal(false);
  };

  const handleRefresh = (event: CustomEvent) => {
    loadStats();
    event.detail.complete();
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Fasting</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent />
        </IonRefresher>

        <div className="fasting-container">
          <PresetSelector
            onAddPreset={() => setShowPresetModal(true)}
            disabled={!!activeSession}
          />

          <TimerButton onStop={handleStopClick} />

          <QuickStats stats={stats} />
        </div>

        <StopFastModal
          isOpen={showStopModal}
          activeSession={activeSession}
          onConfirm={handleStopConfirm}
          onCancel={() => setShowStopModal(false)}
        />

        <PresetModal
          isOpen={showPresetModal}
          onClose={() => setShowPresetModal(false)}
        />
      </IonContent>
    </IonPage>
  );
};

export default Fasting;
```

**Step 2: Create fasting page styles**

Create `frontend/src/pages/Fasting.css`:

```css
.fasting-container {
  display: flex;
  flex-direction: column;
  min-height: 100%;
}
```

**Step 3: Commit**

```bash
git add frontend/src/pages/Fasting.tsx frontend/src/pages/Fasting.css
git commit -m "feat(fasting): add main fasting page with timer and presets"
```

---

## Task 10: Add Fasting Tab to App Navigation

**Files:**
- Modify: `frontend/src/App.tsx`

**Step 1: Import fasting page and timer icon**

Add to imports in `frontend/src/App.tsx`:

```typescript
import { timer } from 'ionicons/icons';
import Fasting from './pages/Fasting';
```

**Step 2: Add fasting route**

Add route after Tasks route:

```typescript
<PrivateRoute exact path="/fasting" component={Fasting} />
```

**Step 3: Add fasting tab button**

Add tab button between Tasks and Progress:

```typescript
<IonTabButton tab="fasting" href="/fasting">
  <IonIcon icon={timer} />
  <IonLabel>Fasting</IonLabel>
</IonTabButton>
```

**Step 4: Verify changes and commit**

Run: Check that imports, route, and tab button are added correctly

Expected: App compiles without errors

```bash
git add frontend/src/App.tsx
git commit -m "feat(fasting): add fasting tab to app navigation"
```

---

## Task 11: Visual Testing and Polish

**Files:**
- Test with Playwright

**Step 1: Start development server**

Run: `cd frontend && npm run dev`

**Step 2: Navigate to fasting page**

Use `mcp__playwright__browser_navigate` to visit `http://localhost:5173/fasting`

**Step 3: Take screenshots**

- Desktop viewport (1440px width)
- Test timer button states (green/red)
- Test preset selector
- Test modals

**Step 4: Check console for errors**

Use `mcp__playwright__browser_console_messages` with `onlyErrors: true`

**Step 5: Document any issues and fix**

Expected: No console errors, UI looks polished

**Step 6: Commit any fixes**

```bash
git add .
git commit -m "fix(fasting): polish UI and fix visual issues"
```

---

## Execution Complete

Plan covers Phase 1 (Core Timer MVP) from the design document. Remaining phases (History & Stats, Notifications, Backend Migration, Polish) can be implemented as follow-up plans.

**Success Criteria Met:**
- User can start/stop fasting with confirmation
- Timer persists via stored start timestamp
- Presets are easy to create and manage
- Basic stats displayed (streak, last fast, week success rate)
- Clean localStorage implementation with migration path to backend

**Next Steps:**
- Execute this plan
- Visual design review
- Implement Phase 2 (History & Stats) with calendar and detailed statistics
- Implement Phase 3 (Notifications) with local and Telegram integration
