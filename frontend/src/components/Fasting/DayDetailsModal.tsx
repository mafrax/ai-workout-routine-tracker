import React from 'react';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonBadge,
} from '@ionic/react';
import { FastingSession } from '../../types/fasting';
import './DayDetailsModal.css';

interface DayDetailsModalProps {
  isOpen: boolean;
  dateString: string;
  sessions: FastingSession[];
  onClose: () => void;
}

const DayDetailsModal: React.FC<DayDetailsModalProps> = ({
  isOpen,
  dateString,
  sessions,
  onClose,
}) => {
  const formatDate = (dateString: string): string => {
    const [year, month, day] = dateString.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (isoString: string): string => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const getActualDuration = (session: FastingSession): number => {
    const start = new Date(session.startTime).getTime();
    const end = session.endTime ? new Date(session.endTime).getTime() : Date.now();
    return Math.floor((end - start) / 60000);
  };

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{formatDate(dateString)}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onClose}>Close</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div className="day-details-content">
          {sessions.length === 0 ? (
            <div className="day-details-empty">
              <p>No fasting sessions on this day</p>
            </div>
          ) : (
            <IonList>
              {sessions.map((session) => {
                const actualDuration = getActualDuration(session);
                const goalMet = !session.stoppedEarly;

                return (
                  <IonItem key={session.id}>
                    <IonLabel>
                      <h2>{session.presetName}</h2>
                      <p>Started: {formatTime(session.startTime)}</p>
                      {session.endTime && <p>Ended: {formatTime(session.endTime)}</p>}
                      <p>
                        Duration: {formatDuration(actualDuration)} /{' '}
                        {formatDuration(session.goalMinutes)}
                      </p>
                      <p>Eating Window: {formatDuration(session.eatingWindowMinutes)}</p>
                    </IonLabel>
                    <IonBadge slot="end" color={goalMet ? 'success' : 'warning'}>
                      {goalMet ? '✓ Success' : 'Partial'}
                    </IonBadge>
                  </IonItem>
                );
              })}
            </IonList>
          )}
        </div>
      </IonContent>
    </IonModal>
  );
};

export default DayDetailsModal;
