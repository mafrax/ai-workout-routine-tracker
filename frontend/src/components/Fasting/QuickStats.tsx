import React from 'react';
import { IonCard, IonCardContent } from '@ionic/react';
import { FastingStats } from '../../types/fasting';
import './QuickStats.css';

interface QuickStatsProps {
  stats: FastingStats | null;
}

const QuickStats: React.FC<QuickStatsProps> = ({ stats }) => {
  if (!stats) return null;

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const lastFast = stats.weekData
    .filter(d => d.duration !== null)
    .pop();

  return (
    <div className="quick-stats">
      <div className="stat-card">
        <div className="stat-value">{stats.currentStreak}</div>
        <div className="stat-label">Day Streak</div>
      </div>
      <div className="stat-card">
        <div className="stat-value">
          {lastFast ? formatDuration(lastFast.duration!) : 'N/A'}
        </div>
        <div className="stat-label">Last Fast</div>
      </div>
      <div className="stat-card">
        <div className="stat-value">{stats.successRate}%</div>
        <div className="stat-label">This Week</div>
      </div>
    </div>
  );
};

export default QuickStats;
