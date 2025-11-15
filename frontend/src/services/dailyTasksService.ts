import axios from 'axios';
import {
  DailyTask,
  TaskStats,
  AggregateStats,
  TaskCompletionRecord
} from '../types/dailyTasks';

// Use environment variable for API URL (defaults to production if not set)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://workout-marcs-projects-3a713b55.vercel.app/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Backend API calls
const dailyTasksApi = {
  getUserTasks: async (userId: number): Promise<DailyTask[]> => {
    const response = await api.get(`/daily-tasks/user/${userId}`);
    return response.data;
  },

  createTask: async (userId: number, title: string): Promise<DailyTask> => {
    const response = await api.post(`/daily-tasks/user/${userId}`, { title });
    return response.data;
  },

  toggleTask: async (taskId: number): Promise<DailyTask> => {
    const response = await api.put(`/daily-tasks/${taskId}/toggle`);
    return response.data;
  },

  deleteTask: async (taskId: number): Promise<void> => {
    await api.delete(`/daily-tasks/${taskId}`);
  },

  resetTasks: async (userId: number): Promise<void> => {
    await api.post(`/daily-tasks/user/${userId}/reset`);
  },

  getAggregateStats: async (userId: number): Promise<AggregateStats> => {
    const response = await api.get(`/daily-tasks/user/${userId}/stats`);
    return response.data;
  },

  getTaskStats: async (taskId: number): Promise<TaskStats> => {
    const response = await api.get(`/daily-tasks/${taskId}/stats`);
    return response.data;
  },

  getCompletionHistory: async (userId: number, days: number = 30): Promise<TaskCompletionRecord[]> => {
    const response = await api.get(`/daily-tasks/user/${userId}/history?days=${days}`);
    return response.data;
  },

  getTaskCompletionDates: async (taskId: number): Promise<string[]> => {
    const response = await api.get(`/daily-tasks/${taskId}/completion-dates`);
    return response.data.dates;
  }
};

// Service functions - now primarily backend-driven
export const dailyTasksService = {
  // Load tasks from backend
  loadTasks: async (userId: number): Promise<DailyTask[]> => {
    try {
      const tasks = await dailyTasksApi.getUserTasks(userId);
      return tasks;
    } catch (error) {
      console.error('Failed to load tasks from backend:', error);
      throw error;
    }
  },

  // Add task via backend
  addTask: async (userId: number, title: string): Promise<DailyTask> => {
    try {
      const task = await dailyTasksApi.createTask(userId, title);
      return task;
    } catch (error) {
      console.error('Failed to add task:', error);
      throw error;
    }
  },

  // Toggle task via backend
  toggleTask: async (taskId: number): Promise<DailyTask> => {
    try {
      const task = await dailyTasksApi.toggleTask(taskId);
      return task;
    } catch (error) {
      console.error('Failed to toggle task:', error);
      throw error;
    }
  },

  // Delete task via backend
  deleteTask: async (taskId: number): Promise<void> => {
    try {
      await dailyTasksApi.deleteTask(taskId);
    } catch (error) {
      console.error('Failed to delete task:', error);
      throw error;
    }
  },

  // Reset all tasks (midnight reset)
  resetAllTasks: async (userId: number): Promise<void> => {
    try {
      await dailyTasksApi.resetTasks(userId);
    } catch (error) {
      console.error('Failed to reset tasks:', error);
      throw error;
    }
  },

  // Get aggregate stats
  getAggregateStats: async (userId: number): Promise<AggregateStats> => {
    try {
      const stats = await dailyTasksApi.getAggregateStats(userId);
      return stats;
    } catch (error) {
      console.error('Failed to get aggregate stats:', error);
      throw error;
    }
  },

  // Get task-specific stats
  getTaskStats: async (taskId: number): Promise<TaskStats> => {
    try {
      const stats = await dailyTasksApi.getTaskStats(taskId);
      return stats;
    } catch (error) {
      console.error('Failed to get task stats:', error);
      throw error;
    }
  },

  // Get completion history
  getCompletionHistory: async (userId: number, days: number = 30): Promise<TaskCompletionRecord[]> => {
    try {
      const history = await dailyTasksApi.getCompletionHistory(userId, days);
      return history;
    } catch (error) {
      console.error('Failed to get completion history:', error);
      throw error;
    }
  },

  // Get task completion dates
  getTaskCompletionDates: async (taskId: number): Promise<string[]> => {
    try {
      const dates = await dailyTasksApi.getTaskCompletionDates(taskId);
      return dates;
    } catch (error) {
      console.error('Failed to get task completion dates:', error);
      throw error;
    }
  }
};