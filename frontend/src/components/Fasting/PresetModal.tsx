import React, { useState, useEffect } from 'react';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonButtons,
  IonIcon,
  IonItem,
  IonLabel,
  IonInput,
} from '@ionic/react';
import { close } from 'ionicons/icons';
import { useFastingStore } from '../../store/useFastingStore';

interface PresetModalProps {
  isOpen: boolean;
  presetId?: string | null;
  onClose: () => void;
}

const PresetModal: React.FC<PresetModalProps> = ({ isOpen, presetId, onClose }) => {
  const { presets, addPreset, updatePreset } = useFastingStore();
  const [name, setName] = useState('');
  const [hours, setHours] = useState(16);
  const [minutes, setMinutes] = useState(0);

  const isEditing = !!presetId;
  const preset = presets.find(p => p.id === presetId);

  useEffect(() => {
    if (preset) {
      setName(preset.name);
      setHours(Math.floor(preset.durationMinutes / 60));
      setMinutes(preset.durationMinutes % 60);
    } else {
      setName('');
      setHours(16);
      setMinutes(0);
    }
  }, [preset, isOpen]);

  const handleSave = () => {
    const durationMinutes = hours * 60 + minutes;

    if (isEditing && presetId) {
      updatePreset(presetId, name, durationMinutes);
    } else {
      addPreset(name, durationMinutes);
    }

    onClose();
  };

  const isValid = name.trim().length > 0 && (hours > 0 || minutes > 0);

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{isEditing ? 'Edit Preset' : 'Add Preset'}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onClose}>
              <IonIcon icon={close} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <IonItem>
          <IonLabel position="stacked">Preset Name</IonLabel>
          <IonInput
            value={name}
            placeholder="e.g., Weekday Fast"
            onIonInput={(e) => setName(e.detail.value || '')}
          />
        </IonItem>

        <IonItem style={{ marginTop: '1rem' }}>
          <IonLabel position="stacked">Hours</IonLabel>
          <IonInput
            type="number"
            value={hours}
            min={0}
            max={48}
            onIonInput={(e) => setHours(parseInt(e.detail.value || '0'))}
          />
        </IonItem>

        <IonItem>
          <IonLabel position="stacked">Minutes</IonLabel>
          <IonInput
            type="number"
            value={minutes}
            min={0}
            max={59}
            onIonInput={(e) => setMinutes(parseInt(e.detail.value || '0'))}
          />
        </IonItem>

        <IonButton
          expand="block"
          onClick={handleSave}
          disabled={!isValid}
          style={{ marginTop: '2rem' }}
        >
          {isEditing ? 'Update Preset' : 'Add Preset'}
        </IonButton>
      </IonContent>
    </IonModal>
  );
};

export default PresetModal;
