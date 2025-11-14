import React from 'react';
import { IonSpinner } from '@ionic/react';
import './LoadingState.css';

interface LoadingStateProps {
  message?: string;
}

const LoadingState: React.FC<LoadingStateProps> = ({ message = 'Loading...' }) => {
  return (
    <div className="loading-state">
      <IonSpinner name="crescent" />
      <p className="loading-message">{message}</p>
    </div>
  );
};

export default LoadingState;
