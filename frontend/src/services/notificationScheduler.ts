import { fastingService } from './fastingService';
import { notificationService } from './notificationService';
import { NotificationMilestone, NotificationState } from '../types/fasting';

export class NotificationScheduler {
  private static instance: NotificationScheduler;
  private intervalId: NodeJS.Timeout | null = null;
  private state: NotificationState = {
    eatingWindowId: null,
    milestones: [],
    lastChecked: null,
  };

  private constructor() {
    this.loadState();
  }

  static getInstance(): NotificationScheduler {
    if (!NotificationScheduler.instance) {
      NotificationScheduler.instance = new NotificationScheduler();
    }
    return NotificationScheduler.instance;
  }

  private loadState() {
    try {
      const stored = localStorage.getItem('fasting-notification-state');
      if (stored) {
        this.state = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load notification state:', error);
    }
  }

  private saveState() {
    try {
      localStorage.setItem('fasting-notification-state', JSON.stringify(this.state));
    } catch (error) {
      console.error('Failed to save notification state:', error);
    }
  }

  // Initialize milestones for a new eating window
  private initializeMilestones(): NotificationMilestone[] {
    return [
      { type: 'eating_2h', minutesRemaining: 120, triggered: false, timestamp: null },
      { type: 'eating_1h', minutesRemaining: 60, triggered: false, timestamp: null },
      { type: 'eating_30min', minutesRemaining: 30, triggered: false, timestamp: null },
      { type: 'eating_end', minutesRemaining: 0, triggered: false, timestamp: null },
      { type: 'overdue_15min', minutesRemaining: -15, triggered: false, timestamp: null },
      { type: 'overdue_30min', minutesRemaining: -30, triggered: false, timestamp: null },
      { type: 'overdue_1h', minutesRemaining: -60, triggered: false, timestamp: null },
    ];
  }

  // Check if we need to reset milestones for a new eating window
  private async checkEatingWindowChange() {
    const activeEatingWindow = await fastingService.getActiveEatingWindow();

    if (!activeEatingWindow) {
      // No active eating window, reset state
      if (this.state.eatingWindowId) {
        this.state.eatingWindowId = null;
        this.state.milestones = [];
        this.saveState();
      }
      return;
    }

    // New eating window started
    if (this.state.eatingWindowId !== activeEatingWindow.id) {
      this.state.eatingWindowId = activeEatingWindow.id;
      this.state.milestones = this.initializeMilestones();
      this.saveState();
      console.log('New eating window detected, milestones reset');
    }
  }

  // Check and trigger notifications for eating window
  private async checkEatingWindowNotifications() {
    const activeEatingWindow = await fastingService.getActiveEatingWindow();
    if (!activeEatingWindow) return;

    const now = Date.now();
    const dueTime = new Date(activeEatingWindow.nextFastDueTime).getTime();
    const minutesRemaining = Math.floor((dueTime - now) / 60000);

    // Check each milestone
    for (const milestone of this.state.milestones) {
      if (milestone.triggered) continue;

      // Check if we've passed this milestone
      const shouldTrigger = minutesRemaining <= milestone.minutesRemaining;

      if (shouldTrigger) {
        // Trigger notification
        await notificationService.sendNotification(milestone.type, minutesRemaining);

        // Mark as triggered
        milestone.triggered = true;
        milestone.timestamp = new Date().toISOString();
        this.saveState();

        console.log(`Milestone triggered: ${milestone.type} (${minutesRemaining} minutes remaining)`);
      }
    }
  }

  // Check and trigger fasting goal notifications
  private async checkFastingNotifications() {
    const activeSession = await fastingService.getActiveSession();
    if (!activeSession) return;

    const settings = notificationService.getSettings();
    const elapsedMinutes = fastingService.getElapsedMinutes(activeSession);
    const goalMinutes = activeSession.goalMinutes;

    // Check goal reached (only trigger once)
    if (settings.fastingMilestones.goalReached && elapsedMinutes >= goalMinutes) {
      const key = `fasting-goal-${activeSession.id}`;
      const alreadyTriggered = localStorage.getItem(key);

      if (!alreadyTriggered) {
        await notificationService.sendNotification('fasting_goal', elapsedMinutes - goalMinutes);
        localStorage.setItem(key, 'true');
        console.log('Fasting goal milestone triggered');
      }
    }

    // Check 2 hours extra (only trigger once)
    if (settings.fastingMilestones.twoHoursExtra && elapsedMinutes >= goalMinutes + 120) {
      const key = `fasting-2h-extra-${activeSession.id}`;
      const alreadyTriggered = localStorage.getItem(key);

      if (!alreadyTriggered) {
        await notificationService.sendNotification('fasting_2h_extra', elapsedMinutes - goalMinutes);
        localStorage.setItem(key, 'true');
        console.log('Fasting 2h extra milestone triggered');
      }
    }
  }

  // Main check function that runs every minute
  private async check() {
    const settings = notificationService.getSettings();

    if (!settings.enabled) {
      return;
    }

    try {
      // Check for eating window changes
      await this.checkEatingWindowChange();

      // Check eating window notifications
      await this.checkEatingWindowNotifications();

      // Check fasting notifications
      await this.checkFastingNotifications();

      // Update last checked timestamp
      this.state.lastChecked = new Date().toISOString();
      this.saveState();
    } catch (error) {
      console.error('Notification check failed:', error);
    }
  }

  // Start the scheduler
  start() {
    if (this.intervalId) {
      console.log('Notification scheduler already running');
      return;
    }

    console.log('Starting notification scheduler...');

    // Run immediately
    this.check();

    // Then run every minute
    this.intervalId = setInterval(() => {
      this.check();
    }, 60000); // 60 seconds
  }

  // Stop the scheduler
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('Notification scheduler stopped');
    }
  }

  // Reset all milestones (useful for testing or manual reset)
  async resetMilestones() {
    const activeEatingWindow = await fastingService.getActiveEatingWindow();
    if (activeEatingWindow) {
      this.state.eatingWindowId = activeEatingWindow.id;
      this.state.milestones = this.initializeMilestones();
      this.saveState();
      console.log('Milestones manually reset');
    }
  }

  // Get current state (for debugging/UI)
  getState(): NotificationState {
    return { ...this.state };
  }
}

export const notificationScheduler = NotificationScheduler.getInstance();
