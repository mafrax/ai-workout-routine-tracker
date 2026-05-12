import React from 'react';
import { IonChip, IonLabel } from '@ionic/react';
import type { ExerciseAttributes } from '../../types/workout';

interface Props {
  attributes?: ExerciseAttributes | null;
}

/**
 * Compact equipment-specific detail strip rendered under the main reps/weight
 * row in the workout execution UI. Renders nothing if the exercise has no
 * special attributes — most exercises don't need this.
 *
 * Adding a new variant: extend the switch below and the matching parser case
 * in WorkoutGenerationService.detectAttributes (server side).
 */
const AttributeStrip: React.FC<Props> = ({ attributes }) => {
  if (!attributes) return null;

  const chips: string[] = [];
  switch (attributes.kind) {
    case 'dumbbells':
      chips.push(`Each hand: ${attributes.weightPerHandKg} kg`);
      if (attributes.grip) chips.push(`Grip: ${attributes.grip}`);
      break;
    case 'incline-bench':
      chips.push(`Bench angle: ${attributes.angleDeg}°`);
      break;
    case 'cable':
      chips.push(`Pulley: ${attributes.pulleyHeight}`);
      if (attributes.attachment) chips.push(`Attachment: ${attributes.attachment}`);
      break;
    case 'band':
      chips.push(`Band: ${attributes.resistance}`);
      break;
    case 'machine':
      if (attributes.settings) {
        for (const [k, v] of Object.entries(attributes.settings)) chips.push(`${k}: ${v}`);
      }
      break;
  }

  if (chips.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
      {chips.map((c) => (
        <IonChip key={c} color="primary" outline>
          <IonLabel>{c}</IonLabel>
        </IonChip>
      ))}
    </div>
  );
};

export default AttributeStrip;
