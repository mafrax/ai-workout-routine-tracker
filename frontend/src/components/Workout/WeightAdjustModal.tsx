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
  IonModal,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { close } from 'ionicons/icons';

interface Props {
  isOpen: boolean;
  exerciseName: string;
  currentWeight: string;
  /** Easy/medium/hard suggestions derived from the current weight by the parent. */
  suggestions: { easy: number; medium: number; hard: number };
  onApply: (newWeightKg: number) => void;
  onClose: () => void;
}

/**
 * Modal for adjusting the weight of the current exercise. Offers three
 * quick presets (easy/medium/hard) plus a custom-kg input. The parent
 * computes the suggestions and handles persistence (so this component
 * stays stateless beyond its own custom-input draft).
 */
const WeightAdjustModal: React.FC<Props> = ({
  isOpen,
  exerciseName,
  currentWeight,
  suggestions,
  onApply,
  onClose,
}) => {
  const [customWeight, setCustomWeight] = useState('');

  const handleApplyCustom = () => {
    const parsed = parseFloat(customWeight);
    if (!isNaN(parsed) && parsed > 0) onApply(parsed);
  };

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Adjust Weight</IonTitle>
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
            <h2>{exerciseName}</h2>
            <p style={{ color: '#666' }}>Current: {currentWeight}</p>

            <div style={{ marginTop: '20px' }}>
              <h3>Quick Select</h3>
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <IonButton expand="block" color="success" onClick={() => onApply(suggestions.easy)}>
                  Easy<br />
                  {suggestions.easy}kg
                </IonButton>
                <IonButton expand="block" color="warning" onClick={() => onApply(suggestions.medium)}>
                  Medium<br />
                  {suggestions.medium}kg
                </IonButton>
                <IonButton expand="block" color="danger" onClick={() => onApply(suggestions.hard)}>
                  Hard<br />
                  {suggestions.hard}kg
                </IonButton>
              </div>
            </div>

            <div style={{ marginTop: '30px' }}>
              <h3>Custom Weight</h3>
              <IonInput
                type="number"
                placeholder="Enter weight in kg"
                value={customWeight}
                onIonInput={(e) => setCustomWeight(e.detail.value!)}
                style={{ border: '1px solid #ccc', borderRadius: '4px', marginTop: '10px' }}
              />
              <IonButton
                expand="block"
                style={{ marginTop: '10px' }}
                disabled={!customWeight || parseFloat(customWeight) <= 0}
                onClick={handleApplyCustom}
              >
                Apply Custom Weight
              </IonButton>
            </div>

            <IonText color="medium" style={{ display: 'block', marginTop: '20px', fontSize: '14px' }}>
              <p>💡 This weight will be saved and applied to "{exerciseName}" across all future workouts.</p>
            </IonText>
          </IonCardContent>
        </IonCard>
      </IonContent>
    </IonModal>
  );
};

export default WeightAdjustModal;
