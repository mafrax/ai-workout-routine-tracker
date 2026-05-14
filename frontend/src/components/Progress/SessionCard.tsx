import React from 'react';
import {
  IonBadge,
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonChip,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
} from '@ionic/react';
import { barbell, checkmarkCircle, statsChartOutline, time, trashOutline } from 'ionicons/icons';
import {
  formatFullDate,
  getCompletionColor,
  getDifficultyColor,
  getWorkoutTitle,
  parseExercises,
  type ProgressSession,
} from './progressHelpers';

interface Props {
  session: ProgressSession;
  /** When set to a specific exercise name, only that exercise is shown. */
  exerciseFilter: string;
  /** Lets the parent collect refs so the calendar can scroll to a session. */
  registerRef: (sessionId: number, el: HTMLElement | null) => void;
  onDelete: (sessionId: number) => void;
  onExerciseClick: (exerciseName: string) => void;
}

/**
 * One workout-history card. Renders title, completion chip, meta (duration
 * / exercise count / difficulty), the exercise list, and any notes.
 */
const SessionCard: React.FC<Props> = ({ session, exerciseFilter, registerRef, onDelete, onExerciseClick }) => {
  const exercises = parseExercises(session);
  const displayExercises = exerciseFilter === 'all' ? exercises : exercises.filter((ex) => ex.name === exerciseFilter);

  return (
    <IonCard
      className="session-card"
      ref={(el) => {
        if (session.id) registerRef(session.id, el);
      }}
    >
      <IonCardHeader>
        <div className="session-header">
          <div className="session-info">
            <IonCardTitle className="workout-title">{getWorkoutTitle(session)}</IonCardTitle>
            <p className="session-date-full">{formatFullDate(session.sessionDate)}</p>
            {session.workoutPlan && <p className="workout-plan-name">{session.workoutPlan.name}</p>}
          </div>
          <div className="session-badges">
            <IonChip color={getCompletionColor(session.completionRate || 0)}>
              {Math.round((session.completionRate || 0) * 100)}% Complete
            </IonChip>
            <IonButton fill="clear" color="danger" size="small" onClick={() => session.id && onDelete(session.id)}>
              <IonIcon slot="icon-only" icon={trashOutline} />
            </IonButton>
          </div>
        </div>
      </IonCardHeader>

      <IonCardContent>
        <div className="session-meta">
          <div className="meta-item">
            <IonIcon icon={time} />
            <span>{session.durationMinutes} min</span>
          </div>
          <div className="meta-item">
            <IonIcon icon={barbell} />
            <span>
              {displayExercises.length} exercise{displayExercises.length !== 1 ? 's' : ''}
            </span>
          </div>
          {session.difficultyRating && (
            <div className="meta-item">
              <IonBadge color={getDifficultyColor(session.difficultyRating)}>
                Difficulty: {session.difficultyRating}/10
              </IonBadge>
            </div>
          )}
        </div>

        <div className="exercises-detail">
          <h3 className="exercises-title">Exercises</h3>
          <IonList className="exercise-list">
            {displayExercises.map((exercise, idx) => (
              <IonItem
                key={idx}
                lines="none"
                className="exercise-item"
                button
                onClick={() => onExerciseClick(exercise.name)}
              >
                <div className="exercise-content">
                  <div className="exercise-header-row">
                    <IonLabel className="exercise-name">{exercise.name}</IonLabel>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {exercise.completedSets === exercise.sets && (
                        <IonIcon icon={checkmarkCircle} color="success" className="completed-icon" />
                      )}
                      <IonIcon icon={statsChartOutline} color="primary" style={{ fontSize: '18px' }} />
                    </div>
                  </div>
                  <div className="exercise-details-row">
                    <div className="detail-chip">
                      <span className="detail-label">Sets:</span>
                      <span className="detail-value">
                        {exercise.completedSets}/{exercise.sets}
                      </span>
                    </div>
                    <div className="detail-chip">
                      <span className="detail-label">Reps:</span>
                      <span className="detail-value">{exercise.reps}</span>
                    </div>
                    <div className="detail-chip weight-chip">
                      <span className="detail-label">Weight:</span>
                      <span className="detail-value">{exercise.weight}</span>
                    </div>
                  </div>
                </div>
              </IonItem>
            ))}
          </IonList>
        </div>

        {session.notes && (
          <div className="session-notes">
            <h4>Notes</h4>
            <p>{session.notes}</p>
          </div>
        )}
      </IonCardContent>
    </IonCard>
  );
};

export default SessionCard;
