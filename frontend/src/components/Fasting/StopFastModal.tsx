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
            <h2 style={{ margin: '0 0 1rem 0' }}>
              {goalMet ? '✓ Goal Met!' : 'Goal Not Met'}
            </h2>
            <div style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>
              <strong>Duration:</strong> {formatDuration(elapsedMinutes)}
            </div>
            <div style={{ fontSize: '1.125rem' }}>
              <strong>Goal:</strong> {formatDuration(activeSession.goalMinutes)}
            </div>
          </IonCardContent>
        </IonCard>

        <p style={{ textAlign: 'center', margin: '1.5rem 0', fontSize: '1rem' }}>
          {goalMet
            ? 'Congratulations! You reached your fasting goal.'
            : 'You can still continue fasting or end now.'}
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
