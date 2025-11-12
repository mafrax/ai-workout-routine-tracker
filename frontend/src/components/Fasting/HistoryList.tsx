import React, { useState } from 'react';
import { IonList, IonItem, IonLabel, IonBadge, IonIcon } from '@ionic/react';
import { chevronDown, chevronUp, checkmarkCircle, alertCircle } from 'ionicons/icons';
import { FastingSession } from '../../types/fasting';
import './HistoryList.css';

interface HistoryListProps {
  sessions: FastingSession[];
}

const HistoryList: React.FC<HistoryListProps> = ({ sessions }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Sort sessions by start time, most recent first
  const sortedSessions = [...sessions].sort((a, b) => {
    return new Date(b.startTime).getTime() - new Date(a.startTime).getTime();
  });

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const formatDateTime = (isoString: string): string => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatTime = (isoString: string): string => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getActualDuration = (session: FastingSession): number => {
    const start = new Date(session.startTime).getTime();
    const end = session.endTime ? new Date(session.endTime).getTime() : Date.now();
    return Math.floor((end - start) / 60000);
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  if (sortedSessions.length === 0) {
    return (
      <div className="history-list-empty">
        <p>No fasting sessions yet. Start your first fast!</p>
      </div>
    );
  }

  return (
    <div className="history-list">
      <h3 className="history-list-title">History</h3>
      <IonList className="history-list-items">
        {sortedSessions.map((session) => {
          const isExpanded = expandedId === session.id;
          const actualDuration = getActualDuration(session);
          const goalMet = !session.stoppedEarly;

          return (
            <IonItem
              key={session.id}
              className="history-list-item"
              button
              onClick={() => toggleExpand(session.id)}
            >
              <IonIcon
                slot="start"
                icon={goalMet ? checkmarkCircle : alertCircle}
                className={goalMet ? 'history-icon-success' : 'history-icon-partial'}
              />
              <IonLabel>
                <div className="history-item-header">
                  <h3>{formatDateTime(session.startTime)}</h3>
                  <IonBadge color={goalMet ? 'success' : 'warning'}>
                    {goalMet ? '✓ Goal Met' : 'Partial'}
                  </IonBadge>
                </div>
                <p className="history-item-summary">
                  {formatDuration(actualDuration)} / {formatDuration(session.goalMinutes)} ({session.presetName})
                </p>

                {isExpanded && (
                  <div className="history-item-details">
                    <div className="history-detail-row">
                      <span className="history-detail-label">Started:</span>
                      <span className="history-detail-value">{formatTime(session.startTime)}</span>
                    </div>
                    {session.endTime && (
                      <div className="history-detail-row">
                        <span className="history-detail-label">Ended:</span>
                        <span className="history-detail-value">{formatTime(session.endTime)}</span>
                      </div>
                    )}
                    <div className="history-detail-row">
                      <span className="history-detail-label">Eating Window:</span>
                      <span className="history-detail-value">
                        {formatDuration(session.eatingWindowMinutes)}
                      </span>
                    </div>
                    {session.stoppedEarly && (
                      <div className="history-detail-row">
                        <span className="history-detail-label">Status:</span>
                        <span className="history-detail-value history-detail-stopped">
                          Stopped {formatDuration(session.goalMinutes - actualDuration)} early
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </IonLabel>
              <IonIcon
                slot="end"
                icon={isExpanded ? chevronUp : chevronDown}
                className="history-expand-icon"
              />
            </IonItem>
          );
        })}
      </IonList>
    </div>
  );
};

export default HistoryList;
