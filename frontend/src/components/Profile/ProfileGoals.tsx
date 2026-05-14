import React from 'react';
import { IonCard, IonCardContent, IonChip, IonIcon, IonLabel } from '@ionic/react';
import { checkmarkCircle, fitness } from 'ionicons/icons';

/**
 * Read-only display of the user's current fitness goals. Editing happens
 * in the onboarding wizard / plan-creation flow; this is just a summary
 * chip set so users see the current state.
 */
const ProfileGoals: React.FC<{ goals: string[] }> = ({ goals }) => (
  <IonCard className="goals-card">
    <IonCardContent>
      <h2 className="section-title">
        <IonIcon icon={fitness} /> Fitness Goals
      </h2>

      <div className="goals-chips">
        {goals.length === 0 ? (
          <p className="no-equipment">No goals set yet</p>
        ) : (
          goals.map((goal, index) => (
            <IonChip key={index} color="success">
              <IonIcon icon={checkmarkCircle} />
              <IonLabel>{goal}</IonLabel>
            </IonChip>
          ))
        )}
      </div>
    </IonCardContent>
  </IonCard>
);

export default ProfileGoals;
