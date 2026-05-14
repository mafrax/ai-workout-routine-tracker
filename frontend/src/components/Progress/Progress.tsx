import React, { useEffect, useState } from 'react';
import {
  IonAlert,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonContent,
  IonHeader,
  IonIcon,
  IonLabel,
  IonPage,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { statsChartOutline, trendingUp } from 'ionicons/icons';
import { useStore } from '../../store/useStore';
import { useDeleteWorkoutSession, useWorkoutSessions } from '../../hooks/useWorkoutQueries';
import StatsSummary from './StatsSummary';
import WorkoutCalendar from './WorkoutCalendar';
import SessionCard from './SessionCard';
import ExerciseProgressionModal from './ExerciseProgressionModal';
import { parseExercises, type ProgressSession } from './progressHelpers';
import './Progress.css';

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

/**
 * Progress page shell — owns the sessions query, exercise filter, calendar
 * month state, and the delete + progression-modal flows. Each presentation
 * concern lives in its own sibling under components/Progress/.
 */
const Progress: React.FC = () => {
  const user = useStore((state) => state.user);
  const { data: sessions = [], isLoading } = useWorkoutSessions(user?.id);
  const deleteMutation = useDeleteWorkoutSession();

  const [sessionToDelete, setSessionToDelete] = useState<number | null>(null);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<string>('');
  const [exerciseProgression, setExerciseProgression] = useState<ExerciseProgress | null>(null);
  const [allExercises, setAllExercises] = useState<string[]>([]);
  const [exerciseFilter, setExerciseFilter] = useState<string>('all');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const sessionRefs = React.useRef<Map<number, HTMLElement>>(new Map());

  // Derive the unique exercise list whenever sessions change.
  useEffect(() => {
    if (sessions.length === 0) return;
    const exercises = new Set<string>();
    sessions.forEach((s) => parseExercises(s as ProgressSession).forEach((ex) => exercises.add(ex.name)));
    setAllExercises(Array.from(exercises).sort());
  }, [sessions]);

  const filteredSessions =
    exerciseFilter === 'all'
      ? sessions
      : sessions.filter((s) => parseExercises(s as ProgressSession).some((ex) => ex.name === exerciseFilter));

  const scrollToSession = (sessionId: number) => {
    const el = sessionRefs.current.get(sessionId);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    el.style.transition = 'background-color 0.5s ease';
    const originalBg = el.style.backgroundColor;
    el.style.backgroundColor = 'rgba(102, 126, 234, 0.15)';
    setTimeout(() => {
      el.style.backgroundColor = originalBg;
    }, 1500);
  };

  const registerSessionRef = (sessionId: number, el: HTMLElement | null) => {
    if (el) sessionRefs.current.set(sessionId, el);
    else sessionRefs.current.delete(sessionId);
  };

  const handleDeleteClick = (sessionId: number) => {
    setSessionToDelete(sessionId);
    setShowDeleteAlert(true);
  };

  const confirmDelete = async () => {
    if (sessionToDelete !== null && user) {
      const session = sessions.find((s) => s.id === sessionToDelete);
      try {
        await deleteMutation.mutateAsync({
          sessionId: sessionToDelete,
          userId: user.id ?? 0,
          planId: session?.workoutPlanId,
        });
      } catch (error) {
        console.error('Error deleting session:', error);
      }
    }
    setShowDeleteAlert(false);
    setSessionToDelete(null);
  };

  const loadExerciseProgression = (exerciseName: string) => {
    const history: ExerciseProgress['history'] = [];
    sessions.forEach((session) => {
      const exercises = parseExercises(session as ProgressSession);
      const found = exercises.find((ex) => ex.name === exerciseName);
      if (found) {
        history.push({
          date: session.sessionDate,
          weight: found.weight,
          reps: found.reps,
          sets: found.sets,
          completedSets: found.completedSets,
        });
      }
    });
    history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setSelectedExercise(exerciseName);
    setExerciseProgression({ exerciseName, history });
    setShowProgressModal(true);
  };

  const changeMonth = (delta: number) => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + delta, 1));
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
          <StatsSummary sessions={sessions as ProgressSession[]} />

          <WorkoutCalendar
            sessions={sessions as ProgressSession[]}
            currentMonth={currentMonth}
            onChangeMonth={changeMonth}
            onSessionClick={scrollToSession}
          />

          <div className="filter-section">
            <IonCard>
              <IonCardContent>
                <IonLabel>Filter by Exercise:</IonLabel>
                <IonSelect
                  value={exerciseFilter}
                  onIonChange={(e) => setExerciseFilter(e.detail.value)}
                  interface="popover"
                  style={{ width: '100%', marginTop: '8px' }}
                >
                  <IonSelectOption value="all">All Exercises</IonSelectOption>
                  {allExercises.map((exercise) => (
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
            {filteredSessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session as ProgressSession}
                exerciseFilter={exerciseFilter}
                registerRef={registerSessionRef}
                onDelete={handleDeleteClick}
                onExerciseClick={loadExerciseProgression}
              />
            ))}
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
              },
            },
            {
              text: 'Delete',
              role: 'destructive',
              handler: confirmDelete,
            },
          ]}
        />

        <ExerciseProgressionModal
          isOpen={showProgressModal}
          allExercises={allExercises}
          selectedExercise={selectedExercise}
          progression={exerciseProgression}
          onSelectExercise={loadExerciseProgression}
          onClose={() => setShowProgressModal(false)}
        />
      </IonContent>
    </IonPage>
  );
};

export default Progress;
