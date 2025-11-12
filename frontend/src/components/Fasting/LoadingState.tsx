import React from 'react';
import { IonCard, IonSkeletonText } from '@ionic/react';
import './LoadingState.css';

interface LoadingStateProps {
  type?: 'timer' | 'stats' | 'list' | 'chart';
}

const LoadingState: React.FC<LoadingStateProps> = ({ type = 'list' }) => {
  if (type === 'timer') {
    return (
      <div className="loading-timer">
        <div className="skeleton-circle" />
        <IonSkeletonText animated style={{ width: '60%', height: '20px', margin: '1rem auto' }} />
      </div>
    );
  }

  if (type === 'stats') {
    return (
      <div className="loading-stats">
        {[1, 2, 3, 4].map(i => (
          <IonCard key={i} className="skeleton-stat-card">
            <IonSkeletonText animated style={{ width: '40%', height: '14px', marginBottom: '0.5rem' }} />
            <IonSkeletonText animated style={{ width: '60%', height: '24px' }} />
          </IonCard>
        ))}
      </div>
    );
  }

  if (type === 'chart') {
    // Deterministic heights to prevent jitter on re-renders
    const heights = [60, 85, 72, 95, 68, 78, 90];
    return (
      <div className="loading-chart">
        <IonSkeletonText animated style={{ width: '30%', height: '18px', marginBottom: '1rem' }} />
        <div className="skeleton-bars">
          {heights.map((height, i) => (
            <div key={i} className="skeleton-bar" style={{ height: `${height}%` }} />
          ))}
        </div>
      </div>
    );
  }

  // Default: list type
  return (
    <div className="loading-list">
      {[1, 2, 3].map(i => (
        <IonCard key={i} className="skeleton-list-item">
          <IonSkeletonText animated style={{ width: '70%', height: '18px', marginBottom: '0.5rem' }} />
          <IonSkeletonText animated style={{ width: '50%', height: '14px' }} />
        </IonCard>
      ))}
    </div>
  );
};

export default LoadingState;
