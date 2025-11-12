import React from 'react';
import { IonCard, IonCardContent, IonButton, IonIcon } from '@ionic/react';
import { alertCircleOutline, refreshOutline } from 'ionicons/icons';
import './ErrorState.css';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  compact?: boolean;
}

const ErrorState: React.FC<ErrorStateProps> = ({
  message = 'Something went wrong. Please try again.',
  onRetry,
  compact = false,
}) => {
  if (compact) {
    return (
      <div className="error-state-compact">
        <IonIcon icon={alertCircleOutline} className="error-icon-compact" />
        <span className="error-text-compact">{message}</span>
        {onRetry && (
          <IonButton size="small" fill="clear" onClick={onRetry}>
            <IonIcon slot="icon-only" icon={refreshOutline} />
          </IonButton>
        )}
      </div>
    );
  }

  return (
    <IonCard className="error-state-card">
      <IonCardContent className="error-state-content">
        <IonIcon icon={alertCircleOutline} className="error-icon-large" />
        <p className="error-text">{message}</p>
        {onRetry && (
          <IonButton onClick={onRetry} fill="outline">
            <IonIcon slot="start" icon={refreshOutline} />
            Try Again
          </IonButton>
        )}
      </IonCardContent>
    </IonCard>
  );
};

export default ErrorState;
