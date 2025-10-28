import { DailyTask } from '@prisma/client';
import prisma from '../lib/database';

export class DailyTaskService {
  async getUserTasks(userId: bigint): Promise<DailyTask[]> {
    return prisma.dailyTask.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getIncompleteTasks(userId: bigint): Promise<DailyTask[]> {
    return prisma.dailyTask.findMany({
      where: { 
        userId,
        completed: false
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async createTask(userId: bigint, title: string): Promise<DailyTask> {
    return prisma.dailyTask.create({
      data: {
        userId,
        title,
        completed: false,
        createdAt: new Date()
      }
    });
  }

  async toggleTask(taskId: bigint): Promise<DailyTask> {
    const task = await prisma.dailyTask.findUnique({
      where: { id: taskId }
    });

    if (!task) {
      throw new Error('Task not found');
    }

    return prisma.dailyTask.update({
      where: { id: taskId },
      data: { completed: !task.completed }
    });
  }

  async deleteTask(taskId: bigint): Promise<void> {
    await prisma.dailyTask.delete({
      where: { id: taskId }
    });
  }

  async resetAllTasks(userId: bigint): Promise<void> {
    const now = new Date();
    
    await prisma.dailyTask.updateMany({
      where: { userId },
      data: {
        completed: false,
        lastResetAt: now
      }
    });
  }

  async checkAndResetTasksIfNeeded(userId: bigint): Promise<void> {
    const tasks = await this.getUserTasks(userId);

    if (tasks.length === 0) {
      return;
    }

    const now = new Date();
    const today = now.toISOString().split('T')[0]; // Get YYYY-MM-DD

    // Check if any task was reset today
    const needsReset = !tasks.some(task => {
      if (!task.lastResetAt) return false;
      const lastResetDate = task.lastResetAt.toISOString().split('T')[0];
      return lastResetDate === today;
    });

    if (needsReset) {
      await this.resetAllTasks(userId);
    }
  }
}