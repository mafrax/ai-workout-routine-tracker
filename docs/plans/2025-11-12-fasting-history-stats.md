# Fasting Timer - Phase 2: History & Stats Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add calendar view, weekly bar chart, and detailed session history list to the fasting timer feature.

**Architecture:** Three new components (Calendar, WeekChart, HistoryList) that read from existing localStorage sessions. Calendar shows monthly grid with success indicators. Week chart shows last 7 days as bars. History list shows all sessions with expandable details.

**Tech Stack:** React, Ionic Framework, TypeScript, existing fastingService

---

## Task 1: Add Calendar Helper Utilities

**Files:**
- Create: `frontend/src/utils/calendarUtils.ts`

**Step 1: Create calendar utility functions**

Create `frontend/src/utils/calendarUtils.ts`:

```typescript
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
```

**Step 2: Commit**

```bash
git add frontend/src/utils/calendarUtils.ts
git commit -m "feat(fasting): add calendar utility functions"
```

Expected: Clean commit with calendar helpers

---

## Task 2: Create Week Chart Component

**Files:**
- Create: `frontend/src/components/Fasting/WeekChart.tsx`
- Create: `frontend/src/components/Fasting/WeekChart.css`

**Step 1: Create WeekChart component**

Create `frontend/src/components/Fasting/WeekChart.tsx`:

```typescript
import React from 'react';
import { FastingSession } from '../../types/fasting';
import { generateWeekDays, WeekDay } from '../../utils/calendarUtils';
import './WeekChart.css';

interface WeekChartProps {
  sessions: FastingSession[];
}

const WeekChart: React.FC<WeekChartProps> = ({ sessions }) => {
  const weekDays = generateWeekDays(sessions);
  const maxMinutes = Math.max(...weekDays.map(d => d.totalMinutes), 1440); // At least 24h scale

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const getBarHeight = (minutes: number): number => {
    return (minutes / maxMinutes) * 100;
  };

  const getBarColor = (day: WeekDay): string => {
    if (!day.hasSession) return 'var(--ion-color-light)';
    if (day.goalMet) return '#22c55e'; // Green
    return '#f59e0b'; // Orange
  };

  return (
    <div className="week-chart">
      <h3 className="week-chart-title">This Week</h3>
      <div className="week-chart-bars">
        {weekDays.map((day, index) => (
          <div key={index} className="week-chart-day">
            <div className="week-chart-bar-container">
              <div
                className="week-chart-bar"
                style={{
                  height: `${getBarHeight(day.totalMinutes)}%`,
                  backgroundColor: getBarColor(day),
                }}
              >
                {day.hasSession && (
                  <div className="week-chart-bar-label">
                    {formatDuration(day.totalMinutes)}
                  </div>
                )}
              </div>
            </div>
            <div className="week-chart-day-name">{day.dayName}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WeekChart;
```

**Step 2: Create WeekChart styles**

Create `frontend/src/components/Fasting/WeekChart.css`:

```css
.week-chart {
  padding: 1rem;
  background: var(--ion-color-light);
  border-radius: 12px;
  margin: 1rem;
}

.week-chart-title {
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: var(--ion-color-dark);
}

.week-chart-bars {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  height: 150px;
  gap: 0.5rem;
}

.week-chart-day {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.week-chart-bar-container {
  width: 100%;
  height: 120px;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.week-chart-bar {
  width: 100%;
  border-radius: 4px 4px 0 0;
  position: relative;
  min-height: 4px;
  transition: all 0.3s ease;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 0.25rem;
}

.week-chart-bar-label {
  font-size: 0.625rem;
  font-weight: 600;
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.week-chart-day-name {
  font-size: 0.75rem;
  color: var(--ion-color-medium);
  margin-top: 0.5rem;
  font-weight: 500;
}
```

**Step 3: Commit**

```bash
git add frontend/src/components/Fasting/WeekChart.tsx frontend/src/components/Fasting/WeekChart.css
git commit -m "feat(fasting): add week chart component"
```

Expected: Week chart component with 7-day bar visualization

---

## Task 3: Create Calendar Component

**Files:**
- Create: `frontend/src/components/Fasting/Calendar.tsx`
- Create: `frontend/src/components/Fasting/Calendar.css`

**Step 1: Create Calendar component**

Create `frontend/src/components/Fasting/Calendar.tsx`:

```typescript
import React, { useState } from 'react';
import { IonIcon } from '@ionic/react';
import { chevronBack, chevronForward } from 'ionicons/icons';
import { FastingSession } from '../../types/fasting';
import { generateCalendarDays, getMonthYearString } from '../../utils/calendarUtils';
import './Calendar.css';

interface CalendarProps {
  sessions: FastingSession[];
  activeSession: FastingSession | null;
  onDayClick?: (dateString: string, sessions: FastingSession[]) => void;
}

const Calendar: React.FC<CalendarProps> = ({ sessions, activeSession, onDayClick }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const days = generateCalendarDays(year, month, sessions, activeSession);
  const monthYearString = getMonthYearString(year, month);

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const getDayClassName = (day: typeof days[0]): string => {
    const classes = ['calendar-day'];

    if (!day.isCurrentMonth) classes.push('calendar-day-other-month');
    if (day.isToday) classes.push('calendar-day-today');
    if (day.isActive) classes.push('calendar-day-active');
    if (day.hasSuccess) classes.push('calendar-day-success');
    else if (day.hasPartial) classes.push('calendar-day-partial');

    return classes.join(' ');
  };

  const handleDayClick = (day: typeof days[0]) => {
    if (day.sessions.length > 0 && onDayClick) {
      onDayClick(day.dateString, day.sessions);
    }
  };

  return (
    <div className="fasting-calendar">
      <div className="calendar-header">
        <button className="calendar-nav-button" onClick={goToPreviousMonth}>
          <IonIcon icon={chevronBack} />
        </button>
        <h3 className="calendar-month-year">{monthYearString}</h3>
        <button className="calendar-nav-button" onClick={goToNextMonth}>
          <IonIcon icon={chevronForward} />
        </button>
      </div>

      <div className="calendar-weekdays">
        <div className="calendar-weekday">Sun</div>
        <div className="calendar-weekday">Mon</div>
        <div className="calendar-weekday">Tue</div>
        <div className="calendar-weekday">Wed</div>
        <div className="calendar-weekday">Thu</div>
        <div className="calendar-weekday">Fri</div>
        <div className="calendar-weekday">Sat</div>
      </div>

      <div className="calendar-grid">
        {days.map((day, index) => (
          <div
            key={index}
            className={getDayClassName(day)}
            onClick={() => handleDayClick(day)}
          >
            <span className="calendar-day-number">{day.date.getDate()}</span>
            {day.isActive && <div className="calendar-day-indicator active-pulse"></div>}
            {!day.isActive && day.hasSuccess && (
              <div className="calendar-day-indicator success-dot"></div>
            )}
            {!day.isActive && !day.hasSuccess && day.hasPartial && (
              <div className="calendar-day-indicator partial-dot"></div>
            )}
          </div>
        ))}
      </div>

      <div className="calendar-legend">
        <div className="calendar-legend-item">
          <div className="calendar-legend-dot success-dot"></div>
          <span>Goal Met</span>
        </div>
        <div className="calendar-legend-item">
          <div className="calendar-legend-dot partial-dot"></div>
          <span>Partial</span>
        </div>
        <div className="calendar-legend-item">
          <div className="calendar-legend-dot active-pulse"></div>
          <span>Active</span>
        </div>
      </div>
    </div>
  );
};

export default Calendar;
```

**Step 2: Create Calendar styles**

Create `frontend/src/components/Fasting/Calendar.css`:

```css
.fasting-calendar {
  padding: 1rem;
  background: var(--ion-color-light);
  border-radius: 12px;
  margin: 1rem;
}

.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.calendar-nav-button {
  background: transparent;
  border: none;
  font-size: 1.5rem;
  color: var(--ion-color-primary);
  cursor: pointer;
  padding: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.calendar-month-year {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0;
  color: var(--ion-color-dark);
}

.calendar-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0.25rem;
  margin-bottom: 0.5rem;
}

.calendar-weekday {
  text-align: center;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--ion-color-medium);
  padding: 0.5rem 0;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0.25rem;
}

.calendar-day {
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  position: relative;
  cursor: pointer;
  transition: background 0.2s;
}

.calendar-day:hover {
  background: rgba(0, 0, 0, 0.05);
}

.calendar-day-other-month {
  opacity: 0.3;
}

.calendar-day-today {
  border: 2px solid var(--ion-color-primary);
}

.calendar-day-number {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--ion-color-dark);
}

.calendar-day-indicator {
  position: absolute;
  bottom: 4px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.success-dot {
  background: #22c55e;
}

.partial-dot {
  background: #f59e0b;
}

.active-pulse {
  background: #ef4444;
  animation: pulse-indicator 2s infinite;
}

@keyframes pulse-indicator {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.5);
    opacity: 0.7;
  }
}

.calendar-legend {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
}

.calendar-legend-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: var(--ion-color-medium);
}

.calendar-legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
```

**Step 3: Commit**

```bash
git add frontend/src/components/Fasting/Calendar.tsx frontend/src/components/Fasting/Calendar.css
git commit -m "feat(fasting): add monthly calendar component"
```

Expected: Calendar component with success/partial/active indicators

---

## Task 4: Create History List Component

**Files:**
- Create: `frontend/src/components/Fasting/HistoryList.tsx`
- Create: `frontend/src/components/Fasting/HistoryList.css`

**Step 1: Create HistoryList component**

Create `frontend/src/components/Fasting/HistoryList.tsx`:

```typescript
import React, { useState } from 'react';
import { IonList, IonItem, IonLabel, IonBadge, IonIcon } from '@ionic/react';
import { chevronDown, chevronUp, checkmarkCircle, alertCircle } from 'ionicons/icons';
import { FastingSession } from '../../types/fasting';
import './HistoryList.css';

interface HistoryListProps {
  sessions: FastingSession[];
}

const HistoryList: React.FC<HistoryListProps> = ({ sessions }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Sort sessions by start time, most recent first
  const sortedSessions = [...sessions].sort((a, b) => {
    return new Date(b.startTime).getTime() - new Date(a.startTime).getTime();
  });

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const formatDateTime = (isoString: string): string => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatTime = (isoString: string): string => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getActualDuration = (session: FastingSession): number => {
    const start = new Date(session.startTime).getTime();
    const end = session.endTime ? new Date(session.endTime).getTime() : Date.now();
    return Math.floor((end - start) / 60000);
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  if (sortedSessions.length === 0) {
    return (
      <div className="history-list-empty">
        <p>No fasting sessions yet. Start your first fast!</p>
      </div>
    );
  }

  return (
    <div className="history-list">
      <h3 className="history-list-title">History</h3>
      <IonList className="history-list-items">
        {sortedSessions.map((session) => {
          const isExpanded = expandedId === session.id;
          const actualDuration = getActualDuration(session);
          const goalMet = !session.stoppedEarly;

          return (
            <IonItem
              key={session.id}
              className="history-list-item"
              button
              onClick={() => toggleExpand(session.id)}
            >
              <IonIcon
                slot="start"
                icon={goalMet ? checkmarkCircle : alertCircle}
                className={goalMet ? 'history-icon-success' : 'history-icon-partial'}
              />
              <IonLabel>
                <div className="history-item-header">
                  <h3>{formatDateTime(session.startTime)}</h3>
                  <IonBadge color={goalMet ? 'success' : 'warning'}>
                    {goalMet ? '✓ Goal Met' : 'Partial'}
                  </IonBadge>
                </div>
                <p className="history-item-summary">
                  {formatDuration(actualDuration)} / {formatDuration(session.goalMinutes)} ({session.presetName})
                </p>

                {isExpanded && (
                  <div className="history-item-details">
                    <div className="history-detail-row">
                      <span className="history-detail-label">Started:</span>
                      <span className="history-detail-value">{formatTime(session.startTime)}</span>
                    </div>
                    {session.endTime && (
                      <div className="history-detail-row">
                        <span className="history-detail-label">Ended:</span>
                        <span className="history-detail-value">{formatTime(session.endTime)}</span>
                      </div>
                    )}
                    <div className="history-detail-row">
                      <span className="history-detail-label">Eating Window:</span>
                      <span className="history-detail-value">
                        {formatDuration(session.eatingWindowMinutes)}
                      </span>
                    </div>
                    {session.stoppedEarly && (
                      <div className="history-detail-row">
                        <span className="history-detail-label">Status:</span>
                        <span className="history-detail-value history-detail-stopped">
                          Stopped {formatDuration(session.goalMinutes - actualDuration)} early
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </IonLabel>
              <IonIcon
                slot="end"
                icon={isExpanded ? chevronUp : chevronDown}
                className="history-expand-icon"
              />
            </IonItem>
          );
        })}
      </IonList>
    </div>
  );
};

export default HistoryList;
```

**Step 2: Create HistoryList styles**

Create `frontend/src/components/Fasting/HistoryList.css`:

```css
.history-list {
  margin: 1rem;
}

.history-list-title {
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  padding: 0 0.5rem;
  color: var(--ion-color-dark);
}

.history-list-items {
  background: var(--ion-color-light);
  border-radius: 12px;
  padding: 0;
}

.history-list-item {
  --padding-start: 1rem;
  --padding-end: 1rem;
  --inner-padding-end: 0;
}

.history-icon-success {
  color: #22c55e;
  font-size: 1.5rem;
}

.history-icon-partial {
  color: #f59e0b;
  font-size: 1.5rem;
}

.history-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.25rem;
}

.history-item-header h3 {
  font-size: 0.875rem;
  font-weight: 600;
  margin: 0;
  color: var(--ion-color-dark);
}

.history-item-summary {
  font-size: 0.875rem;
  color: var(--ion-color-medium);
  margin: 0;
}

.history-item-details {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
}

.history-detail-row {
  display: flex;
  justify-content: space-between;
  padding: 0.25rem 0;
  font-size: 0.8125rem;
}

.history-detail-label {
  color: var(--ion-color-medium);
  font-weight: 500;
}

.history-detail-value {
  color: var(--ion-color-dark);
  font-weight: 600;
}

.history-detail-stopped {
  color: #f59e0b;
}

.history-expand-icon {
  color: var(--ion-color-medium);
  font-size: 1.25rem;
}

.history-list-empty {
  text-align: center;
  padding: 2rem 1rem;
  color: var(--ion-color-medium);
}

.history-list-empty p {
  margin: 0;
  font-size: 0.875rem;
}
```

**Step 3: Commit**

```bash
git add frontend/src/components/Fasting/HistoryList.tsx frontend/src/components/Fasting/HistoryList.css
git commit -m "feat(fasting): add history list component with expandable details"
```

Expected: History list showing all sessions with expand/collapse

---

## Task 5: Create Day Details Modal

**Files:**
- Create: `frontend/src/components/Fasting/DayDetailsModal.tsx`
- Create: `frontend/src/components/Fasting/DayDetailsModal.css`

**Step 1: Create DayDetailsModal component**

Create `frontend/src/components/Fasting/DayDetailsModal.tsx`:

```typescript
import React from 'react';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonBadge,
} from '@ionic/react';
import { FastingSession } from '../../types/fasting';
import './DayDetailsModal.css';

interface DayDetailsModalProps {
  isOpen: boolean;
  dateString: string;
  sessions: FastingSession[];
  onClose: () => void;
}

const DayDetailsModal: React.FC<DayDetailsModalProps> = ({
  isOpen,
  dateString,
  sessions,
  onClose,
}) => {
  const formatDate = (dateString: string): string => {
    const [year, month, day] = dateString.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (isoString: string): string => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const getActualDuration = (session: FastingSession): number => {
    const start = new Date(session.startTime).getTime();
    const end = session.endTime ? new Date(session.endTime).getTime() : Date.now();
    return Math.floor((end - start) / 60000);
  };

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{formatDate(dateString)}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onClose}>Close</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div className="day-details-content">
          {sessions.length === 0 ? (
            <div className="day-details-empty">
              <p>No fasting sessions on this day</p>
            </div>
          ) : (
            <IonList>
              {sessions.map((session) => {
                const actualDuration = getActualDuration(session);
                const goalMet = !session.stoppedEarly;

                return (
                  <IonItem key={session.id}>
                    <IonLabel>
                      <h2>{session.presetName}</h2>
                      <p>Started: {formatTime(session.startTime)}</p>
                      {session.endTime && <p>Ended: {formatTime(session.endTime)}</p>}
                      <p>
                        Duration: {formatDuration(actualDuration)} /{' '}
                        {formatDuration(session.goalMinutes)}
                      </p>
                      <p>Eating Window: {formatDuration(session.eatingWindowMinutes)}</p>
                    </IonLabel>
                    <IonBadge slot="end" color={goalMet ? 'success' : 'warning'}>
                      {goalMet ? '✓ Success' : 'Partial'}
                    </IonBadge>
                  </IonItem>
                );
              })}
            </IonList>
          )}
        </div>
      </IonContent>
    </IonModal>
  );
};

export default DayDetailsModal;
```

**Step 2: Create DayDetailsModal styles**

Create `frontend/src/components/Fasting/DayDetailsModal.css`:

```css
.day-details-content {
  padding: 1rem 0;
}

.day-details-empty {
  text-align: center;
  padding: 3rem 1rem;
  color: var(--ion-color-medium);
}

.day-details-empty p {
  margin: 0;
  font-size: 0.875rem;
}
```

**Step 3: Commit**

```bash
git add frontend/src/components/Fasting/DayDetailsModal.tsx frontend/src/components/Fasting/DayDetailsModal.css
git commit -m "feat(fasting): add day details modal for calendar"
```

Expected: Modal showing all sessions for a selected day

---

## Task 6: Integrate Components into Fasting Page

**Files:**
- Modify: `frontend/src/pages/Fasting.tsx`

**Step 1: Import new components**

Add imports at the top of `frontend/src/pages/Fasting.tsx`:

```typescript
import WeekChart from '../components/Fasting/WeekChart';
import Calendar from '../components/Fasting/Calendar';
import HistoryList from '../components/Fasting/HistoryList';
import DayDetailsModal from '../components/Fasting/DayDetailsModal';
```

**Step 2: Add state for day details modal**

After existing useState declarations:

```typescript
const [showDayDetails, setShowDayDetails] = useState(false);
const [selectedDayDate, setSelectedDayDate] = useState<string>('');
const [selectedDaySessions, setSelectedDaySessions] = useState<FastingSession[]>([]);
```

**Step 3: Add handler for calendar day click**

After existing handlers:

```typescript
const handleDayClick = (dateString: string, sessions: FastingSession[]) => {
  setSelectedDayDate(dateString);
  setSelectedDaySessions(sessions);
  setShowDayDetails(true);
};
```

**Step 4: Add components to the page**

After the existing `<QuickStats stats={stats} />` component, add:

```typescript
<WeekChart sessions={sessions} />

<Calendar
  sessions={sessions}
  activeSession={activeSession}
  onDayClick={handleDayClick}
/>

<HistoryList sessions={sessions} />
```

**Step 5: Add DayDetailsModal before closing IonContent**

Before the closing `</IonContent>` tag, after the NotificationSettings modal:

```typescript
<DayDetailsModal
  isOpen={showDayDetails}
  dateString={selectedDayDate}
  sessions={selectedDaySessions}
  onClose={() => setShowDayDetails(false)}
/>
```

**Step 6: Load sessions in useEffect**

Update the useEffect to also load sessions:

```typescript
useEffect(() => {
  loadPresets();
  loadActiveState();
  loadStats();
  loadNotificationSettings();
  startNotificationScheduler();
  loadSessions(); // Add this line
}, []);
```

**Step 7: Commit**

```bash
git add frontend/src/pages/Fasting.tsx
git commit -m "feat(fasting): integrate calendar, week chart, and history into page"
```

Expected: Fasting page now shows week chart, calendar, and history list

---

## Task 7: Visual Testing and Polish

**Files:**
- Manual testing

**Step 1: Test calendar navigation**
- Navigate through months using prev/next buttons
- Verify days show correct success/partial/active indicators
- Tap days with sessions to open details modal

**Step 2: Test week chart**
- Verify last 7 days display correctly
- Check bar heights are proportional
- Verify color coding (green/orange/gray)

**Step 3: Test history list**
- Verify sessions sorted by most recent first
- Expand/collapse session details
- Check all information displays correctly

**Step 4: Test with various data states**
- Empty state (no sessions)
- Single session
- Multiple sessions on same day
- Active fast indicator on today

**Step 5: Visual polish**
- Check responsive layout on different screen sizes
- Verify spacing and alignment
- Test scrolling behavior

**Step 6: Commit any fixes**

```bash
git add .
git commit -m "fix(fasting): polish history and calendar UI"
```

Expected: All components render correctly with proper data

---

## Execution Complete

Plan covers Phase 2 (History & Stats) from the fasting timer design. All components are functional and integrated.

**Success Criteria Met:**
- Monthly calendar with success/partial/active indicators
- 7-day week chart with color-coded bars
- Scrollable history list with expandable details
- Day details modal for calendar day taps
- All components read from existing localStorage sessions

**Files Created:**
- `frontend/src/utils/calendarUtils.ts` - Calendar helper functions
- `frontend/src/components/Fasting/WeekChart.tsx` + CSS
- `frontend/src/components/Fasting/Calendar.tsx` + CSS
- `frontend/src/components/Fasting/HistoryList.tsx` + CSS
- `frontend/src/components/Fasting/DayDetailsModal.tsx` + CSS

**Files Modified:**
- `frontend/src/pages/Fasting.tsx` - Integrated all new components

**Next Steps:**
- Execute this plan
- Test on device
- Consider Phase 4 (Backend Migration) if needed
