import { DailyTask, TaskCompletionRecord } from '@prisma/client';
import prisma from '../lib/database';

export interface TaskStats {
  taskId: number;
  title: string;
  currentStreak: number;
  bestStreak: number;
  totalCompletions: number;
  lastCompletedDate: string | null;
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

export interface DailyTaskWithStats extends DailyTask {
  currentStreak: number;
  bestStreak: number;
  totalCompletions: number;
  lastCompletedDate: string | null;
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

  // Calculate streak from completion dates
  private calculateStreak(completionDates: string[]): { currentStreak: number; bestStreak: number } {
    if (completionDates.length === 0) {
      return { currentStreak: 0, bestStreak: 0 };
    }

    // Sort dates in descending order (newest first)
    const sortedDates = [...completionDates].sort((a, b) => b.localeCompare(a));
    const today = this.formatDateString(new Date());

    let currentStreak = 0;
    let bestStreak = 0;
    let tempStreak = 0;

    // Calculate current streak (from today or yesterday backwards)
    const latestDate = sortedDates[0] || '';
    const daysSinceLatest = this.calculateDaysDifference(latestDate, today);

    if (daysSinceLatest <= 1) {
      // Current streak is active (completed today or yesterday)
      let expectedDate = new Date(today);
      if (daysSinceLatest === 1) {
        expectedDate.setDate(expectedDate.getDate() - 1);
      }

      for (const dateStr of sortedDates) {
        const expected = this.formatDateString(expectedDate);
        if (dateStr === expected) {
          currentStreak++;
          expectedDate.setDate(expectedDate.getDate() - 1);
        } else {
          break;
        }
      }
    }

    // Calculate best streak (iterate through all dates)
    let prevDate: string | null = null;
    for (const dateStr of sortedDates) {
      if (prevDate === null) {
        tempStreak = 1;
      } else {
        const daysDiff = this.calculateDaysDifference(dateStr, prevDate);
        if (daysDiff === 1) {
          tempStreak++;
        } else {
          bestStreak = Math.max(bestStreak, tempStreak);
          tempStreak = 1;
        }
      }
      prevDate = dateStr;
    }
    bestStreak = Math.max(bestStreak, tempStreak);

    return { currentStreak, bestStreak };
  }

  // Calculate completion rate for a date range
  private calculateCompletionRate(completionDates: string[], startDate: Date, endDate: Date): number {
    const startStr = this.formatDateString(startDate);
    const endStr = this.formatDateString(endDate);

    const completionsInRange = completionDates.filter(
      date => date >= startStr && date <= endStr
    ).length;

    const totalDays = this.calculateDaysDifference(startStr, endStr) + 1;

    return totalDays > 0 ? (completionsInRange / totalDays) * 100 : 0;
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

    if (newCompletedState) {
      // Mark task as completed
      await prisma.dailyTaskCompletion.upsert({
        where: {
          taskId_completionDate: {
            taskId: taskId,
            completionDate: today
          }
        },
        create: {
          taskId: taskId,
          completionDate: today
        },
        update: {}
      });
    } else {
      // Mark task as incomplete - remove today's completion
      await prisma.dailyTaskCompletion.deleteMany({
        where: {
          taskId: taskId,
          completionDate: today
        }
      });
    }

    // Update the completed flag
    return prisma.dailyTask.update({
      where: { id: taskId },
      data: { completed: newCompletedState }
    });
  }

  // Get completion dates for a specific task
  async getTaskCompletionDates(taskId: bigint): Promise<string[]> {
    const completions = await prisma.dailyTaskCompletion.findMany({
      where: { taskId },
      orderBy: { completionDate: 'desc' }
    });

    return completions.map(c => c.completionDate);
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

    // Reset all tasks
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

  // Get task with computed stats
  async getTaskWithStats(taskId: bigint): Promise<DailyTaskWithStats> {
    const task = await prisma.dailyTask.findUnique({
      where: { id: taskId },
      include: {
        completions: {
          orderBy: { completionDate: 'desc' }
        }
      }
    });

    if (!task) {
      throw new Error('Task not found');
    }

    const completionDates = task.completions.map(c => c.completionDate);
    const { currentStreak, bestStreak } = this.calculateStreak(completionDates);

    return {
      ...task,
      currentStreak,
      bestStreak,
      totalCompletions: completionDates.length,
      lastCompletedDate: completionDates.length > 0 && completionDates[0] ? completionDates[0] : null
    };
  }

  // Get all tasks with computed stats
  async getUserTasksWithStats(userId: bigint): Promise<DailyTaskWithStats[]> {
    const tasks = await prisma.dailyTask.findMany({
      where: { userId },
      include: {
        completions: {
          orderBy: { completionDate: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return tasks.map(task => {
      const completionDates = task.completions.map(c => c.completionDate);
      const { currentStreak, bestStreak } = this.calculateStreak(completionDates);

      return {
        ...task,
        currentStreak,
        bestStreak,
        totalCompletions: completionDates.length,
        lastCompletedDate: completionDates.length > 0 && completionDates[0] ? completionDates[0] : null
      };
    });
  }

  // Calculate stats for a specific task
  async calculateTaskStats(taskId: bigint): Promise<TaskStats> {
    const task = await this.getTaskWithStats(taskId);

    const completionDates = await this.getTaskCompletionDates(taskId);

    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(now);
    monthAgo.setDate(monthAgo.getDate() - 30);
    const yearAgo = new Date(now);
    yearAgo.setDate(yearAgo.getDate() - 365);

    const weekRate = this.calculateCompletionRate(completionDates, weekAgo, now);
    const monthRate = this.calculateCompletionRate(completionDates, monthAgo, now);
    const yearRate = this.calculateCompletionRate(completionDates, yearAgo, now);

    return {
      taskId: Number(task.id),
      title: task.title,
      currentStreak: task.currentStreak,
      bestStreak: task.bestStreak,
      totalCompletions: task.totalCompletions,
      lastCompletedDate: task.lastCompletedDate,
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
