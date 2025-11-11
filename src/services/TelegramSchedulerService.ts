import * as cron from 'node-cron';
import { DailyTaskService } from './DailyTaskService';
import { TelegramService } from './TelegramService';
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
    try {
      // Get all workouts for this plan from the database with exercises
      const workouts = await prisma.workout.findMany({
        where: {
          planId: plan.id
        },
        include: {
          exercises: {
            orderBy: {
              orderIndex: 'asc'
            }
          }
        },
        orderBy: {
          day: 'asc'
        }
      });

      if (workouts.length === 0) {
        console.warn(`No workouts found for plan ${plan.id}`);
        return;
      }

      // Get completed workout days
      let completedDays: number[] = [];
      try {
        if (Array.isArray(plan.completedWorkouts)) {
          completedDays = plan.completedWorkouts;
        } else if (typeof plan.completedWorkouts === 'string') {
          completedDays = JSON.parse(plan.completedWorkouts);
        }
      } catch {
        completedDays = [];
      }

      console.log(`Plan ${plan.id}: ${completedDays.length} completed days:`, completedDays);

      // Find the first uncompleted workout
      const nextWorkout = workouts.find(workout => !completedDays.includes(workout.day));

      if (!nextWorkout) {
        console.log(`All workouts completed for plan ${plan.id}`);
        return;
      }

      console.log(`Next uncompleted workout for plan ${plan.id}: Day ${nextWorkout.day}`);

      // Format exercises from the database
      const exercises = nextWorkout.exercises.map(ex =>
        `${ex.exerciseTitle} - ${ex.numberOfReps} @ ${ex.isBodyweight ? 'bodyweight' : ex.weight + 'kg'}`
      );

      if (exercises.length === 0) {
        exercises.push('No exercises found');
      }

      const sent = await this.telegramService.sendWorkoutPreview(
        plan.userId,
        plan.name,
        `Day ${nextWorkout.day}: ${nextWorkout.muscleGroup}`,
        exercises
      );

      if (sent) {
        console.log(`Sent workout preview for plan ${plan.id}, Day ${nextWorkout.day} to user ${plan.userId}`);
      }
    } catch (error) {
      console.error(`Error in sendWorkoutPreviewForPlan for plan ${plan.id}:`, error);
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
}