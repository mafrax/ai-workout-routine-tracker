import React, { useState } from 'react';
import { IonIcon } from '@ionic/react';
import { chevronBack, chevronForward } from 'ionicons/icons';
import { FastingSession } from '../../types/fasting';
import { generateCalendarDays, getMonthYearString } from '../../utils/calendarUtils';
import EmptyState from './EmptyState';
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
      {sessions.length === 0 && (
        <EmptyState
          type="calendar"
          compact
        />
      )}
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
