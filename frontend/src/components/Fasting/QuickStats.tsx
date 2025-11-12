import React from 'react';
import { IonCard, IonCardContent } from '@ionic/react';
import { FastingStats } from '../../types/fasting';
import EmptyState from './EmptyState';
import './QuickStats.css';

interface QuickStatsProps {
  stats: FastingStats | null;
}

const QuickStats: React.FC<QuickStatsProps> = ({ stats }) => {
  if (!stats) {
    return (
      <div className="quick-stats">
        <h2 className="section-title">Quick Stats</h2>
        <EmptyState type="stats" compact />
      </div>
    );
  }

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  return (
    <div className="quick-stats">
      <div className="stat-card">
        <div className="stat-value">{stats.currentStreak}</div>
        <div className="stat-label">Day Streak</div>
      </div>
      <div className="stat-card">
        <div className="stat-value stat-value-success">{stats.totalSuccesses}</div>
        <div className="stat-label">Success</div>
      </div>
      <div className="stat-card">
        <div className="stat-value stat-value-fail">{stats.totalFailures}</div>
        <div className="stat-label">Failed</div>
      </div>
      <div className="stat-card">
        <div className="stat-value">{stats.successRate}%</div>
        <div className="stat-label">Success Rate</div>
      </div>
    </div>
  );
};

export default QuickStats;
