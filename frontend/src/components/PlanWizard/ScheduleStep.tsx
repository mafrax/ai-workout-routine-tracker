import React from 'react';
import { IonCard, IonCardContent } from '@ionic/react';
import type { PlanDraft } from './types';

interface Props {
  draft: PlanDraft;
  onChange: (patch: Partial<PlanDraft>) => void;
}

const DAY_OPTIONS = [2, 3, 4, 5, 6];
const WEEK_OPTIONS = [4, 8, 12];

const Pill: React.FC<{
  label: string;
  selected: boolean;
  onClick: () => void;
}> = ({ label, selected, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    style={{
      padding: '10px 18px',
      borderRadius: 999,
      border: selected ? '2px solid var(--ion-color-primary)' : '1px solid #ddd',
      background: selected ? 'var(--ion-color-primary)' : '#fff',
      color: selected ? '#fff' : '#333',
      fontSize: 15,
      fontWeight: 600,
      cursor: 'pointer',
    }}
  >
    {label}
  </button>
);

/**
 * Step 2 — schedule: days per week + plan length in weeks.
 */
const ScheduleStep: React.FC<Props> = ({ draft, onChange }) => (
  <div>
    <IonCard>
      <IonCardContent>
        <h3 style={{ margin: '0 0 12px' }}>Days per week</h3>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {DAY_OPTIONS.map((n) => (
            <Pill key={n} label={`${n}`} selected={draft.daysPerWeek === n} onClick={() => onChange({ daysPerWeek: n })} />
          ))}
        </div>
        <p style={{ marginTop: 12, color: '#666', fontSize: 13 }}>
          The AI will produce one workout per training day; the rest is rest.
        </p>
      </IonCardContent>
    </IonCard>

    <IonCard>
      <IonCardContent>
        <h3 style={{ margin: '0 0 12px' }}>Plan length</h3>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {WEEK_OPTIONS.map((n) => (
            <Pill
              key={n}
              label={`${n} weeks`}
              selected={draft.durationWeeks === n}
              onClick={() => onChange({ durationWeeks: n })}
            />
          ))}
        </div>
        <p style={{ marginTop: 12, color: '#666', fontSize: 13 }}>
          You can always regenerate or extend later from the plan details page.
        </p>
      </IonCardContent>
    </IonCard>
  </div>
);

export default ScheduleStep;
