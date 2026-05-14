import React from 'react';
import { IonButton, IonCard, IonCardContent, IonChip, IonIcon, IonLabel, IonSpinner } from '@ionic/react';
import { sparkles } from 'ionicons/icons';
import { FOCUS_LABELS, type PlanDraft } from './types';

interface Props {
  draft: PlanDraft;
  generating: boolean;
  onGenerate: () => void;
}

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div style={{ display: 'flex', gap: 8, padding: '6px 0' }}>
    <span style={{ minWidth: 110, color: '#666', fontSize: 14 }}>{label}</span>
    <span style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{children}</span>
  </div>
);

/**
 * Step 6 — review the payload + tap Generate. Shows the full draft as a
 * scannable summary so the user can catch anything wrong before paying
 * for an AI round-trip. Generate kicks off the POST; the wizard shell
 * advances to Step 7 (chat refinement) on success.
 */
const ReviewStep: React.FC<Props> = ({ draft, generating, onGenerate }) => (
  <div>
    <IonCard>
      <IonCardContent>
        <h3 style={{ margin: '0 0 12px' }}>Review</h3>
        <Row label="Plan name">{draft.name || <em style={{ color: '#aaa' }}>none</em>}</Row>
        <Row label="Focus">
          {draft.focus ? FOCUS_LABELS[draft.focus] : <em style={{ color: '#aaa' }}>not set</em>}
        </Row>
        <Row label="Schedule">{draft.daysPerWeek} days / week · {draft.durationWeeks} weeks</Row>
        <Row label="Intensity">{draft.intensity}</Row>
        {draft.sessionMinutes && <Row label="Session">~{draft.sessionMinutes} min</Row>}
        {draft.injuries && <Row label="Injuries">{draft.injuries}</Row>}
        <Row label="Equipment">
          {draft.equipment.length ? (
            <span style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {draft.equipment.map((e) => (
                <IonChip key={e} color="primary" outline>
                  <IonLabel>{e}</IonLabel>
                </IonChip>
              ))}
            </span>
          ) : (
            <em style={{ color: '#aaa' }}>bodyweight only</em>
          )}
        </Row>
        <Row label="Bodyweight">
          {draft.bodyweight.length ? (
            <span style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {draft.bodyweight.map((b) => (
                <IonChip key={b.name} color="success" outline>
                  <IonLabel>
                    {b.name}: {b.max}
                    {b.unit === 'seconds' ? 's' : ''}
                  </IonLabel>
                </IonChip>
              ))}
            </span>
          ) : (
            <em style={{ color: '#aaa' }}>none</em>
          )}
        </Row>
      </IonCardContent>
    </IonCard>

    <IonButton expand="block" size="large" onClick={onGenerate} disabled={generating} style={{ marginTop: 16 }}>
      {generating ? (
        <>
          <IonSpinner name="dots" />
          &nbsp;Generating plan…
        </>
      ) : (
        <>
          <IonIcon icon={sparkles} slot="start" />
          Generate my plan
        </>
      )}
    </IonButton>
  </div>
);

export default ReviewStep;
