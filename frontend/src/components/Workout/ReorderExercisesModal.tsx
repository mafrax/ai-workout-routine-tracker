import React from 'react';
import {
  IonBadge,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { arrowDown, arrowUp, close } from 'ionicons/icons';
import type { Exercise } from '../../types/workout';

interface Props {
  isOpen: boolean;
  exercises: Exercise[];
  currentIndex: number;
  onMoveUp: (idx: number) => void;
  onMoveDown: (idx: number) => void;
  onClose: () => void;
}

/**
 * Modal for reordering the exercise list mid-workout (useful when a piece
 * of equipment is occupied). Completed-set progress on the current
 * exercise is preserved by the parent's reorder handlers.
 */
const ReorderExercisesModal: React.FC<Props> = ({
  isOpen,
  exercises,
  currentIndex,
  onMoveUp,
  onMoveDown,
  onClose,
}) => (
  <IonModal isOpen={isOpen} onDidDismiss={onClose}>
    <IonHeader>
      <IonToolbar>
        <IonTitle>Reorder Exercises</IonTitle>
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
          <p style={{ color: '#666', marginBottom: '20px' }}>
            Reorder exercises to work around occupied equipment. Your progress will be preserved.
          </p>
          <IonList>
            {exercises.map((exercise, idx) => (
              <IonItem key={idx} lines="inset">
                <IonLabel className="ion-text-wrap">
                  <h3>{exercise.name}</h3>
                  <p>
                    {exercise.sets}x{exercise.reps} @ {exercise.weight}
                  </p>
                  {idx === currentIndex && (
                    <IonBadge color="primary" style={{ marginTop: '4px' }}>
                      Current Exercise
                    </IonBadge>
                  )}
                </IonLabel>
                <IonButton fill="clear" slot="end" onClick={() => onMoveUp(idx)} disabled={idx === 0} size="small">
                  <IonIcon icon={arrowUp} slot="icon-only" />
                </IonButton>
                <IonButton
                  fill="clear"
                  slot="end"
                  onClick={() => onMoveDown(idx)}
                  disabled={idx === exercises.length - 1}
                  size="small"
                >
                  <IonIcon icon={arrowDown} slot="icon-only" />
                </IonButton>
              </IonItem>
            ))}
          </IonList>
        </IonCardContent>
      </IonCard>
    </IonContent>
  </IonModal>
);

export default ReorderExercisesModal;
