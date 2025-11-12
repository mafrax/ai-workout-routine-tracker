import React from 'react';
import { IonButton, IonIcon, IonCard, IonCardContent } from '@ionic/react';
import {
  timeOutline,
  statsChartOutline,
  calendarOutline,
  listOutline,
  rocketOutline,
} from 'ionicons/icons';
import './EmptyState.css';

interface EmptyStateProps {
  type?: 'sessions' | 'stats' | 'calendar' | 'presets' | 'default';
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
}

const EMPTY_STATE_CONFIG = {
  sessions: {
    icon: timeOutline,
    title: 'No fasting sessions yet',
    description: 'Start your first fast to begin tracking your intermittent fasting journey.',
    actionLabel: 'Start Fasting',
  },
  stats: {
    icon: statsChartOutline,
    title: 'No statistics available',
    description: 'Complete your first fasting session to see your progress and stats.',
  },
  calendar: {
    icon: calendarOutline,
    title: 'No history yet',
    description: 'Your fasting calendar will populate as you complete sessions.',
  },
  presets: {
    icon: listOutline,
    title: 'No presets created',
    description: 'Create a preset to quickly start fasts with your preferred duration.',
    actionLabel: 'Create Preset',
  },
  default: {
    icon: rocketOutline,
    title: 'Nothing here yet',
    description: 'Get started to see content appear here.',
  },
};

const EmptyState: React.FC<EmptyStateProps> = ({
  type = 'default',
  title,
  description,
  actionLabel,
  onAction,
  compact = false,
}) => {
  const config = EMPTY_STATE_CONFIG[type];
  const displayTitle = title || config.title;
  const displayDescription = description || config.description;
  const displayActionLabel = actionLabel || config.actionLabel;

  if (compact) {
    return (
      <div className="empty-state-compact">
        <IonIcon icon={config.icon} className="empty-icon-compact" />
        <div className="empty-text-compact">
          <h3>{displayTitle}</h3>
          <p>{displayDescription}</p>
        </div>
      </div>
    );
  }

  return (
    <IonCard className="empty-state-card">
      <IonCardContent className="empty-state-content">
        <div className="empty-icon-container">
          <IonIcon icon={config.icon} className="empty-icon" />
        </div>
        <h2 className="empty-title">{displayTitle}</h2>
        <p className="empty-description">{displayDescription}</p>
        {displayActionLabel && onAction && (
          <IonButton onClick={onAction} className="empty-action">
            {displayActionLabel}
          </IonButton>
        )}
      </IonCardContent>
    </IonCard>
  );
};

export default EmptyState;
