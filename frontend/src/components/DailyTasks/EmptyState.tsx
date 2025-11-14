import React from 'react';
import { IonIcon } from '@ionic/react';
import { listOutline } from 'ionicons/icons';
import './EmptyState.css';

interface EmptyStateProps {
  message: string;
  icon?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({ message, icon = listOutline }) => {
  return (
    <div className="empty-state">
      <IonIcon icon={icon} className="empty-state-icon" />
      <p className="empty-state-message">{message}</p>
    </div>
  );
};

export default EmptyState;
