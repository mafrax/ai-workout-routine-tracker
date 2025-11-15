import React, { useState } from 'react';
import {
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonButton,
  IonIcon,
  IonGrid,
  IonRow,
  IonCol
} from '@ionic/react';
import { chevronBack, chevronForward } from 'ionicons/icons';
import { CalendarDay } from '../../types/dailyTasks';
import { getMonthName, getCompletionIntensity } from '../../utils/taskCalendarUtils';
import './Calendar.css';

interface CalendarProps {
  calendarDays: CalendarDay[];
  currentMonth: number;
  currentYear: number;
  onMonthChange: (year: number, month: number) => void;
  onDayClick?: (day: CalendarDay) => void;
  isLoading?: boolean;
}

const Calendar: React.FC<CalendarProps> = ({
  calendarDays,
  currentMonth,
  currentYear,
  onMonthChange,
  onDayClick,
  isLoading
}) => {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      onMonthChange(currentYear - 1, 11);
    } else {
      onMonthChange(currentYear, currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      onMonthChange(currentYear + 1, 0);
    } else {
      onMonthChange(currentYear, currentMonth + 1);
    }
  };

  const handleDayClick = (day: CalendarDay) => {
    if (day.isCurrentMonth && onDayClick) {
      onDayClick(day);
    }
  };

  const getCalendarCellClass = (day: CalendarDay): string => {
    const classes = ['calendar-cell'];

    if (!day.isCurrentMonth) classes.push('other-month');
    if (day.isToday) classes.push('today');
    if (day.isPerfect) classes.push('perfect');
    else if (day.hasAnyCompletion) classes.push('has-completion');

    return classes.join(' ');
  };

  const getCalendarCellStyle = (day: CalendarDay): React.CSSProperties => {
    if (!day.hasAnyCompletion || !day.isCurrentMonth) return {};

    const intensity = getCompletionIntensity(day.completionRate);

    if (day.isPerfect) {
      return {
        backgroundColor: 'var(--ion-color-success)',
        color: 'white'
      };
    }

    return {
      backgroundColor: `rgba(var(--ion-color-success-rgb), ${intensity * 0.6})`,
      color: intensity > 0.5 ? 'white' : 'inherit'
    };
  };

  return (
    <IonCard className="calendar-card">
      <IonCardHeader>
        <div className="calendar-header">
          <IonButton fill="clear" size="small" onClick={handlePrevMonth}>
            <IonIcon slot="icon-only" icon={chevronBack} />
          </IonButton>
          <IonCardTitle>
            {getMonthName(currentMonth)} {currentYear}
          </IonCardTitle>
          <IonButton fill="clear" size="small" onClick={handleNextMonth}>
            <IonIcon slot="icon-only" icon={chevronForward} />
          </IonButton>
        </div>
      </IonCardHeader>
      <IonCardContent>
        {isLoading ? (
          <div className="calendar-loading">Loading...</div>
        ) : (
          <>
            {/* Day names header */}
            <div className="calendar-day-names">
              {dayNames.map((name) => (
                <div key={name} className="calendar-day-name">
                  {name}
                </div>
              ))}
            </div>

            {/* Calendar days */}
            <div className="calendar-days">
              {calendarDays.map((day, index) => {
                const dayNumber = new Date(day.dateString).getDate();

                return (
                  <div
                    key={index}
                    className={getCalendarCellClass(day)}
                    style={getCalendarCellStyle(day)}
                    onClick={() => handleDayClick(day)}
                  >
                    <span className="calendar-day-number">{dayNumber}</span>
                    {day.hasAnyCompletion && day.isCurrentMonth && (
                      <span className="calendar-day-count">
                        {day.tasksCompleted}/{day.tasksTotal}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </IonCardContent>
    </IonCard>
  );
};

export default Calendar;
