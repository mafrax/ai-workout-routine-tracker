import React from 'react';
import { IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonGrid, IonRow, IonCol, IonButton, IonIcon } from '@ionic/react';
import { checkmarkCircle, checkmarkCircleOutline } from 'ionicons/icons';
import { DailyTask } from '../../types/dailyTasks';
import './PerTaskStats.css';

interface PerTaskStatsProps {
  task: DailyTask;
  onToggleTask: (taskId: number) => void;
}

const PerTaskStats: React.FC<PerTaskStatsProps> = ({ task, onToggleTask }) => {
  const today = new Date().toISOString().split('T')[0];
  const isCompletedToday = task.completed || task.lastCompletedDate === today;

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
          <IonRow>
            <IonCol size="12" className="ion-text-center">
              <IonButton
                expand="block"
                color={isCompletedToday ? "success" : "primary"}
                onClick={() => onToggleTask(task.id)}
              >
                <IonIcon slot="start" icon={isCompletedToday ? checkmarkCircle : checkmarkCircleOutline} />
                {isCompletedToday ? "Completed Today" : "Mark as Completed"}
              </IonButton>
            </IonCol>
          </IonRow>
        </IonGrid>
      </IonCardContent>
    </IonCard>
  );
};

export default PerTaskStats;
