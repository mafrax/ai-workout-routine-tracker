import React, { useEffect, useState } from 'react';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonItem,
  IonLabel,
  IonBadge,
  IonRefresher,
  IonRefresherContent,
} from '@ionic/react';
import { useStore } from '../../store/useStore';
import { workoutSessionApi } from '../../services/api';
import type { ProgressSummary } from '../../types';
import './ProgressView.css';

const ProgressView: React.FC = () => {
  const { user, progress, setProgress } = useStore();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchProgress();
    }
  }, [user]);

  const fetchProgress = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const data = await workoutSessionApi.getProgress(user.id);
      setProgress(data);
    } catch (error) {
      console.error('Error fetching progress:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async (event: CustomEvent) => {
    await fetchProgress();
    event.detail.complete();
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'improving': return 'success';
      case 'declining': return 'danger';
      default: return 'medium';
    }
  };

  const getTrendLabel = (trend: string) => {
    switch (trend) {
      case 'improving': return '📈 Improving';
      case 'declining': return '📉 Needs Attention';
      case 'stable': return '➡️ Stable';
      default: return 'No Data';
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Progress</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent></IonRefresherContent>
        </IonRefresher>

        {progress && (
          <div className="progress-container">
            <IonCard>
              <IonCardHeader>
                <IonCardTitle>Overall Progress</IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <IonItem lines="none">
                  <IonLabel>
                    <h2>Total Sessions</h2>
                    <p className="stat-value">{progress.totalSessions}</p>
                  </IonLabel>
                </IonItem>

                <IonItem lines="none">
                  <IonLabel>
                    <h2>Total Training Time</h2>
                    <p className="stat-value">
                      {Math.floor(progress.totalMinutesTrained / 60)}h {progress.totalMinutesTrained % 60}m
                    </p>
                  </IonLabel>
                </IonItem>
              </IonCardContent>
            </IonCard>

            <IonCard>
              <IonCardHeader>
                <IonCardTitle>Performance Metrics</IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <IonItem lines="none">
                  <IonLabel>
                    <h2>Average Completion Rate</h2>
                    <p className="stat-value">
                      {(progress.averageCompletionRate * 100).toFixed(1)}%
                    </p>
                  </IonLabel>
                </IonItem>

                <IonItem lines="none">
                  <IonLabel>
                    <h2>Average Difficulty</h2>
                    <p className="stat-value">
                      {progress.averageDifficultyRating.toFixed(1)}/10
                    </p>
                  </IonLabel>
                </IonItem>

                <IonItem lines="none">
                  <IonLabel>
                    <h2>Trend</h2>
                  </IonLabel>
                  <IonBadge color={getTrendColor(progress.trend)} slot="end">
                    {getTrendLabel(progress.trend)}
                  </IonBadge>
                </IonItem>
              </IonCardContent>
            </IonCard>
          </div>
        )}

        {!progress && !loading && (
          <div className="no-data">
            <p>No workout data yet. Start your first session!</p>
          </div>
        )}
      </IonContent>
    </IonPage>
  );
};

export default ProgressView;
