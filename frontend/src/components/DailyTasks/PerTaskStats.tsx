import React from 'react';
import { IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonGrid, IonRow, IonCol } from '@ionic/react';
import { DailyTask } from '../../types/dailyTasks';
import './PerTaskStats.css';

interface PerTaskStatsProps {
  task: DailyTask;
}

const PerTaskStats: React.FC<PerTaskStatsProps> = ({ task }) => {
  return (
    <IonCard className="per-task-stats-card">
      <IonCardHeader>
        <IonCardTitle className="task-title">{task.title}</IonCardTitle>
      </IonCardHeader>
      <IonCardContent>
        <IonGrid>
          <IonRow>
            <IonCol size="4">
              <div className="stat-item">
                <div className="stat-value">{task.currentStreak}</div>
                <div className="stat-label">Current Streak</div>
              </div>
            </IonCol>
            <IonCol size="4">
              <div className="stat-item">
                <div className="stat-value">{task.bestStreak}</div>
                <div className="stat-label">Best Streak</div>
              </div>
            </IonCol>
            <IonCol size="4">
              <div className="stat-item">
                <div className="stat-value">{task.totalCompletions}</div>
                <div className="stat-label">Total</div>
              </div>
            </IonCol>
          </IonRow>
        </IonGrid>
      </IonCardContent>
    </IonCard>
  );
};

export default PerTaskStats;
