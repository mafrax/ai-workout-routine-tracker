# Fasting Timer - Phase 3: Notifications Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add local and Telegram notifications for eating window milestones and overdue reminders.

**Architecture:** Background notification scheduler that monitors eating window state and sends reminders at configured milestones. Integrates with existing Telegram service.

**Tech Stack:** Capacitor Local Notifications, existing Telegram service, browser Notification API (fallback)

---

## Task 1: Add Notification Types and Settings

**Files:**
- Modify: `frontend/src/types/fasting.ts`

**Step 1: Add notification types**

Add to `frontend/src/types/fasting.ts`:

```typescript
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
```

**Step 2: Update NotificationSettings interface**

Replace existing `NotificationSettings` interface:

```typescript
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
```

**Step 3: Commit**

```bash
git add frontend/src/types/fasting.ts
git commit -m "feat(notifications): add notification types and enhanced settings"
```

---

## Task 2: Create Notification Service

**Files:**
- Create: `frontend/src/services/notificationService.ts`

**Step 1: Create notification service with local and Telegram support**

Create `frontend/src/services/notificationService.ts`:

```typescript
import { LocalNotifications } from '@capacitor/local-notifications';
import { NotificationSettings } from '../types/fasting';

interface NotificationPayload {
  title: string;
  body: string;
  id: number;
  extra?: Record<string, any>;
}

class NotificationService {
  private nextId = 1;

  async initialize(): Promise<void> {
    try {
      // Request permission for local notifications
      const permission = await LocalNotifications.requestPermissions();
      console.log('Notification permission:', permission);
    } catch (error) {
      console.error('Failed to request notification permissions:', error);
    }
  }

  async scheduleLocalNotification(
    title: string,
    body: string,
    scheduleTime: Date,
    extra?: Record<string, any>
  ): Promise<number> {
    const id = this.nextId++;

    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            title,
            body,
            id,
            schedule: { at: scheduleTime },
            extra,
            sound: undefined,
            attachments: undefined,
            actionTypeId: '',
            smallIcon: 'ic_stat_icon_config_sample',
          },
        ],
      });

      console.log(`Scheduled notification ${id} for ${scheduleTime.toISOString()}`);
      return id;
    } catch (error) {
      console.error('Failed to schedule notification:', error);
      throw error;
    }
  }

  async sendImmediateNotification(
    title: string,
    body: string,
    extra?: Record<string, any>
  ): Promise<void> {
    const id = this.nextId++;

    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            title,
            body,
            id,
            schedule: { at: new Date(Date.now() + 1000) }, // 1 second from now
            extra,
            sound: undefined,
            attachments: undefined,
            actionTypeId: '',
            smallIcon: 'ic_stat_icon_config_sample',
          },
        ],
      });

      console.log(`Sent immediate notification: ${title}`);
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  }

  async cancelNotification(id: number): Promise<void> {
    try {
      await LocalNotifications.cancel({ notifications: [{ id }] });
      console.log(`Cancelled notification ${id}`);
    } catch (error) {
      console.error('Failed to cancel notification:', error);
    }
  }

  async cancelAllNotifications(): Promise<void> {
    try {
      const pending = await LocalNotifications.getPending();
      if (pending.notifications.length > 0) {
        await LocalNotifications.cancel({ notifications: pending.notifications });
        console.log(`Cancelled ${pending.notifications.length} notifications`);
      }
    } catch (error) {
      console.error('Failed to cancel all notifications:', error);
    }
  }

  async sendTelegramNotification(message: string): Promise<void> {
    try {
      // Use existing Telegram service
      const response = await fetch('/api/telegram/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });

      if (!response.ok) {
        throw new Error('Failed to send Telegram notification');
      }

      console.log('Sent Telegram notification:', message);
    } catch (error) {
      console.error('Failed to send Telegram notification:', error);
    }
  }

  generateEatingWindowMessage(minutesRemaining: number): string {
    const hours = Math.floor(Math.abs(minutesRemaining) / 60);
    const mins = Math.abs(minutesRemaining) % 60;
    const timeStr = mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;

    if (minutesRemaining === 120) {
      return `⏰ Eating window reminder: ${timeStr} until your next fast`;
    } else if (minutesRemaining === 60) {
      return `⏰ 1 hour left in your eating window. Time to prepare for fasting!`;
    } else if (minutesRemaining === 30) {
      return `⏰ Only 30 minutes left! Your eating window is ending soon.`;
    } else if (minutesRemaining === 0) {
      return `🚨 Time to fast! Your eating window has ended. Tap to start your fast.`;
    } else if (minutesRemaining < 0) {
      return `🔴 OVERDUE: You're ${timeStr} late to start fasting!`;
    }

    return `⏰ ${timeStr} until next fast`;
  }

  generateFastingMilestoneMessage(elapsedMinutes: number, goalMinutes: number): string {
    if (elapsedMinutes === goalMinutes) {
      return `🎉 Goal reached! You've completed your ${Math.floor(goalMinutes / 60)}h fast!`;
    } else if (elapsedMinutes === goalMinutes + 120) {
      return `💪 Amazing! You've fasted 2 hours beyond your goal!`;
    }

    return `✅ Fasting milestone reached`;
  }
}

export const notificationService = new NotificationService();
```

**Step 2: Commit**

```bash
git add frontend/src/services/notificationService.ts
git commit -m "feat(notifications): create notification service with local and Telegram support"
```

---

## Task 3: Create Notification Scheduler

**Files:**
- Create: `frontend/src/services/notificationScheduler.ts`

**Step 1: Create scheduler that monitors eating window**

Create `frontend/src/services/notificationScheduler.ts`:

```typescript
import { fastingService } from './fastingService';
import { notificationService } from './notificationService';
import { NotificationSettings, EatingWindow } from '../types/fasting';

class NotificationScheduler {
  private checkInterval: NodeJS.Timeout | null = null;
  private scheduledNotificationIds: number[] = [];
  private sentNotifications = new Set<string>();

  start(settings: NotificationSettings): void {
    console.log('Starting notification scheduler');

    // Stop any existing interval
    this.stop();

    // Check every minute
    this.checkInterval = setInterval(() => {
      this.checkAndNotify(settings);
    }, 60 * 1000); // 60 seconds

    // Also check immediately
    this.checkAndNotify(settings);
  }

  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log('Stopped notification scheduler');
    }
  }

  async checkAndNotify(settings: NotificationSettings): Promise<void> {
    if (!settings.enabled) return;

    const { state } = fastingService.getCurrentState();

    if (state === 'eating' || state === 'overdue') {
      await this.checkEatingWindowNotifications(settings);
    } else if (state === 'fasting') {
      await this.checkFastingNotifications(settings);
    }
  }

  private async checkEatingWindowNotifications(settings: NotificationSettings): Promise<void> {
    const activeEatingWindow = fastingService.getActiveEatingWindow();
    if (!activeEatingWindow) return;

    const remainingMinutes = fastingService.getEatingWindowRemaining(activeEatingWindow);
    const overdueMinutes = fastingService.getOverdueMinutes(activeEatingWindow);
    const isOverdue = remainingMinutes === 0 && overdueMinutes > 0;

    // Check eating window ending reminders
    if (!isOverdue) {
      await this.checkMilestone(
        activeEatingWindow,
        remainingMinutes,
        120,
        settings.eatingWindowReminders.twoHours,
        settings
      );

      await this.checkMilestone(
        activeEatingWindow,
        remainingMinutes,
        60,
        settings.eatingWindowReminders.oneHour,
        settings
      );

      await this.checkMilestone(
        activeEatingWindow,
        remainingMinutes,
        30,
        settings.eatingWindowReminders.thirtyMinutes,
        settings
      );

      await this.checkMilestone(
        activeEatingWindow,
        remainingMinutes,
        0,
        settings.eatingWindowReminders.windowEnding,
        settings
      );
    } else {
      // Overdue reminders
      await this.checkOverdueMilestone(
        activeEatingWindow,
        overdueMinutes,
        15,
        settings.overdueReminders.fifteenMinutes,
        settings
      );

      await this.checkOverdueMilestone(
        activeEatingWindow,
        overdueMinutes,
        30,
        settings.overdueReminders.thirtyMinutes,
        settings
      );

      await this.checkOverdueMilestone(
        activeEatingWindow,
        overdueMinutes,
        60,
        settings.overdueReminders.oneHour,
        settings
      );
    }
  }

  private async checkMilestone(
    window: EatingWindow,
    remainingMinutes: number,
    targetMinutes: number,
    enabled: boolean,
    settings: NotificationSettings
  ): Promise<void> {
    if (!enabled) return;

    const key = `${window.id}_eating_${targetMinutes}`;
    if (this.sentNotifications.has(key)) return;

    // Check if we're within 1 minute of the target (to account for check interval)
    if (Math.abs(remainingMinutes - targetMinutes) <= 1) {
      this.sentNotifications.add(key);

      const message = notificationService.generateEatingWindowMessage(targetMinutes);

      if (settings.localNotifications) {
        await notificationService.sendImmediateNotification(
          'Fasting Timer',
          message
        );
      }

      if (settings.telegramNotifications) {
        await notificationService.sendTelegramNotification(message);
      }
    }
  }

  private async checkOverdueMilestone(
    window: EatingWindow,
    overdueMinutes: number,
    targetMinutes: number,
    enabled: boolean,
    settings: NotificationSettings
  ): Promise<void> {
    if (!enabled) return;

    const key = `${window.id}_overdue_${targetMinutes}`;
    if (this.sentNotifications.has(key)) return;

    if (Math.abs(overdueMinutes - targetMinutes) <= 1) {
      this.sentNotifications.add(key);

      const message = notificationService.generateEatingWindowMessage(-targetMinutes);

      if (settings.localNotifications) {
        await notificationService.sendImmediateNotification(
          'Fasting Timer - OVERDUE',
          message
        );
      }

      if (settings.telegramNotifications) {
        await notificationService.sendTelegramNotification(message);
      }
    }
  }

  private async checkFastingNotifications(settings: NotificationSettings): Promise<void> {
    const activeSession = fastingService.getActiveSession();
    if (!activeSession) return;

    const elapsedMinutes = fastingService.getElapsedMinutes(activeSession);

    // Goal reached
    if (settings.fastingMilestones.goalReached) {
      const key = `${activeSession.id}_goal`;
      if (!this.sentNotifications.has(key) && Math.abs(elapsedMinutes - activeSession.goalMinutes) <= 1) {
        this.sentNotifications.add(key);

        const message = notificationService.generateFastingMilestoneMessage(
          elapsedMinutes,
          activeSession.goalMinutes
        );

        if (settings.localNotifications) {
          await notificationService.sendImmediateNotification('Fasting Goal Reached!', message);
        }

        if (settings.telegramNotifications) {
          await notificationService.sendTelegramNotification(message);
        }
      }
    }

    // 2 hours past goal
    if (settings.fastingMilestones.twoHoursExtra) {
      const key = `${activeSession.id}_extra2h`;
      const target = activeSession.goalMinutes + 120;
      if (!this.sentNotifications.has(key) && Math.abs(elapsedMinutes - target) <= 1) {
        this.sentNotifications.add(key);

        const message = notificationService.generateFastingMilestoneMessage(elapsedMinutes, activeSession.goalMinutes);

        if (settings.localNotifications) {
          await notificationService.sendImmediateNotification('Fasting Milestone', message);
        }

        if (settings.telegramNotifications) {
          await notificationService.sendTelegramNotification(message);
        }
      }
    }
  }

  clearSentNotifications(): void {
    this.sentNotifications.clear();
    console.log('Cleared sent notifications tracking');
  }
}

export const notificationScheduler = new NotificationScheduler();
```

**Step 2: Commit**

```bash
git add frontend/src/services/notificationScheduler.ts
git commit -m "feat(notifications): create scheduler to monitor and send notifications"
```

---

## Task 4: Update Store with Notification Management

**Files:**
- Modify: `frontend/src/store/useFastingStore.ts`

**Step 1: Add notification state and actions**

Add to the store interface:

```typescript
interface FastingState {
  // ... existing fields ...
  notificationSettings: NotificationSettings;
  notificationsEnabled: boolean;

  // ... existing actions ...
  updateNotificationSettings: (settings: Partial<NotificationSettings>) => void;
  initializeNotifications: () => Promise<void>;
  startNotificationScheduler: () => void;
  stopNotificationScheduler: () => void;
}
```

**Step 2: Update DEFAULT_NOTIFICATION_SETTINGS**

```typescript
const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: true,
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
```

**Step 3: Add notification actions to store**

```typescript
import { notificationService } from '../services/notificationService';
import { notificationScheduler } from '../services/notificationScheduler';

export const useFastingStore = create<FastingState>((set, get) => ({
  // ... existing state ...
  notificationsEnabled: false,

  // ... existing actions ...

  initializeNotifications: async () => {
    try {
      await notificationService.initialize();
      set({ notificationsEnabled: true });

      // Start scheduler if enabled
      const { notificationSettings } = get();
      if (notificationSettings.enabled) {
        get().startNotificationScheduler();
      }
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
    }
  },

  startNotificationScheduler: () => {
    const { notificationSettings } = get();
    notificationScheduler.start(notificationSettings);
  },

  stopNotificationScheduler: () => {
    notificationScheduler.stop();
  },

  updateNotificationSettings: (settings: Partial<NotificationSettings>) => {
    set(state => ({
      notificationSettings: { ...state.notificationSettings, ...settings }
    }));

    // Restart scheduler with new settings
    const { notificationSettings } = get();
    if (notificationSettings.enabled) {
      get().startNotificationScheduler();
    } else {
      get().stopNotificationScheduler();
    }
  },
}));
```

**Step 4: Commit**

```bash
git add frontend/src/store/useFastingStore.ts
git commit -m "feat(notifications): integrate notification management into store"
```

---

## Task 5: Initialize Notifications in Fasting Page

**Files:**
- Modify: `frontend/src/pages/Fasting.tsx`

**Step 1: Initialize notifications on mount**

Update the `useEffect`:

```typescript
const {
  loadPresets,
  loadActiveState,
  loadStats,
  initializeNotifications,
  startNotificationScheduler,
  // ... other fields
} = useFastingStore();

useEffect(() => {
  loadPresets();
  loadActiveState();
  loadStats();

  // Initialize and start notifications
  initializeNotifications();

  return () => {
    // Cleanup on unmount
    const { stopNotificationScheduler } = useFastingStore.getState();
    stopNotificationScheduler();
  };
}, []);
```

**Step 2: Commit**

```bash
git add frontend/src/pages/Fasting.tsx
git commit -m "feat(notifications): initialize notification system on fasting page mount"
```

---

## Task 6: Create Notification Settings UI

**Files:**
- Create: `frontend/src/components/Fasting/NotificationSettings.tsx`
- Create: `frontend/src/components/Fasting/NotificationSettings.css`

**Step 1: Create notification settings component**

Create `frontend/src/components/Fasting/NotificationSettings.tsx`:

```typescript
import React from 'react';
import {
  IonList,
  IonItem,
  IonLabel,
  IonToggle,
  IonListHeader,
  IonButton,
} from '@ionic/react';
import { useFastingStore } from '../../store/useFastingStore';
import { notificationService } from '../../services/notificationService';
import './NotificationSettings.css';

const NotificationSettings: React.FC = () => {
  const { notificationSettings, updateNotificationSettings } = useFastingStore();

  const handleToggle = (path: string, value: boolean) => {
    const parts = path.split('.');
    if (parts.length === 1) {
      updateNotificationSettings({ [parts[0]]: value });
    } else if (parts.length === 2) {
      updateNotificationSettings({
        [parts[0]]: {
          ...notificationSettings[parts[0] as keyof typeof notificationSettings],
          [parts[1]]: value,
        },
      });
    }
  };

  const handleTestNotification = async () => {
    await notificationService.sendImmediateNotification(
      'Test Notification',
      'This is a test notification from Fasting Timer!'
    );
  };

  const handleTestTelegram = async () => {
    await notificationService.sendTelegramNotification(
      '🧪 Test notification from Fasting Timer!'
    );
  };

  return (
    <div className="notification-settings">
      <IonList>
        <IonListHeader>
          <h2>Notification Settings</h2>
        </IonListHeader>

        <IonItem>
          <IonLabel>Enable Notifications</IonLabel>
          <IonToggle
            checked={notificationSettings.enabled}
            onIonChange={(e) => handleToggle('enabled', e.detail.checked)}
          />
        </IonItem>

        <IonItem>
          <IonLabel>Local Notifications</IonLabel>
          <IonToggle
            checked={notificationSettings.localNotifications}
            onIonChange={(e) => handleToggle('localNotifications', e.detail.checked)}
            disabled={!notificationSettings.enabled}
          />
        </IonItem>

        <IonItem>
          <IonLabel>Telegram Notifications</IonLabel>
          <IonToggle
            checked={notificationSettings.telegramNotifications}
            onIonChange={(e) => handleToggle('telegramNotifications', e.detail.checked)}
            disabled={!notificationSettings.enabled}
          />
        </IonItem>

        <IonListHeader>Eating Window Reminders</IonListHeader>

        <IonItem>
          <IonLabel>2 Hours Before</IonLabel>
          <IonToggle
            checked={notificationSettings.eatingWindowReminders.twoHours}
            onIonChange={(e) => handleToggle('eatingWindowReminders.twoHours', e.detail.checked)}
            disabled={!notificationSettings.enabled}
          />
        </IonItem>

        <IonItem>
          <IonLabel>1 Hour Before</IonLabel>
          <IonToggle
            checked={notificationSettings.eatingWindowReminders.oneHour}
            onIonChange={(e) => handleToggle('eatingWindowReminders.oneHour', e.detail.checked)}
            disabled={!notificationSettings.enabled}
          />
        </IonItem>

        <IonItem>
          <IonLabel>30 Minutes Before</IonLabel>
          <IonToggle
            checked={notificationSettings.eatingWindowReminders.thirtyMinutes}
            onIonChange={(e) => handleToggle('eatingWindowReminders.thirtyMinutes', e.detail.checked)}
            disabled={!notificationSettings.enabled}
          />
        </IonItem>

        <IonItem>
          <IonLabel>When Window Ends</IonLabel>
          <IonToggle
            checked={notificationSettings.eatingWindowReminders.windowEnding}
            onIonChange={(e) => handleToggle('eatingWindowReminders.windowEnding', e.detail.checked)}
            disabled={!notificationSettings.enabled}
          />
        </IonItem>

        <IonListHeader>Overdue Reminders</IonListHeader>

        <IonItem>
          <IonLabel>15 Minutes Overdue</IonLabel>
          <IonToggle
            checked={notificationSettings.overdueReminders.fifteenMinutes}
            onIonChange={(e) => handleToggle('overdueReminders.fifteenMinutes', e.detail.checked)}
            disabled={!notificationSettings.enabled}
          />
        </IonItem>

        <IonItem>
          <IonLabel>30 Minutes Overdue</IonLabel>
          <IonToggle
            checked={notificationSettings.overdueReminders.thirtyMinutes}
            onIonChange={(e) => handleToggle('overdueReminders.thirtyMinutes', e.detail.checked)}
            disabled={!notificationSettings.enabled}
          />
        </IonItem>

        <IonItem>
          <IonLabel>1 Hour Overdue</IonLabel>
          <IonToggle
            checked={notificationSettings.overdueReminders.oneHour}
            onIonChange={(e) => handleToggle('overdueReminders.oneHour', e.detail.checked)}
            disabled={!notificationSettings.enabled}
          />
        </IonItem>

        <IonListHeader>Fasting Milestones</IonListHeader>

        <IonItem>
          <IonLabel>Goal Reached</IonLabel>
          <IonToggle
            checked={notificationSettings.fastingMilestones.goalReached}
            onIonChange={(e) => handleToggle('fastingMilestones.goalReached', e.detail.checked)}
            disabled={!notificationSettings.enabled}
          />
        </IonItem>

        <IonItem>
          <IonLabel>2 Hours Extra</IonLabel>
          <IonToggle
            checked={notificationSettings.fastingMilestones.twoHoursExtra}
            onIonChange={(e) => handleToggle('fastingMilestones.twoHoursExtra', e.detail.checked)}
            disabled={!notificationSettings.enabled}
          />
        </IonItem>
      </IonList>

      <div className="test-buttons">
        <IonButton
          expand="block"
          fill="outline"
          onClick={handleTestNotification}
          disabled={!notificationSettings.localNotifications}
        >
          Test Local Notification
        </IonButton>
        <IonButton
          expand="block"
          fill="outline"
          onClick={handleTestTelegram}
          disabled={!notificationSettings.telegramNotifications}
        >
          Test Telegram Notification
        </IonButton>
      </div>
    </div>
  );
};

export default NotificationSettings;
```

**Step 2: Create styles**

Create `frontend/src/components/Fasting/NotificationSettings.css`:

```css
.notification-settings {
  padding-bottom: 2rem;
}

.test-buttons {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
```

**Step 3: Add settings modal to Fasting page**

Update `frontend/src/pages/Fasting.tsx` to add a settings button and modal:

```typescript
import NotificationSettings from '../components/Fasting/NotificationSettings';
import { settings } from 'ionicons/icons';

// In component:
const [showSettingsModal, setShowSettingsModal] = useState(false);

// In header:
<IonHeader>
  <IonToolbar>
    <IonTitle>Fasting</IonTitle>
    <IonButtons slot="end">
      <IonButton onClick={() => setShowSettingsModal(true)}>
        <IonIcon icon={settings} />
      </IonButton>
    </IonButtons>
  </IonToolbar>
</IonHeader>

// Before closing IonContent:
<IonModal isOpen={showSettingsModal} onDidDismiss={() => setShowSettingsModal(false)}>
  <IonHeader>
    <IonToolbar>
      <IonTitle>Notification Settings</IonTitle>
      <IonButtons slot="end">
        <IonButton onClick={() => setShowSettingsModal(false)}>
          <IonIcon icon={close} />
        </IonButton>
      </IonButtons>
    </IonToolbar>
  </IonHeader>
  <IonContent>
    <NotificationSettings />
  </IonContent>
</IonModal>
```

**Step 4: Commit**

```bash
git add frontend/src/components/Fasting/NotificationSettings.tsx frontend/src/components/Fasting/NotificationSettings.css frontend/src/pages/Fasting.tsx
git commit -m "feat(notifications): add notification settings UI with toggle controls"
```

---

## Task 7: Test Notification Flow

**Files:**
- Manual testing

**Step 1: Test local notifications**
- Enable local notifications in settings
- Start a fast with short duration (e.g., 1 minute for testing)
- Stop fast to trigger eating window
- Wait for notifications at configured milestones

**Step 2: Test Telegram notifications**
- Ensure Telegram is configured in backend
- Enable Telegram notifications in settings
- Test with "Test Telegram Notification" button
- Verify eating window notifications are sent to Telegram

**Step 3: Test overdue notifications**
- Let eating window expire without starting fast
- Verify overdue notifications are sent

**Step 4: Verify notification persistence**
- Close and reopen app
- Verify notifications still work
- Check that duplicate notifications aren't sent

**Step 5: Document any issues**

Expected: All notifications fire at correct times, no duplicates, settings persist

---

## Execution Complete

This plan implements Phase 3 (Notifications) with:
- Local notifications using Capacitor
- Telegram integration using existing backend
- Comprehensive notification scheduler
- Settings UI for user control
- Multiple milestone types (eating window, overdue, fasting goals)

**Success Criteria:**
- User receives notifications at configured milestones
- Both local and Telegram notifications work
- Settings persist across app sessions
- No duplicate notifications
- Notifications work even when app is backgrounded

**Next Phase:**
- Phase 4: Backend Migration (multi-device sync, cloud backup)
- Phase 5: Advanced Features (history calendar, export data, custom presets)
