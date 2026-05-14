import React from 'react';
import {
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
  IonPage,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { arrowBack, checkmarkCircle, informationCircleOutline, play, reorderThreeOutline } from 'ionicons/icons';
import type { Exercise } from '../../types/workout';
import { getExerciseInstruction } from '../../data/exerciseInstructions';

interface Props {
  focus: string;
  exercises: Exercise[];
  onStart: () => void;
  onMarkComplete: () => void;
  onBack: () => void;
  onOpenReorder: () => void;
}

/**
 * The pre-workout "Ready to Start?" screen — shows the day's plan as a
 * static list with two CTAs: start the interactive session, or mark the
 * whole day complete without going through it (for when the user already
 * did the work elsewhere).
 */
const WorkoutStartScreen: React.FC<Props> = ({ focus, exercises, onStart, onMarkComplete, onBack, onOpenReorder }) => {
  const totalSets = exercises.reduce((sum, ex) => sum + ex.sets, 0);
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={onBack}>
              <IonIcon icon={arrowBack} />
            </IonButton>
          </IonButtons>
          <IonTitle>{focus}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onOpenReorder} fill="clear">
              <IonIcon icon={reorderThreeOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <div className="workout-start-screen">
          <h1>Ready to Start?</h1>
          <IonCard>
            <IonCardContent>
              <h2>{focus}</h2>
              <p className="workout-summary">
                {exercises.length} exercises • {totalSets} total sets
              </p>

              <IonList>
                {exercises.map((exercise, idx) => (
                  <IonItem key={idx} lines="inset">
                    <IonLabel className="ion-text-wrap">
                      <h3>{exercise.name}</h3>
                      <p>
                        {exercise.sets}x{exercise.reps} @ {exercise.weight}
                      </p>
                      <p className="exercise-instruction">
                        <IonIcon icon={informationCircleOutline} style={{ fontSize: '14px', marginRight: '4px' }} />
                        {getExerciseInstruction(exercise.name)}
                      </p>
                    </IonLabel>
                  </IonItem>
                ))}
              </IonList>

              <IonButton expand="block" size="large" onClick={onStart} className="start-workout-btn">
                <IonIcon icon={play} slot="start" />
                Start Workout
              </IonButton>
              <IonButton
                expand="block"
                size="large"
                onClick={onMarkComplete}
                fill="outline"
                color="success"
                className="mark-complete-btn"
                style={{ marginTop: '12px' }}
              >
                <IonIcon icon={checkmarkCircle} slot="start" />
                Mark as Complete
              </IonButton>
            </IonCardContent>
          </IonCard>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default WorkoutStartScreen;
