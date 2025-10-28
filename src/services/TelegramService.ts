import axios from 'axios';
import { DailyTask } from '@prisma/client';
import { PressureLevel } from '../types';
import prisma from '../lib/database';

export class TelegramService {
  async sendTaskReminder(userId: bigint, incompleteTasks: DailyTask[]): Promise<boolean> {
    try {
      const telegramConfig = await prisma.telegramConfig.findUnique({
        where: { userId }
      });

      if (!telegramConfig?.botToken || !telegramConfig.chatId) {
        console.warn(`No Telegram config found for user ${userId}`);
        return false;
      }

      const currentHour = new Date().getHours();
      const pressureLevel = this.getPressureLevel(currentHour);
      const message = this.generateTaskReminderMessage(incompleteTasks, pressureLevel);

      const success = await this.sendMessage(
        telegramConfig.botToken,
        telegramConfig.chatId,
        message
      );

      if (success) {
        // Update last reminder sent timestamp
        await prisma.telegramConfig.update({
          where: { userId },
          data: { lastTaskReminderSent: new Date() }
        });
      }

      return success;
    } catch (error) {
      console.error(`Error sending task reminder for user ${userId}:`, error);
      return false;
    }
  }

  async sendWorkoutPreview(
    userId: bigint,
    planName: string,
    dayName: string,
    exercises: string[]
  ): Promise<boolean> {
    try {
      const telegramConfig = await prisma.telegramConfig.findUnique({
        where: { userId }
      });

      if (!telegramConfig?.botToken || !telegramConfig.chatId) {
        console.warn(`No Telegram config found for user ${userId}`);
        return false;
      }

      const message = this.generateWorkoutPreviewMessage(planName, dayName, exercises);

      return await this.sendMessage(
        telegramConfig.botToken,
        telegramConfig.chatId,
        message
      );
    } catch (error) {
      console.error(`Error sending workout preview for user ${userId}:`, error);
      return false;
    }
  }

  private async sendMessage(botToken: string, chatId: string, message: string): Promise<boolean> {
    try {
      const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
      
      await axios.post(url, {
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown'
      });

      return true;
    } catch (error) {
      console.error('Error sending Telegram message:', error);
      return false;
    }
  }

  private getPressureLevel(hour: number): PressureLevel {
    if (hour < 12) return PressureLevel.GENTLE;   // Morning: encouraging
    if (hour < 15) return PressureLevel.MODERATE; // Afternoon: assertive
    if (hour < 18) return PressureLevel.URGENT;   // Evening: strong
    return PressureLevel.CRITICAL;                // Night: maximum pressure
  }

  private generateTaskReminderMessage(tasks: DailyTask[], pressureLevel: PressureLevel): string {
    const taskList = tasks.map(task => `• ${task.title}`).join('\n');
    const taskCount = tasks.length;
    const taskWord = taskCount === 1 ? 'task' : 'tasks';

    const pressureMessages = {
      [PressureLevel.GENTLE]: {
        emoji: '💪',
        greeting: 'Good morning!',
        message: 'Time to get things done.'
      },
      [PressureLevel.MODERATE]: {
        emoji: '⚡',
        greeting: 'Hey!',
        message: "Don't forget about your tasks today."
      },
      [PressureLevel.URGENT]: {
        emoji: '🔥',
        greeting: 'Time is running out!',
        message: 'Complete your tasks now!'
      },
      [PressureLevel.CRITICAL]: {
        emoji: '🚨',
        greeting: '⚠️ URGENT:',
        message: 'Complete your tasks before the day ends!'
      }
    };

    const pressure = pressureMessages[pressureLevel];

    return `${pressure.emoji} *${pressure.greeting}* ${pressure.message}

You have ${taskCount} incomplete ${taskWord}:

${taskList}

💯 Let's get them done!`;
  }

  private generateWorkoutPreviewMessage(planName: string, dayName: string, exercises: string[]): string {
    const exerciseList = exercises.map(exercise => `• ${exercise}`).join('\n');

    return `🏋️‍♂️ *Workout Preview*

**Plan:** ${planName}
**${dayName}**

${exerciseList}

💪 Ready to crush it?`;
  }
}