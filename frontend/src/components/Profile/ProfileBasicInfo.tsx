import React from 'react';
import {
  IonCard,
  IonCardContent,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonSelect,
  IonSelectOption,
} from '@ionic/react';
import { person } from 'ionicons/icons';

interface Props {
  name: string;
  onNameChange: (v: string) => void;
  email: string;
  onEmailChange: (v: string) => void;
  age: number;
  onAgeChange: (v: number) => void;
  weight: number;
  onWeightChange: (v: number) => void;
  height: number;
  onHeightChange: (v: number) => void;
  fitnessLevel: string;
  onFitnessLevelChange: (v: string) => void;
}

/**
 * Personal Information card — pure controlled form.
 * Parent owns the values and the persistence (Save Profile button).
 */
const ProfileBasicInfo: React.FC<Props> = ({
  name,
  onNameChange,
  email,
  onEmailChange,
  age,
  onAgeChange,
  weight,
  onWeightChange,
  height,
  onHeightChange,
  fitnessLevel,
  onFitnessLevelChange,
}) => (
  <IonCard className="profile-card">
    <IonCardContent>
      <h2 className="section-title">
        <IonIcon icon={person} /> Personal Information
      </h2>

      <IonList>
        <IonItem>
          <IonLabel position="stacked">Name</IonLabel>
          <IonInput value={name} onIonInput={(e) => onNameChange(e.detail.value!)} placeholder="Your name" />
        </IonItem>
        <IonItem>
          <IonLabel position="stacked">Email</IonLabel>
          <IonInput
            type="email"
            value={email}
            onIonInput={(e) => onEmailChange(e.detail.value!)}
            placeholder="your.email@example.com"
          />
        </IonItem>
        <IonItem>
          <IonLabel position="stacked">Age</IonLabel>
          <IonInput
            type="number"
            value={age}
            onIonInput={(e) => onAgeChange(parseInt(e.detail.value!) || 0)}
            placeholder="25"
          />
        </IonItem>
        <IonItem>
          <IonLabel position="stacked">Weight (kg)</IonLabel>
          <IonInput
            type="number"
            value={weight}
            onIonInput={(e) => onWeightChange(parseInt(e.detail.value!) || 0)}
            placeholder="70"
          />
        </IonItem>
        <IonItem>
          <IonLabel position="stacked">Height (cm)</IonLabel>
          <IonInput
            type="number"
            value={height}
            onIonInput={(e) => onHeightChange(parseInt(e.detail.value!) || 0)}
            placeholder="175"
          />
        </IonItem>
        <IonItem>
          <IonLabel position="stacked">Fitness Level</IonLabel>
          <IonSelect value={fitnessLevel} onIonChange={(e) => onFitnessLevelChange(e.detail.value)}>
            <IonSelectOption value="beginner">Beginner</IonSelectOption>
            <IonSelectOption value="intermediate">Intermediate</IonSelectOption>
            <IonSelectOption value="advanced">Advanced</IonSelectOption>
          </IonSelect>
        </IonItem>
      </IonList>
    </IonCardContent>
  </IonCard>
);

export default ProfileBasicInfo;
