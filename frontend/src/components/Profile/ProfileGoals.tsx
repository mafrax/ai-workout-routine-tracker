import React from 'react';
import { IonCard, IonCardContent, IonChip, IonIcon, IonLabel } from '@ionic/react';
import { checkmarkCircle, fitness } from 'ionicons/icons';

interface Props {
  goals: string[];
  onChange: (next: string[]) => void;
}

const FITNESS_GOALS = [
  'Build Muscle',
  'Lose Weight',
  'Improve Strength',
  'Increase Endurance',
  'General Fitness',
  'Athletic Performance',
  'Flexibility',
  'Rehabilitation',
];

/**
 * Editable goals card. Tap a chip to toggle it on/off; selections
 * persist when Save Profile is tapped (parent owns the state).
 */
const ProfileGoals: React.FC<Props> = ({ goals, onChange }) => {
  const toggle = (goal: string) => {
    onChange(goals.includes(goal) ? goals.filter((g) => g !== goal) : [...goals, goal]);
  };

  return (
    <IonCard className="goals-card">
      <IonCardContent>
        <h2 className="section-title">
          <IonIcon icon={fitness} /> Fitness Goals
        </h2>
        <p style={{ margin: '4px 0 12px', color: '#666', fontSize: 13 }}>
          Tap to pick the goals you want the AI to optimise your plan for. At least one is required
          before you can create a plan.
        </p>
        <div className="goals-chips" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {FITNESS_GOALS.map((goal) => {
            const selected = goals.includes(goal);
            return (
              <IonChip
                key={goal}
                color={selected ? 'success' : 'medium'}
                outline={!selected}
                onClick={() => toggle(goal)}
                style={{ cursor: 'pointer' }}
              >
                {selected && <IonIcon icon={checkmarkCircle} />}
                <IonLabel>{goal}</IonLabel>
              </IonChip>
            );
          })}
        </div>
      </IonCardContent>
    </IonCard>
  );
};

export default ProfileGoals;
