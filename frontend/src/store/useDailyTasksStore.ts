import { create } from 'zustand';
import {
  DailyTask,
  TaskStats,
  AggregateStats,
  TaskCompletionRecord,
  CalendarDay,
  WeekDayData,
  ViewMode,
  DailyTasksState
} from '../types/dailyTasks';
import { dailyTasksService } from '../services/dailyTasksService';
import {
  generateCalendarDays,
  generateWeekData
} from '../utils/taskCalendarUtils';
import { useStore } from './useStore';

// Get userId from global Zustand state
const getUserId = (): number | null => {
  return useStore.getState().user?.id || null;
};

export const useDailyTasksStore = create<DailyTasksState>((set, get) => ({
  // Initial state
  tasks: [],
  stats: null,
  selectedTaskId: null,
  viewMode: 'aggregate',
  completionHistory: [],
  isLoading: false,
  loadingItems: new Set(),
  error: null,

  // Loading management
  setLoading: (item: string, loading: boolean) => {
    set((state) => {
      const newLoadingItems = new Set(state.loadingItems);
      if (loading) {
        newLoadingItems.add(item);
      } else {
        newLoadingItems.delete(item);
      }
      return {
        loadingItems: newLoadingItems,
        isLoading: newLoadingItems.size > 0
      };
    });
  },

  // View mode management
  setViewMode: (mode: ViewMode) => {
    set({ viewMode: mode });
  },

  // Task selection
  setSelectedTask: (taskId: number | null) => {
    set({ selectedTaskId: taskId });
  },

  // Error management
  setError: (error: string | null) => {
    set({ error });
  },

  // Load tasks from backend
  loadTasks: async () => {
    const userId = getUserId();
    if (!userId) {
      console.warn('No user ID available, cannot load tasks');
      return;
    }

    get().setLoading('loadTasks', true);
    get().setError(null);

    try {
      const tasks = await dailyTasksService.loadTasks(userId);
      set({ tasks });
    } catch (error) {
      console.error('Failed to load tasks:', error);
      get().setError('Failed to load tasks');
    } finally {
      get().setLoading('loadTasks', false);
    }
  },

  // Load aggregate stats
  loadStats: async () => {
    const userId = getUserId();
    if (!userId) {
      console.warn('No user ID available, cannot load stats');
      return;
    }

    get().setLoading('loadStats', true);
    get().setError(null);

    try {
      const stats = await dailyTasksService.getAggregateStats(userId);
      set({ stats });
    } catch (error) {
      console.error('Failed to load stats:', error);
      get().setError('Failed to load stats');
    } finally {
      get().setLoading('loadStats', false);
    }
  },

  // Load completion history
  loadHistory: async (days: number = 30) => {
    const userId = getUserId();
    if (!userId) {
      console.warn('No user ID available, cannot load history');
      return;
    }

    get().setLoading('loadHistory', true);
    get().setError(null);

    try {
      const history = await dailyTasksService.getCompletionHistory(userId, days);
      set({ completionHistory: history });
    } catch (error) {
      console.error('Failed to load history:', error);
      get().setError('Failed to load history');
    } finally {
      get().setLoading('loadHistory', false);
    }
  },

  // Refresh all data
  refresh: async () => {
    await Promise.all([
      get().loadTasks(),
      get().loadStats(),
      get().loadHistory()
    ]);
  },

  // Add new task
  addTask: async (title: string) => {
    const userId = getUserId();
    if (!userId) {
      console.warn('No user ID available, cannot add task');
      return;
    }

    get().setLoading('addTask', true);
    get().setError(null);

    try {
      const newTask = await dailyTasksService.addTask(userId, title);

      // Optimistically add to local state
      set((state) => ({
        tasks: [...state.tasks, newTask]
      }));

      // Refresh stats since we added a task
      await get().loadStats();
    } catch (error) {
      console.error('Failed to add task:', error);
      get().setError('Failed to add task');
      // Reload to ensure consistency
      await get().loadTasks();
    } finally {
      get().setLoading('addTask', false);
    }
  },

  // Toggle task completion
  toggleTask: async (taskId: number) => {
    get().setLoading('toggleTask', true);
    get().setError(null);

    try {
      const updatedTask = await dailyTasksService.toggleTask(taskId);

      // Update local state with new task data (includes updated streaks)
      set((state) => ({
        tasks: state.tasks.map((task) =>
          task.id === taskId ? updatedTask : task
        )
      }));

      // Refresh stats and history to reflect changes
      await Promise.all([
        get().loadStats(),
        get().loadHistory()
      ]);
    } catch (error) {
      console.error('Failed to toggle task:', error);
      get().setError('Failed to toggle task');
      // Reload to ensure consistency
      await get().loadTasks();
    } finally {
      get().setLoading('toggleTask', false);
    }
  },

  // Delete task
  deleteTask: async (taskId: number) => {
    get().setLoading('deleteTask', true);
    get().setError(null);

    try {
      await dailyTasksService.deleteTask(taskId);

      // Optimistically remove from local state
      set((state) => ({
        tasks: state.tasks.filter((task) => task.id !== taskId),
        selectedTaskId: state.selectedTaskId === taskId ? null : state.selectedTaskId
      }));

      // Refresh stats since we deleted a task
      await get().loadStats();
    } catch (error) {
      console.error('Failed to delete task:', error);
      get().setError('Failed to delete task');
      // Reload to ensure consistency
      await get().loadTasks();
    } finally {
      get().setLoading('deleteTask', false);
    }
  },

  // Get stats for a specific task
  getTaskStats: (taskId: number): TaskStats | null => {
    const task = get().tasks.find((t) => t.id === taskId);
    if (!task) return null;

    // For now, return basic stats from the task object
    // In the future, you could fetch full stats from backend if needed
    return {
      taskId: task.id,
      title: task.title,
      currentStreak: task.currentStreak,
      bestStreak: task.bestStreak,
      totalCompletions: task.totalCompletions,
      weekRate: 0, // Would need to calculate or fetch from backend
      monthRate: 0,
      yearRate: 0
    };
  },

  // Get aggregate stats
  getAggregateStats: (): AggregateStats | null => {
    return get().stats;
  },

  // Get calendar days for a specific month
  getCalendarDays: (year: number, month: number): CalendarDay[] => {
    const history = get().completionHistory;
    return generateCalendarDays(year, month, history);
  },

  // Get week data (last 7 days)
  getWeekData: (): WeekDayData[] => {
    const history = get().completionHistory;
    return generateWeekData(history);
  }
}));
