export interface DailyTask {
  id: number;
  userId: number;
  title: string;
  completed: boolean;
  createdAt: string;
  currentStreak: number;
  bestStreak: number;
  totalCompletions: number;
  lastCompletedDate: string | null;
}

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

export interface TaskCompletionRecord {
  id: number;
  userId: number;
  recordDate: string; // YYYY-MM-DD
  tasksTotal: number;
  tasksCompleted: number;
  completionRate: number; // 0-100
  createdAt: string;
}

export interface CalendarDay {
  dateString: string; // YYYY-MM-DD
  tasksCompleted: number;
  tasksTotal: number;
  completionRate: number; // 0-100
  hasAnyCompletion: boolean;
  isPerfect: boolean; // 100% completion
  isToday: boolean;
  isCurrentMonth: boolean;
}

export interface WeekDayData {
  date: string; // YYYY-MM-DD
  dayName: string; // Mon, Tue, etc.
  tasksCompleted: number;
  tasksTotal: number;
  completionRate: number; // 0-100
}

export type ViewMode = 'aggregate' | 'per-task';

export interface DailyTasksState {
  // State
  tasks: DailyTask[];
  stats: AggregateStats | null;
  selectedTaskId: number | null;
  viewMode: ViewMode;
  completionHistory: TaskCompletionRecord[];
  taskCompletionDates: Record<number, string[]>; // taskId -> completion dates
  isLoading: boolean;
  loadingItems: Set<string>;
  error: string | null;

  // Actions
  setLoading: (item: string, loading: boolean) => void;
  setViewMode: (mode: ViewMode) => void;
  setSelectedTask: (taskId: number | null) => void;
  setError: (error: string | null) => void;

  // Data loading
  loadTasks: () => Promise<void>;
  loadStats: () => Promise<void>;
  loadHistory: (days?: number) => Promise<void>;
  loadTaskCompletionDates: (taskId: number) => Promise<void>;
  refresh: () => Promise<void>;

  // Task operations
  addTask: (title: string) => Promise<void>;
  toggleTask: (taskId: number) => Promise<void>;
  deleteTask: (taskId: number) => Promise<void>;

  // Computed helpers
  getTaskStats: (taskId: number) => TaskStats | null;
  getAggregateStats: () => AggregateStats | null;
  getCalendarDays: (year: number, month: number) => CalendarDay[];
  getWeekData: () => WeekDayData[];
  getTaskCompletionDates: (taskId: number) => string[];
}
