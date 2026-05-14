import React from 'react';
import { IonButton, IonCard, IonCardContent, IonCardHeader, IonCardTitle } from '@ionic/react';
import type { ProgressSession } from './progressHelpers';

interface Props {
  sessions: ProgressSession[];
  currentMonth: Date;
  onChangeMonth: (delta: number) => void;
  /** Called when the user taps a workout day. Lets the parent scroll to the session card. */
  onSessionClick: (sessionId: number) => void;
}

/**
 * Month-view calendar showing which days have workouts. Each filled cell
 * uses the workout-plan's accent color; tapping one scrolls the parent
 * list to that session.
 */
const WorkoutCalendar: React.FC<Props> = ({ sessions, currentMonth, onChangeMonth, onSessionClick }) => {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  // Build a date -> sessions map for O(1) lookups while rendering cells.
  const byDate = new Map<string, ProgressSession[]>();
  for (const s of sessions) {
    const key = new Date(s.sessionDate).toDateString();
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key)!.push(s);
  }

  const cells: React.ReactNode[] = [];
  for (let i = 0; i < startingDayOfWeek; i++) {
    cells.push(<div key={`empty-${i}`} className="calendar-day empty" />);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dayWorkouts = byDate.get(date.toDateString());
    if (dayWorkouts && dayWorkouts.length > 0) {
      const planColor = (dayWorkouts[0]?.workoutPlan as any)?.color || '#667eea';
      cells.push(
        <div
          key={day}
          className="calendar-day workout-day"
          style={{
            background: `linear-gradient(135deg, ${planColor} 0%, ${planColor}dd 100%)`,
            cursor: 'pointer',
          }}
          onClick={() => dayWorkouts[0]?.id && onSessionClick(dayWorkouts[0].id)}
        >
          {day}
          {dayWorkouts.length > 1 && (
            <span style={{ fontSize: '10px', position: 'absolute', top: '2px', right: '2px' }}>
              +{dayWorkouts.length - 1}
            </span>
          )}
        </div>
      );
    } else {
      cells.push(
        <div key={day} className="calendar-day">
          {day}
        </div>
      );
    }
  }

  return (
    <IonCard className="calendar-card">
      <IonCardHeader>
        <div className="calendar-header">
          <IonButton fill="clear" size="small" onClick={() => onChangeMonth(-1)}>
            &lt;
          </IonButton>
          <IonCardTitle>
            {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </IonCardTitle>
          <IonButton fill="clear" size="small" onClick={() => onChangeMonth(1)}>
            &gt;
          </IonButton>
        </div>
      </IonCardHeader>
      <IonCardContent>
        <div className="progress-calendar-grid">
          <div className="progress-calendar-weekdays">
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>
          <div className="progress-calendar-days">{cells}</div>
        </div>
      </IonCardContent>
    </IonCard>
  );
};

export default WorkoutCalendar;
