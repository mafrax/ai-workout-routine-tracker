import React from 'react';
import {
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonChip,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonModal,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { calendar, checkmarkCircle, close, copy, fitness, send, time } from 'ionicons/icons';

interface NextWorkout {
  day: string;
  exercises: string[];
}

interface Plan {
  id: number | string;
  name: string;
  description?: string;
  daysPerWeek?: number;
  durationWeeks?: number;
  isActive?: boolean;
  telegramPreviewHour?: number | null;
  reminderTime?: string | null;
  planDetails?: string;
}

interface Props {
  isOpen: boolean;
  plan: Plan | null;
  /** parser owned by parent so the modal stays presentational */
  parseNextWorkouts: (planDetails: string, count?: number) => NextWorkout[];
  onCopyDetails: (plan: Plan) => void;
  onSendWorkoutPreview: (plan: Plan) => void;
  onUpdateTelegramHour: (plan: Plan, hour: number) => void;
  onUpdateReminderTime: (plan: Plan, time: string) => void;
  onClose: () => void;
}

const TELEGRAM_HOURS = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];

/**
 * "View Details" modal for a workout plan. Shows description, schedule
 * chips, Telegram preview controls, a daily reminder-time picker, and a
 * preview of the next 4 workouts parsed from `planDetails`.
 *
 * Stateless: the parent owns the plan and all mutations; this component
 * just renders and forwards user intent.
 */
const PlanDetailsModal: React.FC<Props> = ({
  isOpen,
  plan,
  parseNextWorkouts,
  onCopyDetails,
  onSendWorkoutPreview,
  onUpdateTelegramHour,
  onUpdateReminderTime,
  onClose,
}) => {
  if (!plan) {
    return (
      <IonModal isOpen={isOpen} onDidDismiss={onClose}>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="end">
              <IonButton onClick={onClose}>
                <IonIcon icon={close} />
              </IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent />
      </IonModal>
    );
  }

  const nextWorkouts = parseNextWorkouts(plan.planDetails || '');
  const hasNoExercises = nextWorkouts.length === 0 || nextWorkouts.every((w) => w.exercises.length === 0);

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{plan.name}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => onCopyDetails(plan)}>
              <IonIcon icon={copy} />
            </IonButton>
            <IonButton onClick={onClose}>
              <IonIcon icon={close} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div style={{ padding: '20px' }}>
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ marginBottom: '8px', color: 'var(--brand-primary)' }}>Description</h3>
            <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>{plan.description}</p>
          </div>

          <div style={{ marginBottom: '20px', display: 'flex', gap: '12px' }}>
            <IonChip color="primary">
              <IonIcon icon={calendar} />
              <IonLabel>{plan.daysPerWeek} days/week</IonLabel>
            </IonChip>
            <IonChip color="primary">
              <IonIcon icon={fitness} />
              <IonLabel>{plan.durationWeeks} weeks</IonLabel>
            </IonChip>
            {plan.isActive && (
              <IonChip color="success">
                <IonIcon icon={checkmarkCircle} />
                <IonLabel>Active</IonLabel>
              </IonChip>
            )}
          </div>

          <IonCard color="secondary" style={{ marginBottom: '20px' }}>
            <IonCardContent>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <IonIcon icon={send} style={{ fontSize: '20px' }} />
                  <strong>Telegram Workout Preview</strong>
                </div>
                <IonButton size="small" fill="solid" onClick={() => onSendWorkoutPreview(plan)}>
                  <IonIcon icon={send} slot="start" />
                  Send Now
                </IonButton>
              </div>
              <p style={{ fontSize: '14px', marginBottom: '12px', opacity: 0.9 }}>
                Get your next workout details sent directly to Telegram
              </p>
              <div style={{ marginTop: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <IonIcon icon={time} />
                  <span style={{ fontSize: '14px', fontWeight: '500' }}>Daily preview time:</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {TELEGRAM_HOURS.map((hour) => (
                    <IonButton
                      key={hour}
                      size="small"
                      fill={plan.telegramPreviewHour === hour ? 'solid' : 'outline'}
                      color={plan.telegramPreviewHour === hour ? 'primary' : 'medium'}
                      onClick={() => onUpdateTelegramHour(plan, hour)}
                    >
                      {hour}:00
                    </IonButton>
                  ))}
                </div>
              </div>
              <p style={{ fontSize: '12px', marginTop: '8px', opacity: 0.7 }}>
                Note: Scheduled messages require a backend service. Use "Send Now" for manual previews.
              </p>
            </IonCardContent>
          </IonCard>

          <IonCard color="secondary" style={{ marginBottom: '20px' }}>
            <IonCardContent>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <IonIcon icon={time} style={{ fontSize: '20px' }} />
                <strong>Workout Reminder Time</strong>
              </div>
              <p style={{ fontSize: '14px', marginBottom: '12px', opacity: 0.9 }}>
                Set a daily reminder time for this workout plan
              </p>
              <IonItem>
                <IonInput
                  type="time"
                  value={plan.reminderTime || ''}
                  placeholder="Select time"
                  onIonChange={(e) => {
                    if (e.detail.value) onUpdateReminderTime(plan, e.detail.value);
                  }}
                />
              </IonItem>
              <p style={{ fontSize: '12px', marginTop: '8px', opacity: 0.7 }}>
                {plan.reminderTime ? `Daily reminder set for ${plan.reminderTime}` : 'No reminder time set'}
              </p>
            </IonCardContent>
          </IonCard>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, color: 'var(--brand-primary)' }}>Next 4 Workouts</h3>
            </div>
            {hasNoExercises ? (
              <IonCard>
                <IonCardContent>
                  <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>
                    No exercises found. This plan may be in an old format.
                  </p>
                </IonCardContent>
              </IonCard>
            ) : (
              nextWorkouts.map((workout, idx) => (
                <IonCard key={idx} style={{ marginBottom: '12px' }}>
                  <IonCardHeader>
                    <IonCardTitle style={{ fontSize: '16px' }}>{workout.day}</IonCardTitle>
                  </IonCardHeader>
                  <IonCardContent>
                    <div style={{ fontSize: '14px', lineHeight: '1.8' }}>
                      {workout.exercises.slice(0, 5).map((exercise, exIdx) => (
                        <div key={exIdx} style={{ marginBottom: '4px', color: 'var(--text-secondary)' }}>
                          {exercise}
                        </div>
                      ))}
                      {workout.exercises.length > 5 && (
                        <div style={{ marginTop: '8px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          +{workout.exercises.length - 5} more exercises...
                        </div>
                      )}
                    </div>
                  </IonCardContent>
                </IonCard>
              ))
            )}
          </div>
        </div>
      </IonContent>
    </IonModal>
  );
};

export default PlanDetailsModal;
