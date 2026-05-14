import React, { useEffect, useState } from 'react';
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
import { defaultUnitFor } from '../../utils/bodyweight';

interface Props {
  bodyweightExercises: BodyweightExercise[];
  onChange: (next: BodyweightExercise[]) => void;
}

const BODYWEIGHT_EXERCISE_NAMES = [
  // rep-based
  'Pull-ups',
  'Chin-ups',
  'Push-ups',
  'Diamond Push-ups',
  'Wide Push-ups',
  'Pike Push-ups',
  'Dips',
  'Bodyweight Squats',
  'Jump Squats',
  'Lunges',
  'Walking Lunges',
  'Burpees',
  'Mountain Climbers',
  'Sit-ups',
  'Crunches',
  'Jumping Jacks',
  'High Knees',
  // time-based
  'Plank',
  'Side Plank',
  'Wall Sit',
  'L-sit',
  'Hollow Hold',
  'Superman Hold',
  'Dead Hang',
];

const labelForUnit = (unit: 'reps' | 'seconds') =>
  unit === 'seconds' ? 'Max hold (sec)' : 'Max reps';

const ProfileBodyweight: React.FC<Props> = ({ bodyweightExercises, onChange }) => {
  const [showModal, setShowModal] = useState(false);
  const [exerciseToAdd, setExerciseToAdd] = useState('');
  const [unit, setUnit] = useState<'reps' | 'seconds'>('reps');
  const [maxValue, setMaxValue] = useState<number>(0);

  // Auto-pick the unit when the user selects an exercise; they can still
  // override via the toggle.
  useEffect(() => {
    if (!exerciseToAdd) return;
    setUnit(defaultUnitFor(exerciseToAdd));
  }, [exerciseToAdd]);

  const resetModal = () => {
    setShowModal(false);
    setExerciseToAdd('');
    setUnit('reps');
    setMaxValue(0);
  };

  const handleAdd = () => {
    if (exerciseToAdd && maxValue > 0 && !bodyweightExercises.find((ex) => ex.name === exerciseToAdd)) {
      onChange([...bodyweightExercises, { name: exerciseToAdd, unit, max: maxValue }]);
      resetModal();
    }
  };

  const handleRemove = (exerciseName: string) => {
    onChange(bodyweightExercises.filter((ex) => ex.name !== exerciseName));
  };

  const handleUpdateMax = (exerciseName: string, newMax: number) => {
    onChange(
      bodyweightExercises.map((ex) => (ex.name === exerciseName ? { ...ex, max: newMax } : ex))
    );
  };

  const remaining = BODYWEIGHT_EXERCISE_NAMES.filter(
    (ex) => !bodyweightExercises.find((bw) => bw.name === ex)
  );

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
                    <p>
                      {exercise.unit === 'seconds' ? 'Max hold' : 'Max reps'}: {exercise.max}
                      {exercise.unit === 'seconds' ? 's' : ''}
                    </p>
                  </IonLabel>
                  <IonInput
                    type="number"
                    value={exercise.max}
                    onIonChange={(e) => handleUpdateMax(exercise.name, parseInt(e.detail.value!) || 0)}
                    placeholder={exercise.unit === 'seconds' ? 'Seconds' : 'Reps'}
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
              <IonLabel position="stacked">Measured in</IonLabel>
              <IonSelect value={unit} onIonChange={(e) => setUnit(e.detail.value)}>
                <IonSelectOption value="reps">Reps (count)</IonSelectOption>
                <IonSelectOption value="seconds">Seconds (hold time)</IonSelectOption>
              </IonSelect>
            </IonItem>

            <IonItem>
              <IonLabel position="stacked">{labelForUnit(unit)}</IonLabel>
              <IonInput
                type="number"
                value={maxValue}
                onIonInput={(e) => setMaxValue(parseInt(e.detail.value!) || 0)}
                placeholder={
                  unit === 'seconds' ? 'Enter your max hold (e.g., 60)' : 'Enter your max reps (e.g., 15)'
                }
              />
            </IonItem>

            <div style={{ padding: '16px', color: '#666', fontSize: '14px' }}>
              {unit === 'seconds' ? (
                <>
                  <p>💡 Enter the longest hold you can sustain with good form, in seconds.</p>
                  <p>The AI uses this as a hard cap when programming static holds.</p>
                </>
              ) : (
                <>
                  <p>💡 Enter the maximum number of consecutive reps you can do with good form.</p>
                  <p>The AI uses this as a hard cap when programming this exercise.</p>
                </>
              )}
            </div>
          </IonList>
          <div style={{ padding: '16px' }}>
            <IonButton expand="block" onClick={handleAdd} disabled={!exerciseToAdd || maxValue <= 0}>
              Add Exercise
            </IonButton>
          </div>
        </IonContent>
      </IonModal>
    </>
  );
};

export default ProfileBodyweight;
