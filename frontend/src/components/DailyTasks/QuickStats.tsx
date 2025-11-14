import React from 'react';
import { IonCard, IonCardContent, IonGrid, IonRow, IonCol } from '@ionic/react';
import { AggregateStats } from '../../types/dailyTasks';
import './QuickStats.css';

interface QuickStatsProps {
  stats: AggregateStats | null;
  isLoading?: boolean;
}

const QuickStats: React.FC<QuickStatsProps> = ({ stats, isLoading }) => {
  if (isLoading || !stats) {
    return (
      <div className="quick-stats-container">
        <IonGrid>
          <IonRow>
            <IonCol size="4">
              <IonCard className="stat-card loading">
                <IonCardContent>
                  <div className="stat-skeleton"></div>
                </IonCardContent>
              </IonCard>
            </IonCol>
            <IonCol size="4">
              <IonCard className="stat-card loading">
                <IonCardContent>
                  <div className="stat-skeleton"></div>
                </IonCardContent>
              </IonCard>
            </IonCol>
            <IonCol size="4">
              <IonCard className="stat-card loading">
                <IonCardContent>
                  <div className="stat-skeleton"></div>
                </IonCardContent>
              </IonCard>
            </IonCol>
          </IonRow>
        </IonGrid>
      </div>
    );
  }

  return (
    <div className="quick-stats-container">
      <IonGrid>
        <IonRow>
          <IonCol size="4" sizeMd="4">
            <IonCard className="stat-card">
              <IonCardContent>
                <div className="stat-value">{stats.activeDaysStreak}</div>
                <div className="stat-label">Day Streak</div>
              </IonCardContent>
            </IonCard>
          </IonCol>
          <IonCol size="4" sizeMd="4">
            <IonCard className="stat-card">
              <IonCardContent>
                <div className="stat-value">{Math.round(stats.monthRate)}%</div>
                <div className="stat-label">Month Rate</div>
              </IonCardContent>
            </IonCard>
          </IonCol>
          <IonCol size="4" sizeMd="4">
            <IonCard className="stat-card">
              <IonCardContent>
                <div className="stat-value">{stats.perfectDays}</div>
                <div className="stat-label">Perfect Days</div>
              </IonCardContent>
            </IonCard>
          </IonCol>
        </IonRow>
      </IonGrid>
    </div>
  );
};

export default QuickStats;
