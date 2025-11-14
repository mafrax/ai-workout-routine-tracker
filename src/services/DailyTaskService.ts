import { DailyTask, TaskCompletionRecord } from '@prisma/client';
import prisma from '../lib/database';

export interface TaskStats {
  taskId: number;
  title: string;
  currentStreak: number;
  bestStreak: number;
  totalCompletions: number;
  weekRate: number;
  monthRate: number;
  yearRate: number;
}

export interface AggregateStats {
  totalTasks: number;
  activeDaysStreak: number;
  perfectDays: number;
  weekRate: number;
  monthRate: number;
  yearRate: number;
}

export class DailyTaskService {
  // Utility: Format date as YYYY-MM-DD
  private formatDateString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Utility: Calculate days difference
  private calculateDaysDifference(date1Str: string, date2Str: string): number {
    const date1 = new Date(date1Str);
    const date2 = new Date(date2Str);
    const diffTime = Math.abs(date2.getTime() - date1.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }
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

    const newCompletedState = !task.completed;
    const today = this.formatDateString(new Date());

    // Calculate new streak values
    let updateData: any = { completed: newCompletedState };

    if (newCompletedState) {
      // Completing the task
      if (!task.lastCompletedDate) {
        // First time completing
        updateData.currentStreak = 1;
        updateData.bestStreak = 1;
        updateData.totalCompletions = task.totalCompletions + 1;
        updateData.lastCompletedDate = today;
        updateData.completedAt = new Date();
      } else if (task.lastCompletedDate === today) {
        // Already completed today - shouldn't happen, but handle gracefully
        return task;
      } else {
        // Calculate gap
        const daysDiff = this.calculateDaysDifference(task.lastCompletedDate, today);

        let newStreak: number;
        if (daysDiff === 1) {
          // Consecutive day
          newStreak = task.currentStreak + 1;
        } else {
          // Gap detected - reset
          newStreak = 1;
        }

        updateData.currentStreak = newStreak;
        updateData.bestStreak = Math.max(task.bestStreak, newStreak);
        updateData.totalCompletions = task.totalCompletions + 1;
        updateData.lastCompletedDate = today;
        updateData.completedAt = new Date();
      }
    } else {
      // Uncompleting the task (same day only)
      if (task.lastCompletedDate === today && task.completedAt) {
        // Reverting today's completion
        updateData.totalCompletions = Math.max(0, task.totalCompletions - 1);
        updateData.completedAt = null;

        // Try to restore previous streak (simplified: if we can't determine, set to 0)
        // In production, you might want to recalculate from history
        if (task.currentStreak > 1) {
          updateData.currentStreak = task.currentStreak - 1;
        } else {
          updateData.currentStreak = 0;
        }
        // Don't change lastCompletedDate - we'll recalculate on next completion
      }
    }

    return prisma.dailyTask.update({
      where: { id: taskId },
      data: updateData
    });
  }

  async deleteTask(taskId: bigint): Promise<void> {
    await prisma.dailyTask.delete({
      where: { id: taskId }
    });
  }

  async resetAllTasks(userId: bigint): Promise<void> {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = this.formatDateString(yesterday);

    // Get all tasks before reset
    const tasks = await this.getUserTasks(userId);

    // Create completion record for yesterday
    if (tasks.length > 0) {
      const tasksCompleted = tasks.filter(t => t.completed).length;
      const tasksTotal = tasks.length;
      const completionRate = tasksTotal > 0 ? (tasksCompleted / tasksTotal) * 100 : 0;

      await prisma.taskCompletionRecord.upsert({
        where: {
          userId_recordDate: {
            userId,
            recordDate: yesterdayStr
          }
        },
        create: {
          userId,
          recordDate: yesterdayStr,
          tasksTotal,
          tasksCompleted,
          completionRate
        },
        update: {
          tasksTotal,
          tasksCompleted,
          completionRate
        }
      });
    }

    // Reset all tasks (preserve streak data)
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

  // Calculate stats for a specific task
  async calculateTaskStats(taskId: bigint): Promise<TaskStats> {
    const task = await prisma.dailyTask.findUnique({
      where: { id: taskId }
    });

    if (!task) {
      throw new Error('Task not found');
    }

    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(now);
    monthAgo.setDate(monthAgo.getDate() - 30);
    const yearAgo = new Date(now);
    yearAgo.setDate(yearAgo.getDate() - 365);

    // Get completion records for this user
    const records = await prisma.taskCompletionRecord.findMany({
      where: {
        userId: task.userId,
        recordDate: {
          gte: this.formatDateString(yearAgo)
        }
      },
      orderBy: { recordDate: 'asc' }
    });

    // Calculate completion rates (simplified - assumes task existed for full period)
    const weekRecords = records.filter(r => r.recordDate >= this.formatDateString(weekAgo));
    const monthRecords = records.filter(r => r.recordDate >= this.formatDateString(monthAgo));
    const yearRecords = records;

    // For individual task rates, we'd ideally track per-task completion in records
    // For now, use aggregate rates as approximation
    const weekRate = weekRecords.length > 0
      ? weekRecords.reduce((sum, r) => sum + r.completionRate, 0) / weekRecords.length
      : 0;
    const monthRate = monthRecords.length > 0
      ? monthRecords.reduce((sum, r) => sum + r.completionRate, 0) / monthRecords.length
      : 0;
    const yearRate = yearRecords.length > 0
      ? yearRecords.reduce((sum, r) => sum + r.completionRate, 0) / yearRecords.length
      : 0;

    return {
      taskId: Number(task.id),
      title: task.title,
      currentStreak: task.currentStreak,
      bestStreak: task.bestStreak,
      totalCompletions: task.totalCompletions,
      weekRate,
      monthRate,
      yearRate
    };
  }

  // Calculate aggregate stats for all tasks
  async calculateAggregateStats(userId: bigint): Promise<AggregateStats> {
    const tasks = await this.getUserTasks(userId);

    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(now);
    monthAgo.setDate(monthAgo.getDate() - 30);
    const yearAgo = new Date(now);
    yearAgo.setDate(yearAgo.getDate() - 365);

    // Get completion records
    const records = await prisma.taskCompletionRecord.findMany({
      where: {
        userId,
        recordDate: {
          gte: this.formatDateString(yearAgo)
        }
      },
      orderBy: { recordDate: 'desc' }
    });

    // Calculate active days streak (consecutive days with at least 1 completion)
    let activeDaysStreak = 0;
    const today = this.formatDateString(now);
    for (let i = 0; i < records.length; i++) {
      const expectedDate = new Date(now);
      expectedDate.setDate(expectedDate.getDate() - i);
      const expectedDateStr = this.formatDateString(expectedDate);

      const record = records.find(r => r.recordDate === expectedDateStr);
      if (record && record.tasksCompleted > 0) {
        activeDaysStreak++;
      } else {
        break;
      }
    }

    // Calculate perfect days (100% completion)
    const perfectDays = records.filter(r => r.completionRate === 100).length;

    // Calculate completion rates
    const weekRecords = records.filter(r => r.recordDate >= this.formatDateString(weekAgo));
    const monthRecords = records.filter(r => r.recordDate >= this.formatDateString(monthAgo));
    const yearRecords = records;

    const calculateRate = (recs: TaskCompletionRecord[]) => {
      if (recs.length === 0) return 0;
      const totalCompleted = recs.reduce((sum, r) => sum + r.tasksCompleted, 0);
      const totalPossible = recs.reduce((sum, r) => sum + r.tasksTotal, 0);
      return totalPossible > 0 ? (totalCompleted / totalPossible) * 100 : 0;
    };

    return {
      totalTasks: tasks.length,
      activeDaysStreak,
      perfectDays,
      weekRate: calculateRate(weekRecords),
      monthRate: calculateRate(monthRecords),
      yearRate: calculateRate(yearRecords)
    };
  }

  // Get completion history
  async getCompletionHistory(userId: bigint, days: number = 30): Promise<TaskCompletionRecord[]> {
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - days);

    return prisma.taskCompletionRecord.findMany({
      where: {
        userId,
        recordDate: {
          gte: this.formatDateString(startDate)
        }
      },
      orderBy: { recordDate: 'desc' }
    });
  }
}