import { LocalNotifications } from '@capacitor/local-notifications';
import { Preferences } from '@capacitor/preferences';
import { getUserSessions } from './workoutSessionService';
import { telegramService } from './telegramService';

interface WorkoutSession {
  id?: number;
  userId: number;
  sessionDate: string;
  durationMinutes?: number;
  exercises: string;
  completionRate?: number;
}

class DailyRecapService {
  private readonly NOTIFICATION_ID = 1;
  private readonly SCHEDULE_HOUR = 9; // 9 AM
  private readonly SCHEDULE_MINUTE = 0;

  async setupDailyNotification(): Promise<void> {
    try {
      // Request permissions
      const permission = await LocalNotifications.requestPermissions();
      if (permission.display !== 'granted') {
        console.warn('Notification permission not granted');
        return;
      }

      // Cancel any existing notifications
      await LocalNotifications.cancel({ notifications: [{ id: this.NOTIFICATION_ID }] });

      // Schedule daily notification at 9 AM
      await LocalNotifications.schedule({
        notifications: [
          {
            id: this.NOTIFICATION_ID,
            title: 'Daily Fitness Update',
            body: 'Tap to view your progress recap',
            schedule: {
              on: {
                hour: this.SCHEDULE_HOUR,
                minute: this.SCHEDULE_MINUTE,
              },
              repeats: true,
            },
          },
        ],
      });

      console.log('Daily notification scheduled for 9 AM');
    } catch (error) {
      console.error('Error setting up daily notification:', error);
    }
  }

  async cancelDailyNotification(): Promise<void> {
    try {
      await LocalNotifications.cancel({ notifications: [{ id: this.NOTIFICATION_ID }] });
      console.log('Daily notification cancelled');
    } catch (error) {
      console.error('Error cancelling notification:', error);
    }
  }

  async calculateStats(userId: number): Promise<{
    workoutsThisWeek: number;
    totalMinutesThisWeek: number;
    lastWorkoutDate?: string;
    currentStreak: number;
    lastWeight?: number;
    lastWeightDate?: string;
  }> {
    try {
      const sessions = await getUserSessions(userId);

      // Get date 7 days ago (last 7 days including today)
      const now = new Date();
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(now.getDate() - 7);
      sevenDaysAgo.setHours(0, 0, 0, 0);

      // Filter sessions from last 7 days
      const thisWeekSessions = sessions.filter((session: WorkoutSession) => {
        const sessionDate = new Date(session.sessionDate);
        return sessionDate >= sevenDaysAgo;
      });

      const workoutsThisWeek = thisWeekSessions.length;
      const totalMinutesThisWeek = thisWeekSessions.reduce((sum: number, s: WorkoutSession) => sum + (s.durationMinutes || 0), 0);

      // Get last workout date
      const sortedSessions = [...sessions].sort((a, b) =>
        new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime()
      );
      const lastWorkoutDate = sortedSessions.length > 0 ? sortedSessions[0].sessionDate : undefined;

      // Calculate current streak
      const currentStreak = this.calculateStreak(sessions);

      // Get last weight from preferences
      const lastWeightStr = await Preferences.get({ key: 'last_weight' });
      const lastWeightDateStr = await Preferences.get({ key: 'last_weight_date' });

      return {
        workoutsThisWeek,
        totalMinutesThisWeek,
        lastWorkoutDate,
        currentStreak,
        lastWeight: lastWeightStr.value ? parseFloat(lastWeightStr.value) : undefined,
        lastWeightDate: lastWeightDateStr.value || undefined,
      };
    } catch (error) {
      console.error('Error calculating stats:', error);
      return {
        workoutsThisWeek: 0,
        totalMinutesThisWeek: 0,
        currentStreak: 0,
      };
    }
  }

  private calculateStreak(sessions: WorkoutSession[]): number {
    if (sessions.length === 0) return 0;

    // Sort sessions by date (newest first)
    const sortedSessions = [...sessions].sort((a, b) =>
      new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime()
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastWorkoutDate = new Date(sortedSessions[0].sessionDate);
    lastWorkoutDate.setHours(0, 0, 0, 0);

    // Check if last workout was today or yesterday
    const daysDiff = Math.floor((today.getTime() - lastWorkoutDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff > 1) return 0; // Streak broken

    // Count consecutive days
    let streak = 0;
    const workoutDates = new Set(
      sortedSessions.map(s => {
        const date = new Date(s.sessionDate);
        date.setHours(0, 0, 0, 0);
        return date.getTime();
      })
    );

    let currentDate = new Date(today);
    while (workoutDates.has(currentDate.getTime()) || (streak === 0 && daysDiff === 1)) {
      if (workoutDates.has(currentDate.getTime())) {
        streak++;
      }
      currentDate.setDate(currentDate.getDate() - 1);
    }

    return streak;
  }

  async sendDailyRecap(userId: number): Promise<boolean> {
    try {
      const stats = await this.calculateStats(userId);
      const message = telegramService.formatDailyRecapMessage(stats);
      return await telegramService.sendMessage(message);
    } catch (error) {
      console.error('Error sending daily recap:', error);
      return false;
    }
  }
}

export const dailyRecapService = new DailyRecapService();
