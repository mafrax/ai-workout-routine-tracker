import React from 'react';
import { IonButton, IonCard, IonCardContent, IonIcon } from '@ionic/react';
import { barbell, checkmarkCircleOutline } from 'ionicons/icons';
import type { DailyWorkout } from '../../types/workout';

interface Props {
  workout: DailyWorkout;
  isCompleted: boolean;
  onStart: (dayNumber: number) => void;
  onMarkIncomplete: (dayNumber: number) => void;
}

/**
 * Single-day tile in the "Select Your Workout" grid. Renders the focus
 * label, exercise/set count, and the primary action (Start or Do Again
 * for the completed variant).
 */
const WorkoutDayCard: React.FC<Props> = ({ workout, isCompleted, onStart, onMarkIncomplete }) => {
  const totalSets = workout.exercises.reduce((sum: number, ex: any) => {
    const sets = Array.isArray(ex.sets) ? ex.sets.length : typeof ex.sets === 'number' ? ex.sets : 0;
    return sum + sets;
  }, 0);

  return (
    <IonCard className={`workout-day-card ${isCompleted ? 'completed' : ''}`}>
      <IonCardContent>
        <div className="day-header">
          <h3>Day {workout.dayNumber}</h3>
          {isCompleted ? (
            <IonIcon icon={checkmarkCircleOutline} className="day-icon completed-icon" color="success" />
          ) : (
            <IonIcon icon={barbell} className="day-icon" />
          )}
        </div>
        <p className="focus-text">{workout.focus}</p>
        <div className="workout-meta">
          <span className="exercise-count">{workout.exercises.length} exercises</span>
          <span className="set-count">{totalSets} sets</span>
        </div>
        {isCompleted ? (
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            <IonButton expand="block" className="start-btn completed-btn" onClick={() => onStart(workout.dayNumber)}>
              Do Again
            </IonButton>
            <IonButton expand="block" fill="outline" color="medium" onClick={() => onMarkIncomplete(workout.dayNumber)}>
              Mark Incomplete
            </IonButton>
          </div>
        ) : (
          <IonButton expand="block" className="start-btn" onClick={() => onStart(workout.dayNumber)}>
            Start Workout
          </IonButton>
        )}
      </IonCardContent>
    </IonCard>
  );
};

export default WorkoutDayCard;
