import React, { useState, useEffect } from 'react';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonList,
  IonItem,
  IonLabel,
  IonBadge,
  IonIcon,
  IonSpinner,
  IonChip,
  IonButton,
  IonAlert,
  IonModal,
  IonButtons,
  IonSearchbar,
  IonSelect,
  IonSelectOption,
} from '@ionic/react';
import {
  calendar,
  barbell,
  time,
  checkmarkCircle,
  fitness,
  trendingUp,
  trashOutline,
  close,
  statsChartOutline,
} from 'ionicons/icons';
import { useStore } from '../../store/useStore';
import { useWorkoutSessions, useDeleteWorkoutSession } from '../../hooks/useWorkoutQueries';
import type { WorkoutPlan } from '../../types';
import './Progress.css';

interface Exercise {
  name: string;
  sets: number;
  completedSets: number;
  reps: string;
  weight: string;
}

interface WorkoutSession {
  id?: number;
  sessionDate: string;
  durationMinutes?: number;
  exercises: string;
  completionRate?: number;
  difficultyRating?: number;
  notes?: string;
  workoutPlanId?: number;
  workoutPlan?: {
    name: string;
    planDetails?: string;
  };
}

interface ExerciseProgress {
  exerciseName: string;
  history: {
    date: string;
    weight: string;
    reps: string;
    sets: number;
    completedSets: number;
  }[];
}

const Progress: React.FC = () => {
  const user = useStore((state) => state.user);
  const { data: sessions = [], isLoading, error } = useWorkoutSessions(user?.id);
  const deleteMutation = useDeleteWorkoutSession();

  const [filteredSessions, setFilteredSessions] = useState<WorkoutSession[]>([]);
  const [sessionToDelete, setSessionToDelete] = useState<number | null>(null);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<string>('');
  const [exerciseProgression, setExerciseProgression] = useState<ExerciseProgress | null>(null);
  const [allExercises, setAllExercises] = useState<string[]>([]);
  const [exerciseFilter, setExerciseFilter] = useState<string>('all');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const sessionRefs = React.useRef<Map<number, HTMLElement>>(new Map());

  // Update filtered sessions and exercises when sessions change
  useEffect(() => {
    if (sessions.length > 0) {
      setFilteredSessions(sessions);

      // Extract unique exercises
      const exercises = new Set<string>();
      sessions.forEach(session => {
        const sessionExercises = parseExercises(session.exercises);
        sessionExercises.forEach(ex => exercises.add(ex.name));
      });
      setAllExercises(Array.from(exercises).sort());
    }
  }, [sessions]);

  const handleExerciseFilterChange = (exerciseName: string) => {
    setExerciseFilter(exerciseName);
    if (exerciseName === 'all') {
      setFilteredSessions(sessions);
    } else {
      const filtered = sessions.filter(session => {
        const exercises = parseExercises(session.exercises);
        return exercises.some(ex => ex.name === exerciseName);
      });
      setFilteredSessions(filtered);
    }
  };

  const getWorkoutsByDate = (): Map<string, WorkoutSession[]> => {
    const dateMap = new Map<string, WorkoutSession[]>();
    sessions.forEach(session => {
      const date = new Date(session.sessionDate);
      const dateKey = date.toDateString();
      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, []);
      }
      dateMap.get(dateKey)!.push(session);
    });
    return dateMap;
  };

  const scrollToSession = (sessionId: number) => {
    const element = sessionRefs.current.get(sessionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Add a highlight effect
      element.style.transition = 'background-color 0.5s ease';
      const originalBg = element.style.backgroundColor;
      element.style.backgroundColor = 'rgba(102, 126, 234, 0.15)';
      setTimeout(() => {
        element.style.backgroundColor = originalBg;
      }, 1500);
    }
  };

  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const workoutsByDate = getWorkoutsByDate();
    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateKey = date.toDateString();
      const dayWorkouts = workoutsByDate.get(dateKey);

      if (dayWorkouts && dayWorkouts.length > 0) {
        // Use the color from the first workout's plan (or default)
        const planColor = (dayWorkouts[0].workoutPlan as any)?.color || '#667eea';

        days.push(
          <div
            key={day}
            className="calendar-day workout-day"
            style={{
              background: `linear-gradient(135deg, ${planColor} 0%, ${planColor}dd 100%)`,
              cursor: 'pointer',
            }}
            onClick={() => scrollToSession(dayWorkouts[0].id!)}
          >
            {day}
            {dayWorkouts.length > 1 && (
              <span style={{ fontSize: '10px', position: 'absolute', top: '2px', right: '2px' }}>
                +{dayWorkouts.length - 1}
              </span>
            )}
          </div>
        );
      } else {
        days.push(
          <div
            key={day}
            className="calendar-day"
          >
            {day}
          </div>
        );
      }
    }

    return days;
  };

  const changeMonth = (delta: number) => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + delta, 1));
  };

  const handleDeleteClick = (sessionId: number) => {
    console.log('🗑️ Delete button clicked for session ID:', sessionId);
    setSessionToDelete(sessionId);
    setShowDeleteAlert(true);
  };

  const confirmDelete = async () => {
    if (sessionToDelete !== null) {
      console.log('✅ User confirmed deletion for session ID:', sessionToDelete);
      try {
        console.log('📤 Sending delete request to backend...');
        await deleteMutation.mutateAsync(sessionToDelete);
        console.log('✅ Workout session deleted successfully');
      } catch (error) {
        console.error('❌ Error deleting session:', error);
      }
    }
    setShowDeleteAlert(false);
    setSessionToDelete(null);
  };

  const parseExercises = (exercisesJson: string | null): Exercise[] => {
    if (!exercisesJson) {
      return [];
    }
    try {
      return JSON.parse(exercisesJson);
    } catch (error) {
      console.error('Error parsing exercises:', error);
      return [];
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
    }
  };

  const formatFullDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }) + ' at ' + date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getWorkoutTitle = (session: WorkoutSession): string => {
    if (session.workoutPlan?.planDetails) {
      // Parse the plan details to find the workout day that matches this session's exercises
      const exercises = parseExercises(session.exercises);
      if (exercises.length > 0) {
        const planDetails = session.workoutPlan.planDetails;

        // Match the workout based on exercise names
        // Extract all day titles from the plan
        const dayPattern = /Day \d+ - ([^:]+):/gi;
        let match;
        const days: { title: string, content: string }[] = [];

        while ((match = dayPattern.exec(planDetails)) !== null) {
          const dayTitle = match[1].trim();
          const startIndex = match.index;
          const nextMatch = dayPattern.exec(planDetails);
          const endIndex = nextMatch ? nextMatch.index : planDetails.length;
          dayPattern.lastIndex = startIndex + match[0].length; // Reset for next iteration

          const dayContent = planDetails.substring(startIndex, endIndex);
          days.push({ title: dayTitle, content: dayContent });
        }

        // Find the day that contains the most matching exercises
        let bestMatch = { title: '', matchCount: 0 };
        for (const day of days) {
          let matchCount = 0;
          for (const exercise of exercises) {
            if (day.content.toLowerCase().includes(exercise.name.toLowerCase())) {
              matchCount++;
            }
          }
          if (matchCount > bestMatch.matchCount) {
            bestMatch = { title: day.title, matchCount };
          }
        }

        if (bestMatch.matchCount > 0) {
          return bestMatch.title;
        }
      }
    }
    return session.workoutPlan?.name || 'Workout Session';
  };

  const loadExerciseProgression = (exerciseName: string) => {
    const progression: ExerciseProgress = {
      exerciseName,
      history: []
    };

    sessions.forEach(session => {
      const exercises = parseExercises(session.exercises);
      const exercise = exercises.find(ex => ex.name === exerciseName);
      if (exercise) {
        progression.history.push({
          date: session.sessionDate,
          weight: exercise.weight,
          reps: exercise.reps,
          sets: exercise.sets,
          completedSets: exercise.completedSets
        });
      }
    });

    // Sort by date (newest first)
    progression.history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setExerciseProgression(progression);
    setShowProgressModal(true);
  };

  const getDifficultyColor = (rating: number) => {
    if (rating <= 3) return 'success';
    if (rating <= 6) return 'warning';
    return 'danger';
  };

  const getCompletionColor = (rate: number) => {
    if (rate >= 0.9) return 'success';
    if (rate >= 0.7) return 'warning';
    return 'danger';
  };

  if (isLoading) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Progress</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          <div className="loading-container">
            <IonSpinner />
          </div>
        </IonContent>
      </IonPage>
    );
  }

  if (!sessions || sessions.length === 0) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Progress</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          <div className="no-sessions-container">
            <IonIcon icon={trendingUp} className="empty-icon" />
            <h2>No Workouts Yet</h2>
            <p>Complete your first workout to see your progress here!</p>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Progress</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => setShowProgressModal(true)}>
              <IonIcon icon={statsChartOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <div className="progress-container">
          <div className="stats-summary">
            <IonCard className="summary-card">
              <IonCardContent>
                <div className="summary-stats">
                  <div className="stat-box">
                    <IonIcon icon={fitness} className="stat-icon" />
                    <div className="stat-value">{sessions.length}</div>
                    <div className="stat-label">Total Workouts</div>
                  </div>
                  <div className="stat-box">
                    <IonIcon icon={time} className="stat-icon" />
                    <div className="stat-value">
                      {sessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0)}
                    </div>
                    <div className="stat-label">Total Minutes</div>
                  </div>
                  <div className="stat-box">
                    <IonIcon icon={checkmarkCircle} className="stat-icon" />
                    <div className="stat-value">
                      {Math.round(
                        (sessions.reduce((sum, s) => sum + (s.completionRate || 0), 0) /
                          sessions.length) *
                        100
                      )}
                      %
                    </div>
                    <div className="stat-label">Avg Completion</div>
                  </div>
                </div>
              </IonCardContent>
            </IonCard>
          </div>

          <IonCard className="calendar-card">
            <IonCardHeader>
              <div className="calendar-header">
                <IonButton fill="clear" size="small" onClick={() => changeMonth(-1)}>
                  &lt;
                </IonButton>
                <IonCardTitle>
                  {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </IonCardTitle>
                <IonButton fill="clear" size="small" onClick={() => changeMonth(1)}>
                  &gt;
                </IonButton>
              </div>
            </IonCardHeader>
            <IonCardContent>
              <div className="calendar-grid">
                <div className="calendar-weekdays">
                  <div>Sun</div>
                  <div>Mon</div>
                  <div>Tue</div>
                  <div>Wed</div>
                  <div>Thu</div>
                  <div>Fri</div>
                  <div>Sat</div>
                </div>
                <div className="calendar-days">
                  {renderCalendar()}
                </div>
              </div>
            </IonCardContent>
          </IonCard>

          <div className="filter-section">
            <IonCard>
              <IonCardContent>
                <IonLabel>Filter by Exercise:</IonLabel>
                <IonSelect
                  value={exerciseFilter}
                  onIonChange={(e) => handleExerciseFilterChange(e.detail.value)}
                  interface="popover"
                  style={{ width: '100%', marginTop: '8px' }}
                >
                  <IonSelectOption value="all">All Exercises</IonSelectOption>
                  {allExercises.map(exercise => (
                    <IonSelectOption key={exercise} value={exercise}>
                      {exercise}
                    </IonSelectOption>
                  ))}
                </IonSelect>
              </IonCardContent>
            </IonCard>
          </div>

          <h2 className="section-title">
            Workout History {exerciseFilter !== 'all' && `- ${exerciseFilter}`}
          </h2>

          <div className="sessions-list">
            {filteredSessions.map((session) => {
              const exercises = parseExercises(session.exercises);
              const displayExercises = exerciseFilter === 'all'
                ? exercises
                : exercises.filter(ex => ex.name === exerciseFilter);

              return (
                <IonCard
                  key={session.id}
                  className="session-card"
                  ref={(el) => {
                    if (el && session.id) {
                      sessionRefs.current.set(session.id, el);
                    }
                  }}
                >
                  <IonCardHeader>
                    <div className="session-header">
                      <div className="session-info">
                        <IonCardTitle className="workout-title">
                          {getWorkoutTitle(session)}
                        </IonCardTitle>
                        <p className="session-date-full">
                          {formatFullDate(session.sessionDate)}
                        </p>
                        {session.workoutPlan && (
                          <p className="workout-plan-name">
                            {session.workoutPlan.name}
                          </p>
                        )}
                      </div>
                      <div className="session-badges">
                        <IonChip
                          color={getCompletionColor(session.completionRate || 0)}
                        >
                          {Math.round((session.completionRate || 0) * 100)}% Complete
                        </IonChip>
                        <IonButton
                          fill="clear"
                          color="danger"
                          size="small"
                          onClick={() => handleDeleteClick(session.id!)}
                        >
                          <IonIcon slot="icon-only" icon={trashOutline} />
                        </IonButton>
                      </div>
                    </div>
                  </IonCardHeader>

                  <IonCardContent>
                    <div className="session-meta">
                      <div className="meta-item">
                        <IonIcon icon={time} />
                        <span>{session.durationMinutes} min</span>
                      </div>
                      <div className="meta-item">
                        <IonIcon icon={barbell} />
                        <span>{displayExercises.length} exercise{displayExercises.length !== 1 ? 's' : ''}</span>
                      </div>
                      {session.difficultyRating && (
                        <div className="meta-item">
                          <IonBadge color={getDifficultyColor(session.difficultyRating)}>
                            Difficulty: {session.difficultyRating}/10
                          </IonBadge>
                        </div>
                      )}
                    </div>

                    <div className="exercises-detail">
                      <h3 className="exercises-title">Exercises</h3>
                      <IonList className="exercise-list">
                        {displayExercises.map((exercise, idx) => (
                          <IonItem
                            key={idx}
                            lines="none"
                            className="exercise-item"
                            button
                            onClick={() => loadExerciseProgression(exercise.name)}
                          >
                            <div className="exercise-content">
                              <div className="exercise-header-row">
                                <IonLabel className="exercise-name">
                                  {exercise.name}
                                </IonLabel>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                  {exercise.completedSets === exercise.sets ? (
                                    <IonIcon
                                      icon={checkmarkCircle}
                                      color="success"
                                      className="completed-icon"
                                    />
                                  ) : null}
                                  <IonIcon
                                    icon={statsChartOutline}
                                    color="primary"
                                    style={{ fontSize: '18px' }}
                                  />
                                </div>
                              </div>
                              <div className="exercise-details-row">
                                <div className="detail-chip">
                                  <span className="detail-label">Sets:</span>
                                  <span className="detail-value">
                                    {exercise.completedSets}/{exercise.sets}
                                  </span>
                                </div>
                                <div className="detail-chip">
                                  <span className="detail-label">Reps:</span>
                                  <span className="detail-value">{exercise.reps}</span>
                                </div>
                                <div className="detail-chip weight-chip">
                                  <span className="detail-label">Weight:</span>
                                  <span className="detail-value">{exercise.weight}</span>
                                </div>
                              </div>
                            </div>
                          </IonItem>
                        ))}
                      </IonList>
                    </div>

                    {session.notes && (
                      <div className="session-notes">
                        <h4>Notes</h4>
                        <p>{session.notes}</p>
                      </div>
                    )}
                  </IonCardContent>
                </IonCard>
              );
            })}
          </div>
        </div>

        <IonAlert
          isOpen={showDeleteAlert}
          onDidDismiss={() => setShowDeleteAlert(false)}
          header="Delete Workout"
          message="Are you sure you want to delete this workout session? This action cannot be undone."
          buttons={[
            {
              text: 'Cancel',
              role: 'cancel',
              handler: () => {
                setShowDeleteAlert(false);
                setSessionToDelete(null);
              }
            },
            {
              text: 'Delete',
              role: 'destructive',
              handler: confirmDelete
            }
          ]}
        />

        <IonModal isOpen={showProgressModal} onDidDismiss={() => setShowProgressModal(false)}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>Exercise Progression</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setShowProgressModal(false)}>
                  <IonIcon icon={close} />
                </IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            <IonCard>
              <IonCardContent>
                <h3 style={{ marginBottom: '16px' }}>Select Exercise</h3>
                <IonSelect
                  value={selectedExercise}
                  placeholder="Choose an exercise"
                  onIonChange={(e) => {
                    setSelectedExercise(e.detail.value);
                    loadExerciseProgression(e.detail.value);
                  }}
                >
                  {allExercises.map((exercise) => (
                    <IonSelectOption key={exercise} value={exercise}>
                      {exercise}
                    </IonSelectOption>
                  ))}
                </IonSelect>
              </IonCardContent>
            </IonCard>

            {exerciseProgression && exerciseProgression.history.length > 0 && (
              <IonCard>
                <IonCardHeader>
                  <IonCardTitle>{exerciseProgression.exerciseName}</IonCardTitle>
                </IonCardHeader>
                <IonCardContent>
                  <IonList>
                    {exerciseProgression.history.map((entry, idx) => (
                      <IonItem key={idx} lines="inset">
                        <IonLabel>
                          <h3>{formatFullDate(entry.date)}</h3>
                          <div style={{ marginTop: '8px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                            <IonBadge color="primary">
                              {entry.completedSets}/{entry.sets} sets
                            </IonBadge>
                            <IonBadge color="secondary">
                              {entry.reps} reps
                            </IonBadge>
                            <IonBadge color="tertiary">
                              {entry.weight}
                            </IonBadge>
                          </div>
                        </IonLabel>
                        {idx < exerciseProgression.history.length - 1 && (
                          <IonIcon
                            icon={trendingUp}
                            slot="end"
                            color={
                              parseFloat(entry.weight) > parseFloat(exerciseProgression.history[idx + 1].weight)
                                ? 'success'
                                : parseFloat(entry.weight) < parseFloat(exerciseProgression.history[idx + 1].weight)
                                  ? 'danger'
                                  : 'medium'
                            }
                          />
                        )}
                      </IonItem>
                    ))}
                  </IonList>
                </IonCardContent>
              </IonCard>
            )}

            {exerciseProgression && exerciseProgression.history.length === 0 && (
              <IonCard>
                <IonCardContent>
                  <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    No history found for this exercise.
                  </p>
                </IonCardContent>
              </IonCard>
            )}
          </IonContent>
        </IonModal>
      </IonContent>
    </IonPage>
  );
};

export default Progress;
