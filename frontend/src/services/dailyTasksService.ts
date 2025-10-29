import axios from 'axios';

// Use the same backend URL as other services (stable production URL)
const API_BASE_URL = 'https://workout-marcs-projects-3a713b55.vercel.app/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface DailyTask {
  id: number;
  title: string;
  completed: boolean;
  createdAt: string;
  backendId?: number; // Store backend ID for syncing
}

// Backend API calls
const dailyTasksApi = {
  getUserTasks: async (userId: number) => {
    const response = await api.get(`/daily-tasks/user/${userId}`);
    return response.data;
  },
  
  createTask: async (userId: number, title: string) => {
    const response = await api.post(`/daily-tasks/user/${userId}`, { title });
    return response.data;
  },
  
  toggleTask: async (taskId: number) => {
    const response = await api.put(`/daily-tasks/${taskId}/toggle`);
    return response.data;
  },
  
  deleteTask: async (taskId: number) => {
    await api.delete(`/daily-tasks/${taskId}`);
  },
  
  resetTasks: async (userId: number) => {
    const response = await api.post(`/daily-tasks/user/${userId}/reset`);
    return response.data;
  }
};

// Hybrid service functions that sync to both local storage and backend
export const dailyTasksService = {
  // Load tasks from local storage (primary) with backend sync
  loadTasks: async (userId?: number): Promise<DailyTask[]> => {
    // Load from localStorage first (fast)
    const stored = localStorage.getItem('dailyTasks');
    let localTasks: DailyTask[] = stored ? JSON.parse(stored) : [];
    
    // Also try to sync from backend if user is available
    if (userId) {
      try {
        const backendTasks = await dailyTasksApi.getUserTasks(userId);
        // Backend tasks override local if they exist
        if (backendTasks && backendTasks.length > 0) {
          // Map backend tasks to local format with backend IDs
          const mappedTasks = backendTasks.map((task: any) => ({
            id: task.id || Date.now() + Math.random(), // Use backend ID or generate local ID
            title: task.title,
            completed: task.completed,
            createdAt: task.createdAt || new Date().toISOString(),
            backendId: task.id // Store backend ID for future syncing
          }));
          console.log('Synced tasks from backend:', mappedTasks.length);
          localStorage.setItem('dailyTasks', JSON.stringify(mappedTasks));
          return mappedTasks;
        }
      } catch (error) {
        console.warn('Failed to sync tasks from backend, using local:', error);
      }
    }
    
    return localTasks;
  },

  // Save tasks to both local storage and backend
  saveTasks: async (tasks: DailyTask[], userId?: number): Promise<void> => {
    // Save to local storage first (immediate)
    localStorage.setItem('dailyTasks', JSON.stringify(tasks));
    
    // Note: Full sync to backend would require individual API calls for each task
    // For now, we'll rely on individual operations (add, toggle, delete) to sync
    console.log('Tasks saved to local storage:', tasks.length);
  },

  // Add task to both local storage and backend
  addTask: async (title: string, userId?: number): Promise<DailyTask> => {
    const newTask: DailyTask = {
      id: Date.now(),
      title,
      completed: false,
      createdAt: new Date().toISOString(),
    };

    // Sync to backend first to get backend ID
    if (userId) {
      try {
        const backendTask = await dailyTasksApi.createTask(userId, title);
        newTask.backendId = backendTask.id;
        console.log('Task synced to backend with ID:', backendTask.id);
      } catch (error) {
        console.warn('Failed to sync new task to backend:', error);
      }
    }

    // Add to local storage with backend ID
    const currentTasks = await dailyTasksService.loadTasks(userId);
    const updatedTasks = [...currentTasks, newTask];
    localStorage.setItem('dailyTasks', JSON.stringify(updatedTasks));

    return newTask;
  },

  // Toggle task in both local storage and backend
  toggleTask: async (taskId: number, userId?: number): Promise<void> => {
    // Find the task to get its backend ID
    const currentTasks = await dailyTasksService.loadTasks(userId);
    const task = currentTasks.find(t => t.id === taskId);
    
    // Update local storage first
    const updatedTasks = currentTasks.map(task =>
      task.id === taskId ? { ...task, completed: !task.completed } : task
    );
    localStorage.setItem('dailyTasks', JSON.stringify(updatedTasks));

    // Sync to backend using backend ID
    if (userId && task?.backendId) {
      try {
        await dailyTasksApi.toggleTask(task.backendId);
        console.log('Task toggle synced to backend with ID:', task.backendId);
      } catch (error) {
        console.warn('Failed to sync task toggle to backend:', error);
      }
    } else if (userId && !task?.backendId) {
      console.warn('Task has no backend ID, cannot sync toggle:', taskId);
    }
  },

  // Delete task from both local storage and backend
  deleteTask: async (taskId: number, userId?: number): Promise<void> => {
    // Find the task to get its backend ID
    const currentTasks = await dailyTasksService.loadTasks(userId);
    const task = currentTasks.find(t => t.id === taskId);
    
    // Update local storage first
    const updatedTasks = currentTasks.filter(task => task.id !== taskId);
    localStorage.setItem('dailyTasks', JSON.stringify(updatedTasks));

    // Sync to backend using backend ID
    if (userId && task?.backendId) {
      try {
        await dailyTasksApi.deleteTask(task.backendId);
        console.log('Task deletion synced to backend with ID:', task.backendId);
      } catch (error) {
        console.warn('Failed to sync task deletion to backend:', error);
      }
    } else if (userId && !task?.backendId) {
      console.warn('Task has no backend ID, cannot sync deletion:', taskId);
    }
  },

  // Reset all tasks (midnight reset)
  resetAllTasks: async (userId?: number): Promise<void> => {
    // Update local storage first
    const currentTasks = await dailyTasksService.loadTasks(userId);
    const updatedTasks = currentTasks.map(task => ({ ...task, completed: false }));
    localStorage.setItem('dailyTasks', JSON.stringify(updatedTasks));

    // Sync to backend
    if (userId) {
      try {
        await dailyTasksApi.resetTasks(userId);
        console.log('Task reset synced to backend');
      } catch (error) {
        console.warn('Failed to sync task reset to backend:', error);
      }
    }
  }
};