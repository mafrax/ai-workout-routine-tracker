import React from 'react';
import { IonIcon, IonButton } from '@ionic/react';
import { alertCircleOutline } from 'ionicons/icons';
import './ErrorState.css';

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

const ErrorState: React.FC<ErrorStateProps> = ({ message, onRetry }) => {
  return (
    <div className="error-state">
      <IonIcon icon={alertCircleOutline} className="error-state-icon" />
      <p className="error-state-message">{message}</p>
      {onRetry && (
        <IonButton onClick={onRetry} fill="outline" size="small">
          Retry
        </IonButton>
      )}
    </div>
  );
};

export default ErrorState;
