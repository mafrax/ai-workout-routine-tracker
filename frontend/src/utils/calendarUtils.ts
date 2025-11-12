import { FastingSession } from '../types/fasting';

export interface CalendarDay {
  date: Date;
  dateString: string; // YYYY-MM-DD
  isCurrentMonth: boolean;
  isToday: boolean;
  sessions: FastingSession[];
  hasSuccess: boolean; // At least one successful fast
  hasPartial: boolean; // At least one partial fast (stopped early)
  isActive: boolean; // Active fast started on this day
}

export interface WeekDay {
  date: Date;
  dateString: string; // YYYY-MM-DD
  dayName: string; // 'Mon', 'Tue', etc.
  sessions: FastingSession[];
  totalMinutes: number;
  goalMet: boolean;
  hasSession: boolean;
}

/**
 * Generate calendar grid for a given month
 * Returns 35 or 42 days (5 or 6 weeks) including padding days
 */
export function generateCalendarDays(
  year: number,
  month: number, // 0-indexed (0 = January)
  sessions: FastingSession[],
  activeSession: FastingSession | null
): CalendarDay[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const firstDayOfWeek = firstDay.getDay(); // 0 = Sunday
  const daysInMonth = lastDay.getDate();

  const days: CalendarDay[] = [];
  const today = new Date();
  const todayString = formatDateString(today);

  // Add padding days from previous month
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const date = new Date(year, month - 1, prevMonthLastDay - i);
    days.push(createCalendarDay(date, false, sessions, activeSession, todayString));
  }

  // Add current month days
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    days.push(createCalendarDay(date, true, sessions, activeSession, todayString));
  }

  // Add padding days from next month to complete the grid
  const remainingDays = 35 - days.length; // Minimum 5 weeks
  for (let day = 1; day <= remainingDays; day++) {
    const date = new Date(year, month + 1, day);
    days.push(createCalendarDay(date, false, sessions, activeSession, todayString));
  }

  return days;
}

function createCalendarDay(
  date: Date,
  isCurrentMonth: boolean,
  sessions: FastingSession[],
  activeSession: FastingSession | null,
  todayString: string
): CalendarDay {
  const dateString = formatDateString(date);
  const daySessions = sessions.filter(session => {
    const sessionDate = formatDateString(new Date(session.startTime));
    return sessionDate === dateString;
  });

  const hasSuccess = daySessions.some(s => !s.stoppedEarly);
  const hasPartial = daySessions.some(s => s.stoppedEarly);
  const isActive = activeSession
    ? formatDateString(new Date(activeSession.startTime)) === dateString
    : false;

  return {
    date,
    dateString,
    isCurrentMonth,
    isToday: dateString === todayString,
    sessions: daySessions,
    hasSuccess,
    hasPartial,
    isActive,
  };
}

/**
 * Generate last 7 days for week chart (today and 6 days back)
 */
export function generateWeekDays(sessions: FastingSession[]): WeekDay[] {
  const days: WeekDay[] = [];
  const today = new Date();

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateString = formatDateString(date);

    const daySessions = sessions.filter(session => {
      const sessionDate = formatDateString(new Date(session.startTime));
      return sessionDate === dateString;
    });

    const totalMinutes = daySessions.reduce((sum, s) => {
      const start = new Date(s.startTime).getTime();
      const end = s.endTime ? new Date(s.endTime).getTime() : Date.now();
      return sum + Math.floor((end - start) / 60000);
    }, 0);

    const goalMet = daySessions.some(s => !s.stoppedEarly);

    days.push({
      date,
      dateString,
      dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
      sessions: daySessions,
      totalMinutes,
      goalMet,
      hasSession: daySessions.length > 0,
    });
  }

  return days;
}

/**
 * Format date as YYYY-MM-DD for consistent comparison
 */
export function formatDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get month name and year for display
 */
export function getMonthYearString(year: number, month: number): string {
  const date = new Date(year, month, 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}
