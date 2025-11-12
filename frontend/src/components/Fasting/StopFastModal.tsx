import React from 'react';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonButtons,
  IonIcon,
  IonCard,
  IonCardContent,
} from '@ionic/react';
import { close } from 'ionicons/icons';
import { FastingSession } from '../../types/fasting';
import { fastingService } from '../../services/fastingService';

interface StopFastModalProps {
  isOpen: boolean;
  activeSession: FastingSession | null;
  onConfirm: () => void;
  onCancel: () => void;
}

const StopFastModal: React.FC<StopFastModalProps> = ({
  isOpen,
  activeSession,
  onConfirm,
  onCancel,
}) => {
  if (!activeSession) return null;

  const elapsedMinutes = fastingService.getElapsedMinutes(activeSession);
  const goalMet = elapsedMinutes >= activeSession.goalMinutes;
  const overtime = goalMet ? elapsedMinutes - activeSession.goalMinutes : 0;
  const shortfall = !goalMet ? activeSession.goalMinutes - elapsedMinutes : 0;

  // Calculate eating window duration
  const eatingWindowHours = Math.floor(activeSession.eatingWindowMinutes / 60);
  const eatingWindowMins = activeSession.eatingWindowMinutes % 60;

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onCancel}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>End Your Fast?</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onCancel}>
              <IonIcon icon={close} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <IonCard color={goalMet ? 'success' : 'warning'}>
          <IonCardContent>
            <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.5rem' }}>
              {goalMet ? '✅ SUCCESS!' : '⚠️ Stopped Early'}
            </h2>
            <div style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>
              <strong>Fasted:</strong> {formatDuration(elapsedMinutes)}
            </div>
            <div style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>
              <strong>Goal:</strong> {formatDuration(activeSession.goalMinutes)}
            </div>
            {goalMet && (
              <div style={{ fontSize: '1rem', marginTop: '0.75rem', opacity: 0.9 }}>
                💪 Exceeded goal by {formatDuration(overtime)}!
              </div>
            )}
            {!goalMet && (
              <div style={{ fontSize: '1rem', marginTop: '0.75rem', opacity: 0.9 }}>
                Short by {formatDuration(shortfall)}
              </div>
            )}
          </IonCardContent>
        </IonCard>

        <div style={{
          background: 'var(--ion-color-light)',
          padding: '1rem',
          borderRadius: '8px',
          margin: '1rem 0',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '0.875rem', color: 'var(--ion-color-medium)', marginBottom: '0.25rem' }}>
            Next eating window:
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: '600', color: 'var(--ion-color-primary)' }}>
            {eatingWindowMins > 0 ? `${eatingWindowHours}h ${eatingWindowMins}m` : `${eatingWindowHours}h`}
          </div>
        </div>

        <p style={{ textAlign: 'center', margin: '1rem 0', fontSize: '0.875rem', color: 'var(--ion-color-medium)' }}>
          {goalMet
            ? 'Great job! Your eating window will start when you end this fast.'
            : 'Stopping early will count as a failed fast in your statistics.'}
        </p>

        <IonButton
          expand="block"
          color="danger"
          onClick={onConfirm}
          style={{ marginBottom: '1rem' }}
        >
          End Fast
        </IonButton>
        <IonButton expand="block" fill="outline" onClick={onCancel}>
          Continue Fasting
        </IonButton>
      </IonContent>
    </IonModal>
  );
};

export default StopFastModal;
