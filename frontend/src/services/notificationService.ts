import { LocalNotifications } from '@capacitor/local-notifications';
import { NotificationSettings } from '../types/fasting';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export class NotificationService {
  private static instance: NotificationService;
  private settings: NotificationSettings = {
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

  private constructor() {
    this.loadSettings();
    this.initializeLocalNotifications();
  }

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  private async initializeLocalNotifications() {
    try {
      // Request permission for local notifications
      const result = await LocalNotifications.requestPermissions();
      console.log('Local notifications permission:', result.display);
    } catch (error) {
      console.error('Failed to initialize local notifications:', error);
    }
  }

  private loadSettings() {
    try {
      const stored = localStorage.getItem('fasting-notification-settings');
      if (stored) {
        this.settings = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load notification settings:', error);
    }
  }

  getSettings(): NotificationSettings {
    return { ...this.settings };
  }

  updateSettings(settings: Partial<NotificationSettings>) {
    this.settings = { ...this.settings, ...settings };
    localStorage.setItem('fasting-notification-settings', JSON.stringify(this.settings));
  }

  // Generate notification messages based on type
  private generateMessage(type: string, minutesRemaining: number): { title: string; body: string } {
    const absMinutes = Math.abs(minutesRemaining);
    const hours = Math.floor(absMinutes / 60);
    const mins = absMinutes % 60;
    const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

    switch (type) {
      case 'eating_2h':
        return {
          title: '⏰ Eating Window Reminder',
          body: `2 hours left in your eating window. Next fast starts soon!`,
        };
      case 'eating_1h':
        return {
          title: '⏰ Eating Window Reminder',
          body: `1 hour left in your eating window. Prepare to start fasting!`,
        };
      case 'eating_30min':
        return {
          title: '⚠️ Eating Window Ending Soon',
          body: `Only 30 minutes left! Your next fast is approaching.`,
        };
      case 'eating_end':
        return {
          title: '🔔 Eating Window Ended',
          body: `Time to start your fast! Tap to begin.`,
        };
      case 'overdue_15min':
        return {
          title: '⚠️ Overdue Fast',
          body: `Your fast is 15 minutes overdue. Start now to maintain your streak!`,
        };
      case 'overdue_30min':
        return {
          title: '🚨 Fast Overdue',
          body: `30 minutes overdue! Start fasting now to avoid breaking your routine.`,
        };
      case 'overdue_1h':
        return {
          title: '🚨 URGENT: Fast Overdue',
          body: `1 hour overdue! Your eating window is significantly extended. Start fasting immediately!`,
        };
      case 'fasting_goal':
        return {
          title: '🎉 Fasting Goal Reached!',
          body: `Congratulations! You've reached your fasting goal. Keep going or end your fast.`,
        };
      case 'fasting_2h_extra':
        return {
          title: '💪 Extra Fasting Time!',
          body: `Amazing! You've fasted 2 hours beyond your goal. Great discipline!`,
        };
      default:
        return {
          title: 'Fasting Reminder',
          body: 'Check your fasting timer',
        };
    }
  }

  // Send local notification
  async sendLocalNotification(type: string, minutesRemaining: number) {
    if (!this.settings.enabled || !this.settings.localNotifications) {
      return;
    }

    try {
      const { title, body } = this.generateMessage(type, minutesRemaining);

      await LocalNotifications.schedule({
        notifications: [
          {
            id: Date.now(), // Unique ID based on timestamp
            title,
            body,
            schedule: { at: new Date(Date.now() + 100) }, // Schedule immediately
            sound: undefined,
            attachments: undefined,
            actionTypeId: '',
            extra: { type },
          },
        ],
      });

      console.log(`Local notification sent: ${type}`);
    } catch (error) {
      console.error('Failed to send local notification:', error);
    }
  }

  // Send Telegram notification
  async sendTelegramNotification(type: string, minutesRemaining: number) {
    if (!this.settings.enabled || !this.settings.telegramNotifications) {
      return;
    }

    try {
      const { title, body } = this.generateMessage(type, minutesRemaining);
      const message = `${title}\n\n${body}`;

      await axios.post(`${API_URL}/api/telegram/send-custom`, {
        message,
        priority: type.includes('overdue') ? 'high' : 'normal',
      });

      console.log(`Telegram notification sent: ${type}`);
    } catch (error) {
      console.error('Failed to send Telegram notification:', error);
    }
  }

  // Send notification via both channels
  async sendNotification(type: string, minutesRemaining: number) {
    if (!this.settings.enabled) {
      return;
    }

    // Check if this notification type is enabled
    if (!this.isNotificationTypeEnabled(type)) {
      return;
    }

    // Send to both channels in parallel
    await Promise.all([
      this.sendLocalNotification(type, minutesRemaining),
      this.sendTelegramNotification(type, minutesRemaining),
    ]);
  }

  // Check if a specific notification type is enabled
  private isNotificationTypeEnabled(type: string): boolean {
    const { eatingWindowReminders, overdueReminders, fastingMilestones } = this.settings;

    switch (type) {
      case 'eating_2h':
        return eatingWindowReminders.twoHours;
      case 'eating_1h':
        return eatingWindowReminders.oneHour;
      case 'eating_30min':
        return eatingWindowReminders.thirtyMinutes;
      case 'eating_end':
        return eatingWindowReminders.windowEnding;
      case 'overdue_15min':
        return overdueReminders.fifteenMinutes;
      case 'overdue_30min':
        return overdueReminders.thirtyMinutes;
      case 'overdue_1h':
        return overdueReminders.oneHour;
      case 'fasting_goal':
        return fastingMilestones.goalReached;
      case 'fasting_2h_extra':
        return fastingMilestones.twoHoursExtra;
      default:
        return false;
    }
  }

  // Cancel all pending notifications
  async cancelAllNotifications() {
    try {
      await LocalNotifications.cancel({ notifications: [] });
      console.log('All local notifications cancelled');
    } catch (error) {
      console.error('Failed to cancel notifications:', error);
    }
  }
}

export const notificationService = NotificationService.getInstance();
