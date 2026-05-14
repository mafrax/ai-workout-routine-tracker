import React from 'react';
import { IonButton, IonCard, IonCardContent, IonIcon } from '@ionic/react';
import { cloudUploadOutline } from 'ionicons/icons';

/**
 * Legacy "Backend Migration" affordance — a holdover from the
 * localStorage-only era when the app needed a one-shot data migration.
 * Flagged in V2_AUDIT.md as a candidate for removal; for now it's still
 * available behind this card for users on old installs.
 */
const ProfileMigration: React.FC = () => (
  <IonCard className="migration-card">
    <IonCardContent>
      <h2 className="section-title">
        <IonIcon icon={cloudUploadOutline} /> Backend Migration
      </h2>
      <p style={{ fontSize: '14px', color: '#6c757d', marginBottom: '16px' }}>
        Migrate your data to the cloud backend and enable automatic sync.
      </p>
      <IonButton expand="block" fill="outline" routerLink="/migration">
        <IonIcon icon={cloudUploadOutline} slot="start" />
        Open Migration Page
      </IonButton>
    </IonCardContent>
  </IonCard>
);

export default ProfileMigration;
