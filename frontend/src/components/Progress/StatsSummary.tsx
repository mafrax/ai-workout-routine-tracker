import React from 'react';
import { IonCard, IonCardContent, IonIcon } from '@ionic/react';
import { checkmarkCircle, fitness, time } from 'ionicons/icons';
import type { ProgressSession } from './progressHelpers';

interface Props {
  sessions: ProgressSession[];
}

/**
 * Three-stat summary card at the top of the Progress page:
 * total workouts, total minutes, average completion %.
 */
const StatsSummary: React.FC<Props> = ({ sessions }) => {
  const totalMinutes = sessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
  const avgCompletion = sessions.length
    ? Math.round((sessions.reduce((sum, s) => sum + (s.completionRate || 0), 0) / sessions.length) * 100)
    : 0;

  return (
    <div className="stats-summary">
      <IonCard className="summary-card">
        <IonCardContent>
          <div className="summary-stats">
            <div className="stat-box">
              <IonIcon icon={fitness} className="stat-icon" />
              <div className="stat-value">{sessions.length}</div>
              <div className="stat-label">Total Workouts</div>
            </div>
            <div className="stat-box">
              <IonIcon icon={time} className="stat-icon" />
              <div className="stat-value">{totalMinutes}</div>
              <div className="stat-label">Total Minutes</div>
            </div>
            <div className="stat-box">
              <IonIcon icon={checkmarkCircle} className="stat-icon" />
              <div className="stat-value">{avgCompletion}%</div>
              <div className="stat-label">Avg Completion</div>
            </div>
          </div>
        </IonCardContent>
      </IonCard>
    </div>
  );
};

export default StatsSummary;
