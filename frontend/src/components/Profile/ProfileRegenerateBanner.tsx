import React from 'react';
import { IonButton, IonCard, IonCardContent, IonIcon, IonSpinner } from '@ionic/react';
import { refresh } from 'ionicons/icons';

interface Props {
  visible: boolean;
  isRegenerating: boolean;
  onRegenerate: () => void;
}

/**
 * The "Apply equipment / bodyweight changes" prompt that sits above the
 * Bodyweight Exercises card. Visible only when the user has an active
 * plan that might need refreshing.
 */
const ProfileRegenerateBanner: React.FC<Props> = ({ visible, isRegenerating, onRegenerate }) => {
  if (!visible) return null;
  return (
    <IonCard color="light" style={{ marginBottom: 12 }}>
      <IonCardContent>
        <strong>
          <IonIcon icon={refresh} /> Apply equipment / bodyweight changes
        </strong>
        <p style={{ margin: '6px 0 10px', fontSize: 14 }}>
          Regenerate the workouts you haven't done yet so they match your latest setup.
        </p>
        <IonButton expand="block" onClick={onRegenerate} disabled={isRegenerating}>
          {isRegenerating ? (
            <>
              <IonSpinner name="dots" />
              &nbsp;Regenerating…
            </>
          ) : (
            'Regenerate incomplete workouts now'
          )}
        </IonButton>
      </IonCardContent>
    </IonCard>
  );
};

export default ProfileRegenerateBanner;
