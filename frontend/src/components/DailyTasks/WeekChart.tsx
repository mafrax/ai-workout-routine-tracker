import React from 'react';
import { IonCard, IonCardHeader, IonCardTitle, IonCardContent } from '@ionic/react';
import { WeekDayData } from '../../types/dailyTasks';
import { getCompletionColor } from '../../utils/taskCalendarUtils';
import './WeekChart.css';

interface WeekChartProps {
  weekData: WeekDayData[];
  isLoading?: boolean;
}

const WeekChart: React.FC<WeekChartProps> = ({ weekData, isLoading }) => {
  if (isLoading || weekData.length === 0) {
    return (
      <IonCard className="week-chart-card">
        <IonCardHeader>
          <IonCardTitle>Last 7 Days</IonCardTitle>
        </IonCardHeader>
        <IonCardContent>
          <div className="week-chart-loading">Loading...</div>
        </IonCardContent>
      </IonCard>
    );
  }

  // Find max value for scaling
  const maxCompleted = Math.max(...weekData.map(d => d.tasksCompleted), 1);

  return (
    <IonCard className="week-chart-card">
      <IonCardHeader>
        <IonCardTitle>Last 7 Days</IonCardTitle>
      </IonCardHeader>
      <IonCardContent>
        <div className="week-chart">
          {weekData.map((day, index) => {
            const height = day.tasksTotal > 0
              ? (day.tasksCompleted / maxCompleted) * 100
              : 0;
            const color = getCompletionColor(day.completionRate);

            return (
              <div key={index} className="week-chart-day">
                <div className="week-chart-bar-container">
                  <div
                    className="week-chart-bar"
                    style={{
                      height: `${Math.max(height, 5)}%`,
                      backgroundColor: height > 0 ? color : 'var(--ion-color-light)'
                    }}
                  >
                    {day.tasksCompleted > 0 && (
                      <span className="week-chart-value">
                        {day.tasksCompleted}
                      </span>
                    )}
                  </div>
                </div>
                <div className="week-chart-label">{day.dayName}</div>
              </div>
            );
          })}
        </div>
      </IonCardContent>
    </IonCard>
  );
};

export default WeekChart;
