import React, { useState } from 'react';
import {
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { addCircle, closeCircle, fitness } from 'ionicons/icons';
import type { BodyweightExercise } from '../../types';

interface Props {
  bodyweightExercises: BodyweightExercise[];
  onChange: (next: BodyweightExercise[]) => void;
}

const BODYWEIGHT_EXERCISES_WITH_DESC = [
  { name: 'Pull-ups', description: 'Hang from bar, pull body up until chin over bar (palms away)' },
  { name: 'Chin-ups', description: 'Like pull-ups but with palms facing towards you' },
  { name: 'Push-ups', description: 'Standard push-up with hands shoulder-width apart' },
  { name: 'Diamond Push-ups', description: 'Push-ups with hands forming diamond shape, targets triceps' },
  { name: 'Wide Push-ups', description: 'Push-ups with hands wider than shoulders, targets chest' },
  { name: 'Pike Push-ups', description: 'Push-ups with hips raised, targets shoulders' },
  { name: 'Dips', description: 'Lower body between parallel bars, push back up' },
  { name: 'Bodyweight Squats', description: 'Lower hips until thighs parallel to ground, stand back up' },
  { name: 'Jump Squats', description: 'Squat down then explosively jump up' },
  { name: 'Lunges', description: 'Step forward, lower back knee towards ground' },
  { name: 'Walking Lunges', description: 'Lunges moving forward with each rep' },
  { name: 'Burpees', description: 'Squat, kick feet back to plank, push-up, jump back to squat, jump up' },
  { name: 'Mountain Climbers', description: 'Plank position, alternate bringing knees to chest quickly' },
  { name: 'Planks', description: 'Hold body straight in push-up position on forearms (time-based)' },
  { name: 'Sit-ups', description: 'Lie on back, bring torso up to sitting position' },
  { name: 'Crunches', description: 'Like sit-ups but lift shoulders only, lower back stays down' },
  { name: 'Jumping Jacks', description: 'Jump while spreading legs and raising arms overhead' },
  { name: 'High Knees', description: 'Run in place bringing knees up to waist level' },
];

const BODYWEIGHT_EXERCISES = BODYWEIGHT_EXERCISES_WITH_DESC.map((ex) => ex.name);

const ProfileBodyweight: React.FC<Props> = ({ bodyweightExercises, onChange }) => {
  const [showModal, setShowModal] = useState(false);
  const [exerciseToAdd, setExerciseToAdd] = useState('');
  const [maxReps, setMaxReps] = useState<number>(0);

  const resetModal = () => {
    setShowModal(false);
    setExerciseToAdd('');
    setMaxReps(0);
  };

  const handleAdd = () => {
    if (exerciseToAdd && maxReps > 0 && !bodyweightExercises.find((ex) => ex.name === exerciseToAdd)) {
      onChange([...bodyweightExercises, { name: exerciseToAdd, maxReps }]);
      resetModal();
    }
  };

  const handleRemove = (exerciseName: string) => {
    onChange(bodyweightExercises.filter((ex) => ex.name !== exerciseName));
  };

  const handleUpdate = (exerciseName: string, newMaxReps: number) => {
    onChange(bodyweightExercises.map((ex) => (ex.name === exerciseName ? { ...ex, maxReps: newMaxReps } : ex)));
  };

  const remaining = BODYWEIGHT_EXERCISES.filter((ex) => !bodyweightExercises.find((bw) => bw.name === ex));

  return (
    <>
      <IonCard className="bodyweight-card">
        <IonCardContent>
          <div className="equipment-header">
            <h2 className="section-title">
              <IonIcon icon={fitness} /> Bodyweight Exercises
            </h2>
            <IonButton fill="clear" onClick={() => setShowModal(true)}>
              <IonIcon icon={addCircle} slot="start" />
              Add Exercise
            </IonButton>
          </div>

          {bodyweightExercises.length === 0 ? (
            <p className="no-equipment">No bodyweight exercises added yet</p>
          ) : (
            <IonList>
              {bodyweightExercises.map((exercise, index) => (
                <IonItem key={index} lines="full">
                  <IonLabel>
                    <h3>{exercise.name}</h3>
                    <p>Max Reps: {exercise.maxReps}</p>
                  </IonLabel>
                  <IonInput
                    type="number"
                    value={exercise.maxReps}
                    onIonChange={(e) => handleUpdate(exercise.name, parseInt(e.detail.value!) || 0)}
                    placeholder="Max reps"
                    style={{ maxWidth: '80px', textAlign: 'right' }}
                  />
                  <IonIcon
                    icon={closeCircle}
                    color="danger"
                    slot="end"
                    onClick={() => handleRemove(exercise.name)}
                    style={{ cursor: 'pointer', marginLeft: '8px' }}
                  />
                </IonItem>
              ))}
            </IonList>
          )}
        </IonCardContent>
      </IonCard>

      <IonModal isOpen={showModal} onDidDismiss={resetModal}>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Add Bodyweight Exercise</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={resetModal}>Close</IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          <IonList>
            <IonItem>
              <IonLabel position="stacked">Select Exercise</IonLabel>
              <IonSelect
                value={exerciseToAdd}
                onIonChange={(e) => setExerciseToAdd(e.detail.value)}
                placeholder="Choose bodyweight exercise"
              >
                {remaining.map((ex, index) => (
                  <IonSelectOption key={index} value={ex}>
                    {ex}
                  </IonSelectOption>
                ))}
              </IonSelect>
            </IonItem>

            <IonItem>
              <IonLabel position="stacked">Maximum Reps</IonLabel>
              <IonInput
                type="number"
                value={maxReps}
                onIonInput={(e) => setMaxReps(parseInt(e.detail.value!) || 0)}
                placeholder="Enter your max reps (e.g., 15)"
              />
            </IonItem>

            <div style={{ padding: '16px', color: '#666', fontSize: '14px' }}>
              <p>💡 Enter the maximum number of consecutive reps you can do with good form.</p>
              <p>This will help generate appropriate rep ranges in your workouts.</p>
            </div>
          </IonList>
          <div style={{ padding: '16px' }}>
            <IonButton expand="block" onClick={handleAdd} disabled={!exerciseToAdd || maxReps <= 0}>
              Add Exercise
            </IonButton>
          </div>
        </IonContent>
      </IonModal>
    </>
  );
};

export default ProfileBodyweight;
