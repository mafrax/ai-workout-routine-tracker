import React from 'react';
import {
  IonBadge,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { close, trendingUp } from 'ionicons/icons';
import { formatFullDate } from './progressHelpers';

interface ProgressionEntry {
  date: string;
  weight: string;
  reps: string;
  sets: number;
  completedSets: number;
}

interface Props {
  isOpen: boolean;
  allExercises: string[];
  selectedExercise: string;
  progression: { exerciseName: string; history: ProgressionEntry[] } | null;
  onSelectExercise: (name: string) => void;
  onClose: () => void;
}

/**
 * Modal showing the user's progression on a single exercise over time
 * (weight changes session-by-session, with a trend arrow per entry).
 */
const ExerciseProgressionModal: React.FC<Props> = ({
  isOpen,
  allExercises,
  selectedExercise,
  progression,
  onSelectExercise,
  onClose,
}) => (
  <IonModal isOpen={isOpen} onDidDismiss={onClose}>
    <IonHeader>
      <IonToolbar>
        <IonTitle>Exercise Progression</IonTitle>
        <IonButtons slot="end">
          <IonButton onClick={onClose}>
            <IonIcon icon={close} />
          </IonButton>
        </IonButtons>
      </IonToolbar>
    </IonHeader>
    <IonContent className="ion-padding">
      <IonCard>
        <IonCardContent>
          <h3 style={{ marginBottom: '16px' }}>Select Exercise</h3>
          <IonSelect
            value={selectedExercise}
            placeholder="Choose an exercise"
            onIonChange={(e) => onSelectExercise(e.detail.value)}
          >
            {allExercises.map((exercise) => (
              <IonSelectOption key={exercise} value={exercise}>
                {exercise}
              </IonSelectOption>
            ))}
          </IonSelect>
        </IonCardContent>
      </IonCard>

      {progression && progression.history.length > 0 && (
        <IonCard>
          <IonCardHeader>
            <IonCardTitle>{progression.exerciseName}</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <IonList>
              {progression.history.map((entry, idx) => {
                const next = progression.history[idx + 1];
                const trendColor = next
                  ? parseFloat(entry.weight) > parseFloat(next.weight)
                    ? 'success'
                    : parseFloat(entry.weight) < parseFloat(next.weight)
                    ? 'danger'
                    : 'medium'
                  : undefined;
                return (
                  <IonItem key={idx} lines="inset">
                    <IonLabel>
                      <h3>{formatFullDate(entry.date)}</h3>
                      <div style={{ marginTop: '8px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <IonBadge color="primary">
                          {entry.completedSets}/{entry.sets} sets
                        </IonBadge>
                        <IonBadge color="secondary">{entry.reps} reps</IonBadge>
                        <IonBadge color="tertiary">{entry.weight}</IonBadge>
                      </div>
                    </IonLabel>
                    {next && <IonIcon icon={trendingUp} slot="end" color={trendColor} />}
                  </IonItem>
                );
              })}
            </IonList>
          </IonCardContent>
        </IonCard>
      )}

      {progression && progression.history.length === 0 && (
        <IonCard>
          <IonCardContent>
            <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No history found for this exercise.</p>
          </IonCardContent>
        </IonCard>
      )}
    </IonContent>
  </IonModal>
);

export default ExerciseProgressionModal;
