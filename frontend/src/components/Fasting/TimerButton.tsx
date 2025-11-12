import React, { useState, useEffect } from 'react';
import { IonButton } from '@ionic/react';
import { useFastingStore } from '../../store/useFastingStore';
import { fastingService } from '../../services/fastingService';
import './TimerButton.css';

interface TimerButtonProps {
  onStop: () => void;
}

const TimerButton: React.FC<TimerButtonProps> = ({ onStop }) => {
  const { activeSession, selectedPresetId, presets, startFast } = useFastingStore();
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!activeSession) {
      setElapsedSeconds(0);
      return;
    }

    // Calculate initial elapsed time
    const updateElapsed = () => {
      const elapsed = fastingService.getElapsedMinutes(activeSession) * 60;
      setElapsedSeconds(elapsed);
    };

    updateElapsed();

    // Update every second
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [activeSession]);

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const selectedPreset = presets.find(p => p.id === selectedPresetId);
  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  const progressPercent = activeSession
    ? Math.min((elapsedMinutes / activeSession.goalMinutes) * 100, 100)
    : 0;
  const goalMet = activeSession && elapsedMinutes >= activeSession.goalMinutes;

  if (activeSession) {
    return (
      <div className="timer-button-container">
        <button className="timer-button timer-button-active" onClick={onStop}>
          <div className="timer-display">
            <div className="timer-time">{formatTime(elapsedSeconds)}</div>
            <div className="timer-progress">
              {formatDuration(elapsedMinutes)} / {formatDuration(activeSession.goalMinutes)}
            </div>
            <div className="timer-percentage">{Math.round(progressPercent)}%</div>
            {goalMet && <div className="timer-badge">Goal met ✓</div>}
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className="timer-button-container">
      <button
        className="timer-button timer-button-inactive"
        onClick={() => startFast()}
        disabled={!selectedPresetId}
      >
        <div className="timer-display">
          <div className="timer-start-text">START FAST</div>
          {selectedPreset && (
            <div className="timer-goal">Goal: {formatDuration(selectedPreset.durationMinutes)}</div>
          )}
        </div>
      </button>
    </div>
  );
};

export default TimerButton;
