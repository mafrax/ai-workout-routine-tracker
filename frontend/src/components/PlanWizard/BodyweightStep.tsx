import React from 'react';
import { IonCard, IonCardContent } from '@ionic/react';
import ProfileBodyweight from '../Profile/ProfileBodyweight';
import type { PlanDraft } from './types';

interface Props {
  draft: PlanDraft;
  onChange: (patch: Partial<PlanDraft>) => void;
}

/**
 * Step 4 — bodyweight exercises with personal max calibration.
 * Reuses the ProfileBodyweight UI (which already understands the
 * rep / seconds unit distinction). The AI takes these as hard caps.
 */
const BodyweightStep: React.FC<Props> = ({ draft, onChange }) => (
  <div>
    <IonCard color="light">
      <IonCardContent>
        <p style={{ margin: 0 }}>
          Pick bodyweight exercises you do regularly and enter your honest current max — reps for
          movements like Pull-ups, seconds for static holds like Plank. The AI will never schedule
          more than your cap.
        </p>
        <p style={{ margin: '8px 0 0', color: '#666', fontSize: 13 }}>
          You can skip this if you don't want bodyweight exercises in the plan, or add them later
          from your profile.
        </p>
      </IonCardContent>
    </IonCard>

    <ProfileBodyweight
      bodyweightExercises={draft.bodyweight}
      onChange={(next) => onChange({ bodyweight: next })}
    />
  </div>
);

export default BodyweightStep;
