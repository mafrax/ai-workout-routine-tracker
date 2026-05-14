import React from 'react';
import { IonButton, IonCard, IonCardContent, IonChip, IonIcon, IonLabel } from '@ionic/react';
import { addCircle, barbell, closeCircle, cloudUploadOutline } from 'ionicons/icons';
import ProfileEquipment from '../Profile/ProfileEquipment';
import type { PlanDraft } from './types';

interface Props {
  draft: PlanDraft;
  onChange: (patch: Partial<PlanDraft>) => void;
}

/**
 * Step 3 — equipment. Three paths surface as buttons:
 *   1. Add manually (in-page chip editor — reuses ProfileEquipment UI)
 *   2. Detect from photo (vision endpoint via ProfileEquipment's modal)
 *   3. Skip (the wizard proceeds with whatever is in the draft already,
 *      including nothing -> bodyweight-only)
 *
 * We reuse ProfileEquipment because the UI is identical; the parent
 * just receives onChange callbacks and threads them into the draft.
 */
const EquipmentStep: React.FC<Props> = ({ draft, onChange }) => {
  return (
    <div>
      <IonCard color="light">
        <IonCardContent>
          <p style={{ margin: 0 }}>
            What can you actually use during your sessions? The AI will only program exercises that fit
            this list. Photos work best for fast gym audits; manual works best when you're remembering
            from memory.
          </p>
        </IonCardContent>
      </IonCard>

      {/* Reuse the equipment chip editor + photo modal from Profile. */}
      <ProfileEquipment
        availableEquipment={draft.equipment}
        onChange={(next) => onChange({ equipment: next })}
      />

      {draft.equipment.length === 0 && (
        <IonCard color="warning" style={{ marginTop: 12 }}>
          <IonCardContent>
            <strong>No equipment — bodyweight only</strong>
            <p style={{ margin: '6px 0 0', fontSize: 14 }}>
              That's fine. The plan will use bodyweight exercises (with your max-reps / max-hold
              calibrations from the next step). Tap Next to continue.
            </p>
          </IonCardContent>
        </IonCard>
      )}
    </div>
  );
};

export default EquipmentStep;
