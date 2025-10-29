import React, { useState, useEffect } from 'react';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonButton,
  IonCard,
  IonCardContent,
  IonIcon,
  IonProgressBar,
  IonBadge,
  IonList,
  IonItem,
  IonLabel,
  IonToast,
  IonModal,
  IonButtons,
  IonInput,
  IonText,
  IonSpinner,
} from '@ionic/react';
import { play, pause, checkmarkCircle, time, barbell, fitness, create, close, arrowBack, chevronBack, informationCircleOutline, reorderThreeOutline, arrowUp, arrowDown, searchOutline } from 'ionicons/icons';
import { KeepAwake } from '@capacitor-community/keep-awake';
import type { DailyWorkout, Exercise } from '../../types/workout';
import { useStore } from '../../store/useStore';
import { saveWorkoutSession } from '../../services/workoutSessionService';
import { workoutPlanApi as localWorkoutPlanApi } from '../../services/api';
import { workoutPlanApi as backendWorkoutPlanApi } from '../../services/api_backend';
import { getExerciseInstruction } from '../../data/exerciseInstructions';
import { aiService } from '../../services/aiService';
import { telegramService } from '../../services/telegramService';
import './WorkoutExecution.css';

interface WorkoutExecutionProps {
  workout: DailyWorkout;
  onComplete: () => void;
}

const WorkoutExecution: React.FC<WorkoutExecutionProps> = ({ workout, onComplete }) => {
  const user = useStore((state) => state.user);
  const activeWorkoutPlan = useStore((state) => state.activeWorkoutPlan);
  const setActiveWorkoutPlan = useStore((state) => state.setActiveWorkoutPlan);

  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);
  const [isResting, setIsResting] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [completedSets, setCompletedSets] = useState<Set<string>>(new Set());
  const [skippedExercises, setSkippedExercises] = useState<Set<number>>(new Set());
  const [workoutStarted, setWorkoutStarted] = useState(false);
  const [workoutStartTime, setWorkoutStartTime] = useState<Date | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [customWeight, setCustomWeight] = useState('');
  const [showReorderModal, setShowReorderModal] = useState(false);
  const [reorderedExercises, setReorderedExercises] = useState<Exercise[]>([]);
  const [exerciseInfo, setExerciseInfo] = useState<string>('');
  const [exerciseSources, setExerciseSources] = useState<Array<{ title: string; url: string }>>([]);
  const [loadingExerciseInfo, setLoadingExerciseInfo] = useState(false);

  // Initialize reordered exercises from workout
  useEffect(() => {
    setReorderedExercises([...workout.exercises]);
  }, [workout.exercises]);

  // Cleanup: allow sleep when component unmounts or workout exits
  useEffect(() => {
    return () => {
      if (workoutStarted) {
        KeepAwake.allowSleep().catch(console.error);
      }
    };
  }, [workoutStarted]);

  const currentExercise = reorderedExercises[currentExerciseIndex];
  const totalExercises = reorderedExercises.length;
  const progress = currentExercise
    ? (currentExerciseIndex + (currentSet / currentExercise.sets)) / totalExercises
    : 0;

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            setIsTimerRunning(false);
            setIsResting(false);
            playBeep();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerSeconds]);

  const playBeep = () => {
    // Simple beep using Audio API
    const context = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = context.createOscillator();
    oscillator.connect(context.destination);
    oscillator.frequency.value = 800;
    oscillator.start();
    oscillator.stop(context.currentTime + 0.2);
  };

  const startWorkout = async () => {
    setWorkoutStarted(true);
    setWorkoutStartTime(new Date());

    // Keep screen awake during workout
    try {
      await KeepAwake.keepAwake();
      console.log('Screen will stay awake during workout');
    } catch (error) {
      console.error('Failed to keep screen awake:', error);
    }
  };

  const startTimer = (seconds: number) => {
    setTimerSeconds(seconds);
    setIsTimerRunning(true);
  };

  const toggleTimer = () => {
    setIsTimerRunning(!isTimerRunning);
  };

  const completeSet = () => {
    const setKey = `${currentExerciseIndex}-${currentSet}`;
    setCompletedSets(new Set(completedSets).add(setKey));

    if (currentSet < currentExercise.sets) {
      // Start rest timer between sets
      setIsResting(true);
      startTimer(currentExercise.restBetweenSets);
      setCurrentSet(currentSet + 1);
    } else {
      // Exercise completed, move to next
      completeExercise();
    }
  };

  const completeExercise = () => {
    if (currentExerciseIndex < totalExercises - 1) {
      // Start rest timer before next exercise
      setIsResting(true);
      const nextExercise = reorderedExercises[currentExerciseIndex + 1];
      startTimer(nextExercise?.restBetweenSets || currentExercise.restBeforeNext);
      setCurrentExerciseIndex(currentExerciseIndex + 1);
      setCurrentSet(1);
    } else {
      // Workout completed!
      handleWorkoutComplete();
    }
  };

  const skipRest = () => {
    setIsResting(false);
    setIsTimerRunning(false);
    setTimerSeconds(0);
  };

  const skipExercise = () => {
    // Mark this exercise as skipped
    setSkippedExercises(new Set(skippedExercises).add(currentExerciseIndex));
    
    // Mark all sets for this exercise as "completed" with 0 reps to track it was skipped
    const newCompletedSets = new Set(completedSets);
    for (let setNum = 1; setNum <= currentExercise.sets; setNum++) {
      newCompletedSets.add(`${currentExerciseIndex}-${setNum}`);
    }
    setCompletedSets(newCompletedSets);

    // Show toast to confirm skip
    setToastMessage(`Skipped: ${currentExercise.name}`);
    setShowToast(true);

    // Move to next exercise or complete workout
    completeExercise();
  };

  const goToPreviousSet = () => {
    const setKey = `${currentExerciseIndex}-${currentSet}`;
    const newCompletedSets = new Set(completedSets);
    newCompletedSets.delete(setKey);
    setCompletedSets(newCompletedSets);

    if (currentSet > 1) {
      setCurrentSet(currentSet - 1);
    } else if (currentExerciseIndex > 0) {
      // Go to previous exercise
      const prevExercise = reorderedExercises[currentExerciseIndex - 1];
      setCurrentExerciseIndex(currentExerciseIndex - 1);
      setCurrentSet(prevExercise.sets);

      // Remove completed sets for the last set of previous exercise
      const prevSetKey = `${currentExerciseIndex - 1}-${prevExercise.sets}`;
      newCompletedSets.delete(prevSetKey);
      setCompletedSets(newCompletedSets);
    }

    setIsResting(false);
    setIsTimerRunning(false);
  };

  const handleWorkoutComplete = async () => {
    // Allow screen to sleep again
    try {
      await KeepAwake.allowSleep();
      console.log('Screen can sleep again');
    } catch (error) {
      console.error('Failed to allow sleep:', error);
    }

    if (!user) {
      console.error('No user found when completing workout');
      onComplete();
      return;
    }

    const endTime = new Date();
    const startTime = workoutStartTime || new Date(endTime.getTime() - 30 * 60 * 1000); // Default to 30min ago if not set
    const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));

    // Calculate completion rate based on completed sets
    const totalSets = reorderedExercises.reduce((sum, ex) => sum + ex.sets, 0);
    const completedSetsCount = completedSets.size;
    const completionRate = completedSetsCount / totalSets;

    // Prepare exercises data as JSON
    const exercisesData = reorderedExercises.map((exercise, idx) => {
      const completedSetsForExercise = Array.from({ length: exercise.sets }, (_, i) => i + 1)
        .filter(setNum => completedSets.has(`${idx}-${setNum}`)).length;
      
      const wasSkipped = skippedExercises.has(idx);

      return {
        name: exercise.name,
        sets: exercise.sets,
        completedSets: completedSetsForExercise,
        reps: wasSkipped ? 0 : exercise.reps, // Set reps to 0 if skipped
        weight: exercise.weight,
        skipped: wasSkipped, // Track that it was intentionally skipped
      };
    });

    try {
      console.log('Saving workout session:', {
        userId: user.id,
        workoutPlanId: activeWorkoutPlan?.id,
        durationMinutes,
        exercisesCount: exercisesData.length,
        completionRate
      });

      await saveWorkoutSession({
        userId: user.id!,
        workoutPlanId: activeWorkoutPlan?.id,
        sessionDate: startTime.toISOString(),
        durationMinutes,
        exercises: JSON.stringify(exercisesData),
        completionRate,
      });

      console.log('Workout session saved successfully');

      // Mark this workout as complete in the workout plan
      if (activeWorkoutPlan?.id) {
        const currentCompletedWorkouts = activeWorkoutPlan.completedWorkouts || [];
        const updatedCompletedWorkouts = [...currentCompletedWorkouts, workout.dayNumber];

        console.log('Marking workout day', workout.dayNumber, 'as complete');

        // Update local storage first (immediate UI update)
        const updatedPlanLocal = await localWorkoutPlanApi.update(activeWorkoutPlan.id, {
          ...activeWorkoutPlan,
          completedWorkouts: updatedCompletedWorkouts
        });

        // Update store immediately for instant UI feedback
        setActiveWorkoutPlan(updatedPlanLocal);
        console.log('Workout plan updated locally with completed workout');

        // Sync to backend
        try {
          await backendWorkoutPlanApi.updatePlan(activeWorkoutPlan.id, {
            completedWorkouts: updatedCompletedWorkouts
          });
          console.log('Workout plan synced to backend');
        } catch (error) {
          console.warn('Failed to sync workout completion to backend:', error);
          // Continue - local storage is already updated
        }
      }

      setToastMessage('Workout saved successfully! 🎉');
      setShowToast(true);

      // Send Telegram notification
      if (telegramService.isConfigured()) {
        const completedExercises = exercisesData.filter(ex => ex.completedSets === ex.sets).length;
        const message = telegramService.formatWorkoutCompletionMessage(
          workout.focus,
          durationMinutes,
          completedExercises,
          exercisesData.length,
          completionRate
        );
        telegramService.sendMessage(message).catch(err =>
          console.error('Failed to send Telegram notification:', err)
        );
      }

      setTimeout(() => {
        onComplete();
      }, 1500);
    } catch (error) {
      console.error('Failed to save workout session:', error);
      setToastMessage('Failed to save workout session');
      setShowToast(true);

      setTimeout(() => {
        onComplete();
      }, 1500);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isSetCompleted = (exerciseIdx: number, setNum: number) => {
    return completedSets.has(`${exerciseIdx}-${setNum}`);
  };

  const parseWeight = (weightStr: string): number => {
    // Extract numeric value from weight string (e.g., "50-60kg" -> 55, "40kg" -> 40)
    const match = weightStr.match(/(\d+)(?:-(\d+))?/);
    if (!match) return 0;
    const min = parseInt(match[1]);
    const max = match[2] ? parseInt(match[2]) : min;
    return (min + max) / 2;
  };

  const getWeightSuggestions = (currentWeight: string) => {
    const baseWeight = parseWeight(currentWeight);
    return {
      easy: Math.max(5, Math.round(baseWeight * 0.8)),
      medium: Math.round(baseWeight),
      hard: Math.round(baseWeight * 1.2)
    };
  };

  const updateExerciseWeight = async (newWeight: number) => {
    if (!activeWorkoutPlan?.id) {
      setToastMessage('No active workout plan found');
      setShowToast(true);
      return;
    }

    try {
      const exerciseName = currentExercise.name;
      const newWeightStr = `${newWeight}kg`;

      // Update ALL exercises with the same name in current workout
      setReorderedExercises(prev =>
        prev.map(exercise =>
          exercise.name === exerciseName
            ? { ...exercise, weight: newWeightStr }
            : exercise
        )
      );

      // Update local storage first
      const updatedPlanLocal = await localWorkoutPlanApi.updateExerciseWeight(
        activeWorkoutPlan.id,
        exerciseName,
        newWeightStr
      );

      // Update the store immediately
      setActiveWorkoutPlan(updatedPlanLocal);

      // Sync to backend
      try {
        await backendWorkoutPlanApi.updateExerciseWeight(
          activeWorkoutPlan.id,
          exerciseName,
          newWeightStr
        );
        console.log('Exercise weight synced to backend');
      } catch (error) {
        console.warn('Failed to sync exercise weight to backend:', error);
      }

      setShowWeightModal(false);
      setCustomWeight('');
      setToastMessage(`Weight updated to ${newWeight}kg for ${exerciseName} across all workouts`);
      setShowToast(true);
    } catch (error) {
      console.error('Failed to update exercise weight:', error);
      setToastMessage('Failed to update weight');
      setShowToast(true);
    }
  };

  const moveExerciseUp = (index: number) => {
    if (index === 0) return;
    const newExercises = [...reorderedExercises];
    [newExercises[index - 1], newExercises[index]] = [newExercises[index], newExercises[index - 1]];
    setReorderedExercises(newExercises);
  };

  const moveExerciseDown = (index: number) => {
    if (index === reorderedExercises.length - 1) return;
    const newExercises = [...reorderedExercises];
    [newExercises[index], newExercises[index + 1]] = [newExercises[index + 1], newExercises[index]];
    setReorderedExercises(newExercises);
  };

  const searchExerciseOnPerplexity = async (exerciseName: string) => {
    setLoadingExerciseInfo(true);
    setExerciseInfo('');
    setExerciseSources([]);

    try {
      const result = await aiService.searchExerciseInfo(exerciseName);
      setExerciseInfo(result.content);
      setExerciseSources(result.sources);
    } catch (error: any) {
      console.error('Failed to get exercise info:', error);
      setExerciseInfo('Failed to load exercise information. Please try again.\n\nError: ' + error.message);
    } finally {
      setLoadingExerciseInfo(false);
    }
  };

  if (!currentExercise && workoutStarted) {
    return null; // Loading state
  }

  if (!workoutStarted) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonButton onClick={onComplete}>
                <IonIcon icon={arrowBack} />
              </IonButton>
            </IonButtons>
            <IonTitle>{workout.focus}</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => setShowReorderModal(true)} fill="clear">
                <IonIcon icon={reorderThreeOutline} />
              </IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <div className="workout-start-screen">
            <h1>Ready to Start?</h1>
            <IonCard>
              <IonCardContent>
                <h2>{workout.focus}</h2>
                <p className="workout-summary">
                  {totalExercises} exercises • {reorderedExercises.reduce((sum, ex) => sum + ex.sets, 0)} total sets
                </p>

                <IonList>
                  {reorderedExercises.map((exercise, idx) => (
                    <IonItem key={idx} lines="inset">
                      <IonLabel className="ion-text-wrap">
                        <h3>{exercise.name}</h3>
                        <p>{exercise.sets}x{exercise.reps} @ {exercise.weight}</p>
                        <p className="exercise-instruction">
                          <IonIcon icon={informationCircleOutline} style={{ fontSize: '14px', marginRight: '4px' }} />
                          {getExerciseInstruction(exercise.name)}
                        </p>
                      </IonLabel>
                    </IonItem>
                  ))}
                </IonList>

                <IonButton expand="block" size="large" onClick={startWorkout} className="start-workout-btn">
                  <IonIcon icon={play} slot="start" />
                  Start Workout
                </IonButton>
              </IonCardContent>
            </IonCard>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={goToPreviousSet} disabled={currentExerciseIndex === 0 && currentSet === 1}>
              <IonIcon icon={chevronBack} />
            </IonButton>
          </IonButtons>
          <IonTitle>{workout.focus}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => setShowReorderModal(true)} fill="clear">
              <IonIcon icon={reorderThreeOutline} />
            </IonButton>
            <IonButton onClick={onComplete} fill="clear" color="danger">
              Exit
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <div className="workout-execution-container">
          <IonProgressBar value={progress} className="workout-progress" />

          <div className="workout-info">
            <p className="exercise-counter">
              Exercise {currentExerciseIndex + 1} of {totalExercises}
            </p>
          </div>

          {isResting ? (
            <IonCard className="rest-card">
              <IonCardContent>
                <h1 className="rest-title">Rest Time</h1>
                <div className="timer-display">
                  <IonIcon icon={time} className="timer-icon" />
                  <div className="timer-text">{formatTime(timerSeconds)}</div>
                </div>
                <p className="next-exercise-text">
                  Next: {reorderedExercises[currentExerciseIndex]?.name || 'Workout Complete'}
                </p>
                <div className="timer-controls">
                  <IonButton onClick={toggleTimer} fill="outline">
                    <IonIcon icon={isTimerRunning ? pause : play} slot="start" />
                    {isTimerRunning ? 'Pause' : 'Resume'}
                  </IonButton>
                  <IonButton onClick={skipRest} color="success">
                    Skip Rest
                  </IonButton>
                </div>
              </IonCardContent>
            </IonCard>
          ) : (
            <IonCard className="exercise-card">
              <IonCardContent>
                <div className="exercise-header">
                  <h1 className="exercise-name">{currentExercise.name}</h1>
                  <IonBadge color="primary" className="set-badge">
                    Set {currentSet}/{currentExercise.sets}
                  </IonBadge>
                </div>

                <div className="exercise-instruction-box">
                  <IonIcon icon={informationCircleOutline} style={{ fontSize: '18px', marginRight: '8px', color: '#667eea' }} />
                  <p className="instruction-text">{getExerciseInstruction(currentExercise.name)}</p>
                </div>

                <div className="exercise-details">
                  <div className="detail-item">
                    <IonIcon icon={fitness} />
                    <span className="detail-label">Reps:</span>
                    <span className="detail-value">{currentExercise.reps}</span>
                  </div>
                  <div className="detail-item weight-item">
                    <IonIcon icon={barbell} />
                    <span className="detail-label">Weight:</span>
                    <span className="detail-value">{currentExercise.weight}</span>
                    <IonButton fill="clear" size="small" onClick={() => setShowWeightModal(true)}>
                      <IonIcon icon={create} slot="icon-only" />
                    </IonButton>
                  </div>
                  <div className="detail-item">
                    <IonIcon icon={time} />
                    <span className="detail-label">Rest:</span>
                    <span className="detail-value">{currentExercise.restBetweenSets}s</span>
                  </div>
                </div>

                <div className="sets-tracker">
                  <p className="sets-label">Sets Progress:</p>
                  <div className="sets-dots">
                    {Array.from({ length: currentExercise.sets }, (_, i) => i + 1).map((setNum) => {
                      const isSkipped = skippedExercises.has(currentExerciseIndex);
                      return (
                        <div
                          key={setNum}
                          className={`set-dot ${
                            isSetCompleted(currentExerciseIndex, setNum) ? 'completed' : ''
                          } ${setNum === currentSet ? 'current' : ''} ${isSkipped ? 'skipped' : ''}`}
                        >
                          {isSkipped ? (
                            <IonIcon icon={close} />
                          ) : isSetCompleted(currentExerciseIndex, setNum) ? (
                            <IonIcon icon={checkmarkCircle} />
                          ) : (
                            setNum
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="workout-navigation-buttons">
                  <IonButton
                    expand="block"
                    size="large"
                    onClick={goToPreviousSet}
                    disabled={currentExerciseIndex === 0 && currentSet === 1}
                    fill="outline"
                    color="medium"
                    className="previous-set-btn"
                  >
                    <IonIcon icon={chevronBack} slot="start" />
                    Previous
                  </IonButton>
                  <IonButton
                    expand="block"
                    size="large"
                    onClick={completeSet}
                    className="complete-set-btn"
                    color="success"
                  >
                    <IonIcon icon={checkmarkCircle} slot="start" />
                    Complete Set {currentSet}
                  </IonButton>
                  <IonButton
                    expand="block"
                    size="large"
                    onClick={skipExercise}
                    fill="outline"
                    color="warning"
                    className="skip-exercise-btn"
                  >
                    <IonIcon icon={close} slot="start" />
                    Skip Exercise
                  </IonButton>
                </div>
              </IonCardContent>
            </IonCard>
          )}

          <IonCard className="upcoming-exercises">
            <IonCardContent>
              <h3>Upcoming Exercises</h3>
              <IonList>
                {reorderedExercises.slice(currentExerciseIndex + 1, currentExerciseIndex + 4).map((exercise, idx) => (
                  <IonItem key={idx} lines="none">
                    <IonLabel>
                      <p className="upcoming-exercise">{exercise.name}</p>
                      <p className="upcoming-details">{exercise.sets}x{exercise.reps} @ {exercise.weight}</p>
                    </IonLabel>
                  </IonItem>
                ))}
                {currentExerciseIndex >= totalExercises - 1 && (
                  <p className="finish-message">🎉 Almost done! Finish strong!</p>
                )}
              </IonList>
            </IonCardContent>
          </IonCard>

          <IonCard className="exercise-info-card">
            <IonCardContent>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ margin: 0 }}>Exercise Guide</h3>
                <IonButton
                  size="small"
                  onClick={() => searchExerciseOnPerplexity(currentExercise.name)}
                  disabled={loadingExerciseInfo}
                >
                  <IonIcon icon={searchOutline} slot="start" />
                  {exerciseInfo ? 'Refresh' : 'Load Guide'}
                </IonButton>
              </div>

              {loadingExerciseInfo ? (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                  <IonSpinner name="crescent" />
                  <p style={{ marginTop: '12px', color: '#667eea', fontSize: '14px' }}>Loading exercise information...</p>
                </div>
              ) : exerciseInfo ? (
                <>
                  <div style={{ whiteSpace: 'pre-line', lineHeight: '1.6', fontSize: '14px', color: '#495057' }}>
                    {exerciseInfo}
                  </div>

                  {(() => {
                    const youtubeShorts = exerciseSources.filter(source => {
                      const url = source.url.toLowerCase();
                      return (url.includes('youtube.com/shorts') || url.includes('youtu.be/')) &&
                             (url.includes('/shorts/') || url.length - url.lastIndexOf('/') < 20);
                    });

                    return youtubeShorts.length > 0 && (
                      <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e0e0e0' }}>
                        <h4 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '12px', color: '#333' }}>Video Guides:</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {youtubeShorts.map((source, index) => {
                            let videoId = '';
                            if (source.url.includes('youtube.com/shorts/')) {
                              videoId = source.url.split('/shorts/')[1]?.split('?')[0];
                            } else if (source.url.includes('youtu.be/')) {
                              videoId = source.url.split('youtu.be/')[1]?.split('?')[0];
                            }

                            if (!videoId) return null;

                            const embedUrl = `https://www.youtube.com/embed/${videoId}`;

                            return (
                              <div key={index} style={{ width: '100%' }}>
                                <p style={{ fontSize: '13px', fontWeight: '500', marginBottom: '6px', color: '#495057' }}>
                                  {source.title}
                                </p>
                                <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', borderRadius: '8px' }}>
                                  <iframe
                                    src={embedUrl}
                                    style={{
                                      position: 'absolute',
                                      top: 0,
                                      left: 0,
                                      width: '100%',
                                      height: '100%',
                                      border: 'none',
                                      borderRadius: '8px'
                                    }}
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </>
              ) : (
                <p style={{ color: '#6c757d', fontSize: '14px', fontStyle: 'italic', textAlign: 'center', padding: '20px' }}>
                  Tap "Load Guide" to get detailed form instructions, common mistakes, safety tips, and video links from Perplexity AI.
                </p>
              )}
            </IonCardContent>
          </IonCard>
        </div>
        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message={toastMessage}
          duration={2000}
          position="top"
        />

        <IonModal isOpen={showReorderModal} onDidDismiss={() => setShowReorderModal(false)}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>Reorder Exercises</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setShowReorderModal(false)}>
                  <IonIcon icon={close} />
                </IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            <IonCard>
              <IonCardContent>
                <p style={{ color: '#666', marginBottom: '20px' }}>
                  Reorder exercises to work around occupied equipment. Your progress will be preserved.
                </p>
                <IonList>
                  {reorderedExercises.map((exercise, idx) => (
                    <IonItem key={idx} lines="inset">
                      <IonLabel className="ion-text-wrap">
                        <h3>{exercise.name}</h3>
                        <p>{exercise.sets}x{exercise.reps} @ {exercise.weight}</p>
                        {idx === currentExerciseIndex && (
                          <IonBadge color="primary" style={{ marginTop: '4px' }}>Current Exercise</IonBadge>
                        )}
                      </IonLabel>
                      <IonButton
                        fill="clear"
                        slot="end"
                        onClick={() => moveExerciseUp(idx)}
                        disabled={idx === 0}
                        size="small"
                      >
                        <IonIcon icon={arrowUp} slot="icon-only" />
                      </IonButton>
                      <IonButton
                        fill="clear"
                        slot="end"
                        onClick={() => moveExerciseDown(idx)}
                        disabled={idx === reorderedExercises.length - 1}
                        size="small"
                      >
                        <IonIcon icon={arrowDown} slot="icon-only" />
                      </IonButton>
                    </IonItem>
                  ))}
                </IonList>
              </IonCardContent>
            </IonCard>
          </IonContent>
        </IonModal>

        <IonModal isOpen={showWeightModal} onDidDismiss={() => setShowWeightModal(false)}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>Adjust Weight</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setShowWeightModal(false)}>
                  <IonIcon icon={close} />
                </IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            <IonCard>
              <IonCardContent>
                <h2>{currentExercise.name}</h2>
                <p style={{ color: '#666' }}>Current: {currentExercise.weight}</p>

                <div style={{ marginTop: '20px' }}>
                  <h3>Quick Select</h3>
                  <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                    <IonButton
                      expand="block"
                      color="success"
                      onClick={() => updateExerciseWeight(getWeightSuggestions(currentExercise.weight).easy)}
                    >
                      Easy<br/>{getWeightSuggestions(currentExercise.weight).easy}kg
                    </IonButton>
                    <IonButton
                      expand="block"
                      color="warning"
                      onClick={() => updateExerciseWeight(getWeightSuggestions(currentExercise.weight).medium)}
                    >
                      Medium<br/>{getWeightSuggestions(currentExercise.weight).medium}kg
                    </IonButton>
                    <IonButton
                      expand="block"
                      color="danger"
                      onClick={() => updateExerciseWeight(getWeightSuggestions(currentExercise.weight).hard)}
                    >
                      Hard<br/>{getWeightSuggestions(currentExercise.weight).hard}kg
                    </IonButton>
                  </div>
                </div>

                <div style={{ marginTop: '30px' }}>
                  <h3>Custom Weight</h3>
                  <IonInput
                    type="number"
                    placeholder="Enter weight in kg"
                    value={customWeight}
                    onIonInput={(e) => setCustomWeight(e.detail.value!)}
                    style={{ border: '1px solid #ccc', borderRadius: '4px', marginTop: '10px' }}
                  />
                  <IonButton
                    expand="block"
                    style={{ marginTop: '10px' }}
                    disabled={!customWeight || parseFloat(customWeight) <= 0}
                    onClick={() => updateExerciseWeight(parseFloat(customWeight))}
                  >
                    Apply Custom Weight
                  </IonButton>
                </div>

                <IonText color="medium" style={{ display: 'block', marginTop: '20px', fontSize: '14px' }}>
                  <p>💡 This weight will be saved and applied to "{currentExercise.name}" across all future workouts.</p>
                </IonText>
              </IonCardContent>
            </IonCard>
          </IonContent>
        </IonModal>
      </IonContent>
    </IonPage>
  );
};

export default WorkoutExecution;
