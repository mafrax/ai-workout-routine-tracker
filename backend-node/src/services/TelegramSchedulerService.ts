import * as cron from 'node-cron';
import { DailyTaskService } from './DailyTaskService';
import { TelegramService } from './TelegramService';
import { Workout } from '../types';
import prisma from '../lib/database';

export class TelegramSchedulerService {
  private dailyTaskService = new DailyTaskService();
  private telegramService = new TelegramService();

  startScheduler(): void {
    console.log('Starting Telegram scheduler...');

    // Task reminders - every hour
    cron.schedule('0 * * * *', () => {
      this.checkAndSendTaskReminders();
    });

    // Workout previews - every hour
    cron.schedule('0 * * * *', () => {
      this.checkAndSendWorkoutPreviews();
    });

    // Daily reset - midnight
    cron.schedule('0 0 * * *', () => {
      this.resetDailyTasks();
    });

    console.log('Telegram scheduler started successfully');
  }

  private async checkAndSendTaskReminders(): Promise<void> {
    console.log('Checking for task reminders to send...');

    try {
      const allConfigs = await prisma.telegramConfig.findMany();

      for (const config of allConfigs) {
        try {
          await this.checkAndSendForUser(config);
        } catch (error) {
          console.error(`Error processing reminders for user ${config.userId}:`, error);
        }
      }
    } catch (error) {
      console.error('Error checking task reminders:', error);
    }
  }

  private async checkAndSendWorkoutPreviews(): Promise<void> {
    console.log('Checking for workout previews to send...');

    try {
      const currentHour = new Date().getHours();

      const plansToPreview = await prisma.workoutPlan.findMany({
        where: {
          telegramPreviewHour: currentHour,
          isActive: true,
          isArchived: false
        }
      });

      for (const plan of plansToPreview) {
        try {
          await this.sendWorkoutPreviewForPlan(plan);
        } catch (error) {
          console.error(`Error sending workout preview for plan ${plan.id}:`, error);
        }
      }
    } catch (error) {
      console.error('Error checking workout previews:', error);
    }
  }

  private async resetDailyTasks(): Promise<void> {
    console.log('Resetting all daily tasks at midnight...');

    try {
      const allConfigs = await prisma.telegramConfig.findMany();

      for (const config of allConfigs) {
        try {
          await this.dailyTaskService.resetAllTasks(config.userId);
          console.log(`Reset tasks for user ${config.userId}`);
        } catch (error) {
          console.error(`Error resetting tasks for user ${config.userId}:`, error);
        }
      }
    } catch (error) {
      console.error('Error resetting daily tasks:', error);
    }
  }

  private async checkAndSendForUser(config: any): Promise<void> {
    const userId = config.userId;
    const currentHour = new Date().getHours();
    const startHour = config.dailyTasksStartHour ?? 9;

    // Check if we're in the reminder window (start hour to 8 PM)
    if (currentHour < startHour || currentHour > 20) {
      return;
    }

    // Get reminder schedule
    const schedule = this.generateReminderSchedule(startHour);

    // Check if current hour is in the schedule
    if (!schedule.includes(currentHour)) {
      return;
    }

    // Check if we already sent a reminder this hour
    const lastSent = config.lastTaskReminderSent;
    if (lastSent) {
      const timeSinceLastReminder = Date.now() - lastSent.getTime();
      const minutesSinceLastReminder = timeSinceLastReminder / (1000 * 60);
      
      if (minutesSinceLastReminder < 55) {
        // Already sent in the last 55 minutes, skip
        return;
      }
    }

    // Get incomplete tasks
    const incompleteTasks = await this.dailyTaskService.getIncompleteTasks(userId);

    if (incompleteTasks.length === 0) {
      console.log(`No incomplete tasks for user ${userId}, skipping reminder`);
      return;
    }

    // Send reminder
    const sent = await this.telegramService.sendTaskReminder(userId, incompleteTasks);

    if (sent) {
      console.log(`Sent task reminder to user ${userId} with ${incompleteTasks.length} tasks`);
    }
  }

  private async sendWorkoutPreviewForPlan(plan: any): Promise<void> {
    const planDetails = plan.planDetails;

    if (!planDetails?.trim()) {
      console.warn(`No plan details for plan ${plan.id}`);
      return;
    }

    // Parse next workout
    const workouts = this.parseNextWorkouts(planDetails, 1);

    if (workouts.length === 0) {
      console.warn(`No workouts found in plan ${plan.id}`);
      return;
    }

    const nextWorkout = workouts[0];
    if (!nextWorkout) {
      console.warn(`No next workout found for plan ${plan.id}`);
      return;
    }

    const sent = await this.telegramService.sendWorkoutPreview(
      plan.userId,
      plan.name,
      nextWorkout.day,
      nextWorkout.exercises
    );

    if (sent) {
      console.log(`Sent workout preview for plan ${plan.id} to user ${plan.userId}`);
    }
  }

  private generateReminderSchedule(startHour: number): number[] {
    const schedule: number[] = [];
    schedule.push(startHour);

    let currentHour = startHour;

    // First two reminders: every 2 hours
    currentHour += 2;
    if (currentHour <= 20) schedule.push(currentHour);
    currentHour += 2;
    if (currentHour <= 20) schedule.push(currentHour);

    // Remaining reminders: every 1 hour (increasing frequency)
    while (currentHour < 20) {
      currentHour += 1;
      schedule.push(currentHour);
    }

    return schedule;
  }

  private parseNextWorkouts(planDetails: string, count: number): Workout[] {
    const workouts: Workout[] = [];
    const lines = planDetails.split('\n');

    let currentDay: string | null = null;
    let currentExercises: string[] = [];

    const dayPattern = /^(Day \d+|\w+day)\s*:?\s*(.*)$/i;
    const exercisePattern = /^\s*-\s*(.+)$/;

    for (const line of lines) {
      const trimmedLine = line.trim();

      if (trimmedLine === '') {
        if (currentDay && currentExercises.length > 0) {
          workouts.push({ day: currentDay, exercises: [...currentExercises] });
          currentDay = null;
          currentExercises = [];

          if (workouts.length >= count) {
            break;
          }
        }
        continue;
      }

      const dayMatch = dayPattern.exec(trimmedLine);
      if (dayMatch) {
        if (currentDay && currentExercises.length > 0) {
          workouts.push({ day: currentDay, exercises: [...currentExercises] });

          if (workouts.length >= count) {
            break;
          }
        }

        currentDay = dayMatch[1]!;
        const restOfLine = dayMatch[2];
        currentExercises = [];

        if (restOfLine && restOfLine.trim()) {
          currentExercises.push(restOfLine.trim());
        }
        continue;
      }

      const exerciseMatch = exercisePattern.exec(trimmedLine);
      if (exerciseMatch && currentDay) {
        currentExercises.push(exerciseMatch[1]!.trim());
      }
    }

    if (currentDay && currentExercises.length > 0 && workouts.length < count) {
      workouts.push({ day: currentDay, exercises: [...currentExercises] });
    }

    return workouts;
  }
}