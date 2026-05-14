import React from 'react';
import { IonCard, IonCardContent, IonInput, IonItem, IonLabel, IonList } from '@ionic/react';
import { FOCUS_LABELS, type PlanDraft } from './types';

interface Props {
  draft: PlanDraft;
  onChange: (patch: Partial<PlanDraft>) => void;
}

/**
 * Step 1 — name + focus. Focus is a single-pick grid of cards so the
 * choice feels like a commitment, not a dropdown.
 */
const FocusStep: React.FC<Props> = ({ draft, onChange }) => (
  <div>
    <IonCard>
      <IonCardContent>
        <IonList>
          <IonItem>
            <IonLabel position="stacked">Plan name</IonLabel>
            <IonInput
              value={draft.name}
              onIonInput={(e) => onChange({ name: e.detail.value || '' })}
              placeholder='e.g. "Marc — fall hypertrophy"'
              maxlength={80}
            />
          </IonItem>
        </IonList>
      </IonCardContent>
    </IonCard>

    <h3 style={{ margin: '20px 16px 8px' }}>Primary focus</h3>
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 12,
        padding: '0 16px 16px',
      }}
    >
      {(Object.keys(FOCUS_LABELS) as Array<keyof typeof FOCUS_LABELS>).map((key) => {
        const selected = draft.focus === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange({ focus: key })}
            style={{
              padding: '20px 12px',
              borderRadius: 14,
              border: selected ? '2px solid var(--ion-color-primary)' : '1px solid #ddd',
              background: selected ? 'rgba(102, 126, 234, 0.08)' : '#fff',
              fontSize: 15,
              fontWeight: selected ? 600 : 500,
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            {FOCUS_LABELS[key]}
          </button>
        );
      })}
    </div>
  </div>
);

export default FocusStep;
