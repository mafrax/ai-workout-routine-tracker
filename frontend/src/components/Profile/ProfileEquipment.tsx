import React, { useState } from 'react';
import {
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonChip,
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
import { addCircle, barbell, cloudUploadOutline, closeCircle } from 'ionicons/icons';
import EquipmentPhotoCapture from '../Equipment/EquipmentPhotoCapture';

interface Props {
  availableEquipment: string[];
  onChange: (next: string[], opts?: { afterPhoto?: boolean }) => void;
}

const EQUIPMENT_OPTIONS = [
  // Technogym Equipment
  'Treadmill (Technogym)',
  'Elliptical (Technogym)',
  'Stationary Bike (Technogym)',
  'Rowing Machine (Technogym)',
  'Technogym Chest Press',
  'Technogym Leg Press',
  'Technogym Lat Pulldown',
  'Technogym Cable Machine',
  'Technogym Leg Extension',
  'Technogym Leg Curl',
  'Technogym Shoulder Press',
  'Technogym Smith Machine',
  // Free Weights & Other
  'Dumbbells',
  'Barbells',
  'Kettlebells',
  'Weight Plates',
  'Pull-up Bar',
  'Dip Station',
  'Resistance Bands',
  'Medicine Ball',
  'Foam Roller',
  'Bench',
  'Squat Rack',
  'Box (for box jumps)',
  'Jump Rope',
  'Ab Wheel',
  'Battle Ropes',
  'TRX/Suspension Trainer',
];

/**
 * Available Equipment card.
 * - "Detect from photo" launches the vision-capture modal.
 * - "Add Equipment" launches a manual picker (chosen from list OR free text).
 * - Removing a chip notifies parent so the regenerate banner can appear.
 *
 * `onChange(next, { afterPhoto })` fires for any equipment change. The
 * `afterPhoto` flag lets the parent know whether the change already
 * persisted through the vision endpoint, so it can choose to skip a
 * second save.
 */
const ProfileEquipment: React.FC<Props> = ({ availableEquipment, onChange }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [equipmentToAdd, setEquipmentToAdd] = useState('');
  const [customEquipment, setCustomEquipment] = useState('');
  const [useCustomInput, setUseCustomInput] = useState(false);

  const remaining = EQUIPMENT_OPTIONS.filter((eq) => !availableEquipment.includes(eq));

  const resetModal = () => {
    setShowAddModal(false);
    setUseCustomInput(false);
    setCustomEquipment('');
    setEquipmentToAdd('');
  };

  const handleManualAdd = () => {
    const name = useCustomInput ? customEquipment.trim() : equipmentToAdd;
    if (name && !availableEquipment.includes(name)) {
      onChange([...availableEquipment, name]);
      resetModal();
    }
  };

  const handleRemove = (equipment: string) => {
    onChange(availableEquipment.filter((e) => e !== equipment));
  };

  return (
    <>
      <IonCard className="equipment-card">
        <IonCardContent>
          <div className="equipment-header">
            <h2 className="section-title">
              <IonIcon icon={barbell} /> Available Equipment
            </h2>
            <div style={{ display: 'flex', gap: 4 }}>
              <IonButton fill="clear" onClick={() => setShowPhotoModal(true)}>
                <IonIcon icon={cloudUploadOutline} slot="start" />
                Detect from photo
              </IonButton>
              <IonButton fill="clear" onClick={() => setShowAddModal(true)}>
                <IonIcon icon={addCircle} slot="start" />
                Add Equipment
              </IonButton>
            </div>
          </div>

          <div className="equipment-chips">
            {availableEquipment.length === 0 ? (
              <p className="no-equipment">No equipment added yet</p>
            ) : (
              availableEquipment.map((equipment, index) => (
                <IonChip key={index} color="primary">
                  <IonLabel>{equipment}</IonLabel>
                  <IonIcon icon={closeCircle} onClick={() => handleRemove(equipment)} />
                </IonChip>
              ))
            )}
          </div>
        </IonCardContent>
      </IonCard>

      <EquipmentPhotoCapture
        isOpen={showPhotoModal}
        existingEquipment={availableEquipment}
        onConfirm={(next) => {
          setShowPhotoModal(false);
          onChange(next, { afterPhoto: true });
        }}
        onClose={() => setShowPhotoModal(false)}
      />

      <IonModal isOpen={showAddModal} onDidDismiss={resetModal}>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Add Equipment</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={resetModal}>Close</IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          <IonList>
            <IonItem>
              <IonLabel>
                <IonButton
                  fill={!useCustomInput ? 'solid' : 'outline'}
                  size="small"
                  onClick={() => setUseCustomInput(false)}
                  style={{ marginRight: '8px' }}
                >
                  Choose from List
                </IonButton>
                <IonButton fill={useCustomInput ? 'solid' : 'outline'} size="small" onClick={() => setUseCustomInput(true)}>
                  Type Custom
                </IonButton>
              </IonLabel>
            </IonItem>

            {!useCustomInput ? (
              <IonItem>
                <IonLabel position="stacked">Select Equipment</IonLabel>
                <IonSelect
                  value={equipmentToAdd}
                  onIonChange={(e) => setEquipmentToAdd(e.detail.value)}
                  placeholder="Choose equipment"
                >
                  {remaining.map((eq, index) => (
                    <IonSelectOption key={index} value={eq}>
                      {eq}
                    </IonSelectOption>
                  ))}
                </IonSelect>
              </IonItem>
            ) : (
              <IonItem>
                <IonLabel position="stacked">Custom Equipment Name</IonLabel>
                <IonInput
                  value={customEquipment}
                  onIonInput={(e) => setCustomEquipment(e.detail.value!)}
                  placeholder="Enter equipment name (e.g., Battle Ropes)"
                />
              </IonItem>
            )}
          </IonList>
          <div style={{ padding: '16px' }}>
            <IonButton
              expand="block"
              onClick={handleManualAdd}
              disabled={useCustomInput ? !customEquipment.trim() : !equipmentToAdd}
            >
              Add Equipment
            </IonButton>
          </div>
        </IonContent>
      </IonModal>
    </>
  );
};

export default ProfileEquipment;
