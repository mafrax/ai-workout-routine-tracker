import React, { useState, useEffect } from 'react';
import { IonButton } from '@ionic/react';
import { useFastingStore } from '../../store/useFastingStore';
import { fastingService } from '../../services/fastingService';
import './TimerButton.css';

interface TimerButtonProps {
  onStop: () => void;
}

const TimerButton: React.FC<TimerButtonProps> = ({ onStop }) => {
  const { activeSession, activeEatingWindow, selectedPresetId, presets, startFast, timerState } = useFastingStore();
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const updateTimer = () => {
      if (activeSession) {
        // Fasting state - calculate elapsed seconds directly
        const start = new Date(activeSession.startTime).getTime();
        const now = Date.now();
        const elapsed = Math.floor((now - start) / 1000);
        setElapsedSeconds(elapsed);
      } else if (activeEatingWindow) {
        // Eating or Overdue state - calculate remaining seconds
        const dueTime = new Date(activeEatingWindow.nextFastDueTime).getTime();
        const now = Date.now();
        const remaining = Math.floor((dueTime - now) / 1000);
        setElapsedSeconds(remaining);
      } else {
        setElapsedSeconds(0);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activeSession, activeEatingWindow]);

  const formatTime = (seconds: number): string => {
    const absSeconds = Math.abs(seconds);
    const hours = Math.floor(absSeconds / 3600);
    const minutes = Math.floor((absSeconds % 3600) / 60);
    const secs = absSeconds % 60;
    const formatted = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    return seconds < 0 ? `-${formatted}` : formatted;
  };

  const formatDuration = (minutes: number): string => {
    const absMinutes = Math.abs(minutes);
    const hours = Math.floor(absMinutes / 60);
    const mins = absMinutes % 60;
    const formatted = mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    return minutes < 0 ? `-${formatted}` : formatted;
  };

  const selectedPreset = presets.find(p => p.id === selectedPresetId);

  // FASTING STATE
  if (timerState === 'fasting' && activeSession) {
    const elapsedMinutes = Math.floor(elapsedSeconds / 60);
    const progressPercent = Math.min((elapsedMinutes / activeSession.goalMinutes) * 100, 100);
    const goalMet = elapsedMinutes >= activeSession.goalMinutes;
    const overtime = goalMet ? elapsedMinutes - activeSession.goalMinutes : 0;

    return (
      <div className="timer-button-container">
        <button className="timer-button timer-button-fasting" onClick={onStop}>
          <div className="timer-display">
            <div className="timer-time">{formatTime(elapsedSeconds)}</div>
            <div className="timer-progress">
              {formatDuration(elapsedMinutes)} / {formatDuration(activeSession.goalMinutes)}
            </div>
            <div className="timer-percentage">{Math.round(progressPercent)}%</div>
            {goalMet && (
              <div className="timer-badge timer-badge-success">
                Goal met! +{formatDuration(overtime)}
              </div>
            )}
          </div>
        </button>
      </div>
    );
  }

  // EATING WINDOW STATE
  if (timerState === 'eating' && activeEatingWindow) {
    const remainingMinutes = Math.floor(elapsedSeconds / 60);
    const elapsedMinutes = fastingService.getEatingWindowElapsed(activeEatingWindow);
    const progressPercent = Math.min((elapsedMinutes / activeEatingWindow.expectedDurationMinutes) * 100, 100);

    return (
      <div className="timer-button-container">
        <button className="timer-button timer-button-eating" onClick={() => startFast()}>
          <div className="timer-display">
            <div className="timer-label">Eating</div>
            <div className="timer-time">{formatTime(elapsedSeconds)}</div>
            <div className="timer-progress">
              Until next fast
            </div>
            <div className="timer-percentage">{Math.round(progressPercent)}%</div>
          </div>
        </button>
      </div>
    );
  }

  // OVERDUE STATE (past eating window)
  if (timerState === 'overdue' && activeEatingWindow) {
    const overdueMinutes = fastingService.getOverdueMinutes(activeEatingWindow);

    return (
      <div className="timer-button-container">
        <button className="timer-button timer-button-overdue" onClick={() => startFast()}>
          <div className="timer-display">
            <div className="timer-label">OVERDUE!</div>
            <div className="timer-time timer-overdue-time">+{formatDuration(overdueMinutes)}</div>
            <div className="timer-progress">
              Start fasting now!
            </div>
            <div className="timer-badge timer-badge-warning">
              Tap to start
            </div>
          </div>
        </button>
      </div>
    );
  }

  // DEFAULT STATE (ready to start first fast)
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
