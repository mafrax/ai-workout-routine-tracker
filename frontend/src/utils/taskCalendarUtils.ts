import { CalendarDay, TaskCompletionRecord, WeekDayData } from '../types/dailyTasks';

/**
 * Format date as YYYY-MM-DD
 */
export function formatDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get today's date as YYYY-MM-DD
 */
export function getTodayString(): string {
  return formatDateString(new Date());
}

/**
 * Check if two date strings are the same
 */
export function isSameDate(date1: string, date2: string): boolean {
  return date1 === date2;
}

/**
 * Generate calendar days for a given month
 */
export function generateCalendarDays(
  year: number,
  month: number,
  completionRecords: TaskCompletionRecord[]
): CalendarDay[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();

  // Get day of week for first day (0 = Sunday)
  const firstDayOfWeek = firstDay.getDay();

  // Calculate days from previous month to show
  const daysFromPrevMonth = firstDayOfWeek;
  const prevMonthLastDay = new Date(year, month, 0).getDate();

  // Calculate days from next month to show
  const totalCells = Math.ceil((daysInMonth + daysFromPrevMonth) / 7) * 7;
  const daysFromNextMonth = totalCells - (daysInMonth + daysFromPrevMonth);

  const days: CalendarDay[] = [];
  const today = getTodayString();

  // Create a map for quick lookup of completion records
  const recordMap = new Map<string, TaskCompletionRecord>();
  completionRecords.forEach(record => {
    recordMap.set(record.recordDate, record);
  });

  // Previous month days
  for (let i = daysFromPrevMonth - 1; i >= 0; i--) {
    const day = prevMonthLastDay - i;
    const date = new Date(year, month - 1, day);
    const dateString = formatDateString(date);
    const record = recordMap.get(dateString);

    days.push({
      dateString,
      tasksCompleted: record?.tasksCompleted || 0,
      tasksTotal: record?.tasksTotal || 0,
      completionRate: record?.completionRate || 0,
      hasAnyCompletion: (record?.tasksCompleted || 0) > 0,
      isPerfect: record?.completionRate === 100,
      isToday: dateString === today,
      isCurrentMonth: false
    });
  }

  // Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dateString = formatDateString(date);
    const record = recordMap.get(dateString);

    days.push({
      dateString,
      tasksCompleted: record?.tasksCompleted || 0,
      tasksTotal: record?.tasksTotal || 0,
      completionRate: record?.completionRate || 0,
      hasAnyCompletion: (record?.tasksCompleted || 0) > 0,
      isPerfect: record?.completionRate === 100,
      isToday: dateString === today,
      isCurrentMonth: true
    });
  }

  // Next month days
  for (let day = 1; day <= daysFromNextMonth; day++) {
    const date = new Date(year, month + 1, day);
    const dateString = formatDateString(date);
    const record = recordMap.get(dateString);

    days.push({
      dateString,
      tasksCompleted: record?.tasksCompleted || 0,
      tasksTotal: record?.tasksTotal || 0,
      completionRate: record?.completionRate || 0,
      hasAnyCompletion: (record?.tasksCompleted || 0) > 0,
      isPerfect: record?.completionRate === 100,
      isToday: dateString === today,
      isCurrentMonth: false
    });
  }

  return days;
}

/**
 * Generate week data (last 7 days)
 */
export function generateWeekData(
  completionRecords: TaskCompletionRecord[]
): WeekDayData[] {
  const weekData: WeekDayData[] = [];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Create a map for quick lookup
  const recordMap = new Map<string, TaskCompletionRecord>();
  completionRecords.forEach(record => {
    recordMap.set(record.recordDate, record);
  });

  // Generate last 7 days
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateString = formatDateString(date);
    const dayName = dayNames[date.getDay()];
    const record = recordMap.get(dateString);

    weekData.push({
      date: dateString,
      dayName,
      tasksCompleted: record?.tasksCompleted || 0,
      tasksTotal: record?.tasksTotal || 0,
      completionRate: record?.completionRate || 0
    });
  }

  return weekData;
}

/**
 * Get month name from month number (0-11)
 */
export function getMonthName(month: number): string {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return monthNames[month];
}

/**
 * Get completion color based on completion rate
 */
export function getCompletionColor(completionRate: number): string {
  if (completionRate === 100) return 'var(--ion-color-success)';
  if (completionRate >= 75) return 'var(--ion-color-success-tint)';
  if (completionRate >= 50) return 'var(--ion-color-warning)';
  if (completionRate >= 25) return 'var(--ion-color-warning-tint)';
  if (completionRate > 0) return 'var(--ion-color-danger-tint)';
  return 'var(--ion-color-light)';
}

/**
 * Get completion intensity for calendar cells (0-1 scale)
 */
export function getCompletionIntensity(completionRate: number): number {
  return completionRate / 100;
}
