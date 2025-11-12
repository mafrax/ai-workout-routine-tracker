import React, { useMemo } from 'react';
import { FastingSession } from '../../types/fasting';
import { generateWeekDays, WeekDay } from '../../utils/calendarUtils';
import './WeekChart.css';

interface WeekChartProps {
  sessions: FastingSession[];
}

const WeekChart: React.FC<WeekChartProps> = React.memo(({ sessions }) => {
  // Memoize week data calculation
  const weekDays = useMemo(() => {
    return generateWeekDays(sessions);
  }, [sessions]);

  // Memoize max height calculation
  const maxMinutes = useMemo(() => {
    return Math.max(...weekDays.map(d => d.totalMinutes), 1440);
  }, [weekDays]);

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const getBarHeight = useMemo(() => {
    return (minutes: number) => {
      return `${(minutes / maxMinutes) * 100}%`;
    };
  }, [maxMinutes]);

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
                  height: getBarHeight(day.totalMinutes),
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
});

WeekChart.displayName = 'WeekChart';

export default WeekChart;
