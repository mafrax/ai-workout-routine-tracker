import React, { useState } from 'react';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonList,
  IonItem,
  IonLabel,
  IonInput,
  IonButton,
  IonTextarea,
  IonSelect,
  IonSelectOption,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
} from '@ionic/react';
import { useStore } from '../../store/useStore';
import { workoutSessionApi } from '../../services/api';
import type { WorkoutSession } from '../../types';
import './WorkoutLog.css';

const WorkoutLog: React.FC = () => {
  const { user } = useStore();
  const [durationMinutes, setDurationMinutes] = useState<number>(0);
  const [exercises, setExercises] = useState('');
  const [completionRate, setCompletionRate] = useState<number>(1.0);
  const [difficultyRating, setDifficultyRating] = useState<number>(5);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!user?.id) return;

    setSaving(true);
    try {
      const session: WorkoutSession = {
        userId: user.id,
        sessionDate: new Date().toISOString(),
        durationMinutes,
        exercises,
        completionRate,
        difficultyRating,
        notes,
      };

      await workoutSessionApi.create(session);

      // Reset form
      setDurationMinutes(0);
      setExercises('');
      setCompletionRate(1.0);
      setDifficultyRating(5);
      setNotes('');

      alert('Workout logged successfully!');
    } catch (error) {
      console.error('Error logging workout:', error);
      alert('Error logging workout. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Log Workout</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <IonCard>
          <IonCardHeader>
            <IonCardTitle>Workout Details</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <IonList>
              <IonItem>
                <IonLabel position="stacked">Duration (minutes)</IonLabel>
                <IonInput
                  type="number"
                  value={durationMinutes}
                  onIonInput={(e) => setDurationMinutes(parseInt(e.detail.value!) || 0)}
                />
              </IonItem>

              <IonItem>
                <IonLabel position="stacked">Exercises Performed</IonLabel>
                <IonTextarea
                  placeholder="E.g., Push-ups: 3x10, Squats: 3x15..."
                  value={exercises}
                  onIonInput={(e) => setExercises(e.detail.value!)}
                  rows={4}
                />
              </IonItem>

              <IonItem>
                <IonLabel position="stacked">Completion Rate</IonLabel>
                <IonSelect
                  value={completionRate}
                  onIonChange={(e) => setCompletionRate(e.detail.value)}
                >
                  <IonSelectOption value={1.0}>100% - Completed All</IonSelectOption>
                  <IonSelectOption value={0.9}>90%</IonSelectOption>
                  <IonSelectOption value={0.8}>80%</IonSelectOption>
                  <IonSelectOption value={0.7}>70%</IonSelectOption>
                  <IonSelectOption value={0.6}>60%</IonSelectOption>
                  <IonSelectOption value={0.5}>50%</IonSelectOption>
                </IonSelect>
              </IonItem>

              <IonItem>
                <IonLabel position="stacked">Difficulty Rating (1-10)</IonLabel>
                <IonSelect
                  value={difficultyRating}
                  onIonChange={(e) => setDifficultyRating(e.detail.value)}
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rating) => (
                    <IonSelectOption key={rating} value={rating}>
                      {rating} {rating <= 3 ? '(Easy)' : rating <= 6 ? '(Moderate)' : '(Hard)'}
                    </IonSelectOption>
                  ))}
                </IonSelect>
              </IonItem>

              <IonItem>
                <IonLabel position="stacked">Notes (Optional)</IonLabel>
                <IonTextarea
                  placeholder="How did you feel? Any challenges?"
                  value={notes}
                  onIonInput={(e) => setNotes(e.detail.value!)}
                  rows={3}
                />
              </IonItem>
            </IonList>

            <IonButton
              expand="block"
              onClick={handleSubmit}
              disabled={saving || !exercises.trim()}
              className="submit-button"
            >
              {saving ? 'Saving...' : 'Log Workout'}
            </IonButton>
          </IonCardContent>
        </IonCard>
      </IonContent>
    </IonPage>
  );
};

export default WorkoutLog;
