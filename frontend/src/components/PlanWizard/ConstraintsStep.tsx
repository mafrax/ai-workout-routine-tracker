import React from 'react';
import {
  IonCard,
  IonCardContent,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonTextarea,
} from '@ionic/react';
import type { PlanDraft } from './types';

interface Props {
  draft: PlanDraft;
  onChange: (patch: Partial<PlanDraft>) => void;
}

const INTENSITY_OPTIONS: PlanDraft['intensity'][] = ['easy', 'moderate', 'hard'];

/**
 * Step 5 — constraints. Optional free-text for injuries, an optional
 * session-minute target, and a 3-tier intensity preference.
 */
const ConstraintsStep: React.FC<Props> = ({ draft, onChange }) => (
  <div>
    <IonCard>
      <IonCardContent>
        <IonList>
          <IonItem>
            <IonLabel position="stacked">Injuries or limitations (optional)</IonLabel>
            <IonTextarea
              rows={3}
              value={draft.injuries}
              onIonInput={(e) => onChange({ injuries: e.detail.value || '' })}
              placeholder="e.g. previous shoulder impingement, avoid overhead press"
              maxlength={500}
            />
          </IonItem>

          <IonItem>
            <IonLabel position="stacked">Target session length (minutes, optional)</IonLabel>
            <IonInput
              type="number"
              value={draft.sessionMinutes ?? ''}
              onIonInput={(e) =>
                onChange({ sessionMinutes: e.detail.value ? parseInt(e.detail.value, 10) : undefined })
              }
              placeholder="e.g. 45"
            />
          </IonItem>
        </IonList>
      </IonCardContent>
    </IonCard>

    <IonCard>
      <IonCardContent>
        <h3 style={{ margin: '0 0 12px' }}>Intensity preference</h3>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {INTENSITY_OPTIONS.map((intensity) => {
            const selected = draft.intensity === intensity;
            return (
              <button
                key={intensity}
                type="button"
                onClick={() => onChange({ intensity })}
                style={{
                  flex: 1,
                  padding: '12px 0',
                  borderRadius: 12,
                  border: selected ? '2px solid var(--ion-color-primary)' : '1px solid #ddd',
                  background: selected ? 'var(--ion-color-primary)' : '#fff',
                  color: selected ? '#fff' : '#333',
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                }}
              >
                {intensity}
              </button>
            );
          })}
        </div>
      </IonCardContent>
    </IonCard>
  </div>
);

export default ConstraintsStep;
