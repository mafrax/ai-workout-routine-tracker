import { Preferences } from '@capacitor/preferences';
import {
  IonBadge,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonChip,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonModal,
  IonPage,
  IonSpinner,
  IonTitle,
  IonToast,
  IonToolbar
} from '@ionic/react';
import { add, archive, barbell, calendar, checkmarkCircle, checkmarkCircleOutline, close, copy, eye, eyeOff, fitness, pause, send, time } from 'ionicons/icons';
import React, { useEffect, useState } from 'react';
import { workoutPlanApi as backendWorkoutPlanApi, workoutSessionApi, workoutApi } from '../../services/api_backend';
import { useStore } from '../../store/useStore';
import { useStartPlanCreation } from '../../hooks/useStartPlanCreation';
import { useActivePlan, useUpdateActivePlan } from '../../hooks/useActivePlan';
import { parseWorkoutPlan, type DailyWorkout } from '../../types/workout';
import './TodaysWorkout.css';
import WorkoutExecution from './WorkoutExecution';
import PlanCarousel from './PlanCarousel';
import PlanDetailsModal from './PlanDetailsModal';
import WorkoutDayCard from './WorkoutDayCard';

const TodaysWorkout: React.FC = () => {
  const { user } = useStore();
  const authReady = useStore((s) => s.authReady);
  const { data: activeWorkoutPlan } = useActivePlan();
  const { setActivePlan: setActiveWorkoutPlan } = useUpdateActivePlan();
  const { startPlanCreation, canCreatePlan, isCheckingProfile } = useStartPlanCreation();
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [workoutInProgress, setWorkoutInProgress] = useState(false);
  const [hasCheckedGeneration, setHasCheckedGeneration] = useState(false);
  const [activeWorkoutPlans, setActiveWorkoutPlans] = useState<any[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [hideCompleted, setHideCompleted] = useState(true);
  const [showPlanDetailsModal, setShowPlanDetailsModal] = useState(false);
  const [viewingPlan, setViewingPlan] = useState<any | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [workouts, setWorkouts] = useState<DailyWorkout[]>([]);
  const [loadingWorkouts, setLoadingWorkouts] = useState(false);

  const toggleHideCompleted = async () => {
    const newValue = !hideCompleted;
    setHideCompleted(newValue);
    await Preferences.set({
      key: 'hideCompletedWorkouts',
      value: JSON.stringify(newValue)
    });
  };

  // Load workouts with fallback pattern
  const loadWorkouts = async (plan: any): Promise<DailyWorkout[]> => {
    if (!plan?.id) {
      return [];
    }

    setLoadingWorkouts(true);
    try {
      // 1. Try fetching structured workouts from API
      const response = await workoutApi.getByPlan(plan.id);

      if (response && Array.isArray(response) && response.length > 0) {
        console.log('✅ Using structured workout data from API:', response.length, 'workouts');

        // Transform API response to DailyWorkout format.
        // The API stores numberOfReps as a JSON array where length == set count
        // and each entry == reps for that set. The Exercise type expects a
        // numeric sets count and a string reps value, so we collapse the array.
        const transformedWorkouts: DailyWorkout[] = response.map((w: any) => ({
          dayNumber: w.day,
          focus: w.muscleGroup,
          exercises: w.exercises.map((ex: any) => {
            const repsArray: any[] = Array.isArray(ex.numberOfReps) ? ex.numberOfReps : [];
            const setsCount = repsArray.length || 1;
            const repsValue = repsArray.length > 0 ? String(repsArray[0]) : '';
            return {
              name: ex.exerciseTitle,
              sets: setsCount,
              reps: repsValue,
              weight: ex.isBodyweight ? 'bodyweight' : `${ex.weight}kg`,
              restBetweenSets: typeof ex.restTime === 'number' ? ex.restTime : 60,
              restBeforeNext: typeof ex.restTime === 'number' ? ex.restTime : 90,
              // Pass-through: backend already validated this; if it's there it
              // matches the ExerciseAttributes union, otherwise null.
              attributes: ex.attributes ?? null,
            };
          })
        }));

        setWorkouts(transformedWorkouts);
        return transformedWorkouts;
      }
    } catch (error) {
      console.warn('⚠️ Failed to fetch structured workouts, falling back to plan_details parsing:', error);
      // Surface the failure so it's not invisible to the user; the text-parse
      // fallback below is best-effort and may render approximate values.
      setToastMessage('Could not load full workout data — showing best guess from text.');
      setShowToast(true);
    }

    // 2. Fallback: parse plan_details text
    try {
      if (plan.planDetails) {
        console.log('📝 Falling back to plan_details parsing');
        const parsed = parseWorkoutPlan(plan.planDetails);
        setWorkouts(parsed.weeklyWorkouts);
        return parsed.weeklyWorkouts;
      }
    } catch (parseError) {
      console.error('❌ Failed to parse plan_details:', parseError);
      setToastMessage('Could not parse this plan — please reopen the chat to regenerate.');
      setShowToast(true);
    }

    setWorkouts([]);
    return [];
  };


  useEffect(() => {
    // Wait for the auth bootstrap to finish before touching the network — this
    // is the gate that fixes the "empty for a few seconds" flicker.
    if (!authReady) return;

    const initializeData = async () => {
      // No user post-bootstrap means the user is not signed in — auth gate
      // handles redirect; nothing to load here.
      if (!user) {
        setLoading(false);
        return;
      }

      // User exists, load plan if needed
      if (!activeWorkoutPlan) {
        await loadActivePlan();
      } else {
        setLoading(false);
        // Check if we need to generate workouts on page load (only once)
        if (!hasCheckedGeneration) {
          setHasCheckedGeneration(true);
          await checkAndGenerateNewWorkouts(activeWorkoutPlan);
        }
      }
    };

    initializeData();
  }, [authReady, user, activeWorkoutPlan, hasCheckedGeneration]);

  // Reload all plans (active and archived) whenever the activeWorkoutPlan changes
  useEffect(() => {
    if (user?.id && activeWorkoutPlan) {
      const refreshPlans = async () => {
        const allPlans = await backendWorkoutPlanApi.getUserPlans(user.id!);
        // Show all plans (both active and archived)
        setActiveWorkoutPlans(allPlans);

        // Update the selected plan if it matches the activeWorkoutPlan
        if (selectedPlanId == activeWorkoutPlan.id) {
          const updatedPlan = allPlans.find(p => p.id == activeWorkoutPlan.id);
          if (updatedPlan) {
            // Force re-render by updating both states
            setActiveWorkoutPlans([...allPlans]);
          }
        }
      };
      refreshPlans();
    }
  }, [activeWorkoutPlan?.planDetails]);

  // Load workouts when selectedPlanId changes
  useEffect(() => {
    const currentPlan = activeWorkoutPlans.find(p => p.id == selectedPlanId);
    if (currentPlan) {
      loadWorkouts(currentPlan);
    }
  }, [selectedPlanId, activeWorkoutPlans]);

  const loadActivePlan = async () => {
    if (!user?.id) return;

    try {
      // Load all plans from backend (including archived)
      const allPlans = await backendWorkoutPlanApi.getUserPlans(user.id);

      // Show all plans in carousel
      setActiveWorkoutPlans(allPlans);

      // Set the first active (non-archived) plan as the default selected plan, or first plan if none active
      const activePlans = allPlans.filter(p => p.isActive && !p.isArchived);
      const firstPlan = activePlans.length > 0 ? activePlans[0] : allPlans[0];

      if (firstPlan) {
        setActiveWorkoutPlan(firstPlan);
        setSelectedPlanId(firstPlan.id!);

        // Sync completion status with actual sessions
        await syncPlanCompletion(firstPlan.id);
      }
    } catch (error) {
      console.error('Error loading active plan:', error);
    } finally {
      setLoading(false);
    }
  };

  const syncPlanCompletion = async (planId: any) => {
    try {
      console.log(`🔄 Syncing completion status for plan ${planId}`);
      const response = await fetch(
        `https://workout-marcs-projects-3a713b55.vercel.app/api/plans/${planId}/sync-completion`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' } }
      );

      if (response.ok) {
        const syncedPlan = await response.json();
        console.log(`✅ Synced plan completion:`, syncedPlan.completedWorkouts);

        // Update local state with synced plan
        setActiveWorkoutPlan(syncedPlan);
        setActiveWorkoutPlans(plans =>
          plans.map(p => p.id === syncedPlan.id ? syncedPlan : p)
        );
      }
    } catch (error) {
      console.error('❌ Error syncing plan completion:', error);
    }
  };

  // PlanCarousel manages its own index internally and syncs to
  // selectedPlanId via a prop — no parent-side mirroring needed.

  const handlePlanSelect = async (planId: number) => {
    const plan = activeWorkoutPlans.find(p => p.id == planId);
    console.log(activeWorkoutPlans)
    console.log(planId);
    console.log(plan);
    if (plan) {
      setSelectedPlanId(planId);
      setActiveWorkoutPlan(plan);
      // Load workouts for this plan
      await loadWorkouts(plan);
    }
  };

  const handleViewPlanDetails = (plan: any) => {
    setViewingPlan(plan);
    setShowPlanDetailsModal(true);
  };

  const handleTogglePlanActive = async (plan: any) => {
    if (!user?.id || !plan.id) return;

    try {
      const updatedPlan = await backendWorkoutPlanApi.updatePlan(plan.id, {
        ...plan,
        isActive: !plan.isActive
      });

      // Update local state
      setActiveWorkoutPlans(plans =>
        plans.map(p => p.id === updatedPlan.id ? updatedPlan : p)
      );

      // If this is the selected plan, update it
      if (plan.id === selectedPlanId) {
        setActiveWorkoutPlan(updatedPlan);
      }

      setToastMessage(updatedPlan.isActive ? 'Plan activated!' : 'Plan paused!');
      setShowToast(true);
    } catch (error) {
      console.error('Error toggling plan:', error);
      setToastMessage('Failed to update plan');
      setShowToast(true);
    }
  };

  const handleArchivePlan = async (plan: any) => {
    if (!plan.id) return;

    try {
      const updatedPlan = await backendWorkoutPlanApi.updatePlan(plan.id, {
        ...plan,
        isArchived: !plan.isArchived,
        isActive: false
      });

      // Update local state
      setActiveWorkoutPlans(plans =>
        plans.map(p => p.id === updatedPlan.id ? updatedPlan : p)
      );

      // If this was the selected plan and it's now archived, select another one
      if (plan.id === selectedPlanId && updatedPlan.isArchived) {
        const activePlans = activeWorkoutPlans.filter(p => p.isActive && !p.isArchived && p.id !== plan.id);
        if (activePlans.length > 0) {
          setSelectedPlanId(activePlans[0].id);
          setActiveWorkoutPlan(activePlans[0]);
        }
      }

      setToastMessage(updatedPlan.isArchived ? 'Plan archived!' : 'Plan restored!');
      setShowToast(true);
    } catch (error) {
      console.error('Error archiving plan:', error);
      setToastMessage('Failed to archive plan');
      setShowToast(true);
    }
  };

  const parseNextWorkouts = (planDetails: string, count: number = 4) => {
    const lines = planDetails.split('\n');
    const workouts: Array<{ day: string; exercises: string[] }> = [];
    let currentDay = '';
    let currentExercises: string[] = [];

    lines.forEach(line => {
      const trimmedLine = line.trim();

      // Check if it's a day header (e.g., "Day 1 - Push", "Day 1:", etc.)
      if (trimmedLine.match(/^Day\s+\d+/i)) {
        // Save previous day if exists
        if (currentDay && currentExercises.length > 0) {
          workouts.push({ day: currentDay, exercises: [...currentExercises] });
          currentExercises = [];
        }
        currentDay = trimmedLine;
      } else if (trimmedLine && currentDay && trimmedLine.match(/^\d+\./)) {
        // It's an exercise line (starts with number and period)
        currentExercises.push(trimmedLine);
      }
    });

    // Add the last day
    if (currentDay && currentExercises.length > 0) {
      workouts.push({ day: currentDay, exercises: [...currentExercises] });
    }

    return workouts.slice(0, count);
  };

  const handleCopyPlanDetails = (plan: any) => {
    navigator.clipboard.writeText(plan.planDetails || '');
    setToastMessage('Plan details copied to clipboard!');
    setShowToast(true);
  };

  const handleSendWorkoutPreview = async (plan: any) => {
    setToastMessage('Sending workout preview to Telegram...');
    setShowToast(true);
    // TODO: Implement Telegram send functionality
  };

  const handleUpdateTelegramHour = async (plan: any, hour: number) => {
    if (!plan.id) return;
    try {
      await backendWorkoutPlanApi.updatePlan(plan.id, {
        ...plan,
        telegramPreviewHour: hour
      });
      setActiveWorkoutPlans(plans =>
        plans.map(p => p.id === plan.id ? { ...p, telegramPreviewHour: hour } : p)
      );
      if (viewingPlan?.id === plan.id) {
        setViewingPlan({ ...plan, telegramPreviewHour: hour });
      }
      setToastMessage(`Preview time updated to ${hour}:00`);
      setShowToast(true);
    } catch (error) {
      console.error('Error updating telegram hour:', error);
      setToastMessage('Failed to update preview time');
      setShowToast(true);
    }
  };

  const handleUpdateReminderTime = async (plan: any, reminderTime: string) => {
    if (!plan.id) return;
    try {
      await backendWorkoutPlanApi.updatePlan(plan.id, {
        ...plan,
        reminderTime
      });
      setActiveWorkoutPlans(plans =>
        plans.map(p => p.id === plan.id ? { ...p, reminderTime } : p)
      );
      if (viewingPlan?.id === plan.id) {
        setViewingPlan({ ...plan, reminderTime });
      }
      setToastMessage('Reminder time updated!');
      setShowToast(true);
    } catch (error) {
      console.error('Error updating reminder time:', error);
      setToastMessage('Failed to update reminder time');
      setShowToast(true);
    }
  };

  const startWorkout = (dayNumber: number) => {
    setSelectedDay(dayNumber);
    setWorkoutInProgress(true);
  };

  const markWorkoutIncomplete = async (dayNumber: number) => {
    if (!currentPlan || !user) return;

    try {
      console.log(`🔄 Marking day ${dayNumber} as incomplete for plan ${currentPlan.id}`);

      // Delete workout session(s) for this plan and day
      const planIdNumber = typeof currentPlan.id === 'string' ? parseInt(currentPlan.id) : currentPlan.id;
      await workoutSessionApi.deleteByPlanAndDay(planIdNumber, dayNumber);

      // Refresh the plan to get updated completedWorkouts
      if (user.id) {
        const updatedPlan = await backendWorkoutPlanApi.getActivePlan(user.id);
        setActiveWorkoutPlan(updatedPlan);
      }

      console.log(`✅ Day ${dayNumber} marked as incomplete`);
    } catch (error) {
      console.error('❌ Error marking workout as incomplete:', error);
    }
  };

  const handleWorkoutComplete = async () => {
    setWorkoutInProgress(false);
    setSelectedDay(null);

    // Reload the active plan to get updated completedWorkouts
    if (user?.id) {
      try {
        const updatedPlan = await backendWorkoutPlanApi.getActivePlan(user.id);
        setActiveWorkoutPlan(updatedPlan);

        // Also update the activeWorkoutPlans array so UI reflects completion immediately
        setActiveWorkoutPlans(plans =>
          plans.map(p => p.id === updatedPlan.id ? updatedPlan : p)
        );

        // Check if we need to generate new workouts
        await checkAndGenerateNewWorkouts(updatedPlan);
      } catch (error) {
        console.error('Error reloading plan after workout completion:', error);
      }
    }
  };

  const checkAndGenerateNewWorkouts = async (plan: any) => {
    // Load current workouts to check count
    const currentWorkouts = await loadWorkouts(plan);
    const totalWorkouts = currentWorkouts.length;
    const completedWorkouts = plan.completedWorkouts || [];
    const incompleteCount = totalWorkouts - completedWorkouts.length;

    console.log('=== CHECKING WORKOUT GENERATION ===');
    console.log(`Total workouts: ${totalWorkouts}, Completed: ${completedWorkouts.length}, Incomplete: ${incompleteCount}`);
    console.log('Completed workout days:', completedWorkouts);

    // If we have less than 4 incomplete workouts, generate more
    if (incompleteCount < 4) {
      const neededWorkouts = 4 - incompleteCount;
      console.log(`🔄 Need to generate ${neededWorkouts} new workout(s)...`);

      try {
        // Generate all needed workouts using backend API
        for (let i = 0; i < neededWorkouts; i++) {
          const newWorkoutDay = totalWorkouts + 1 + i;
          console.log(`📝 Generating workout day ${newWorkoutDay} via backend...`);

          const response = await workoutApi.generateNext(plan.id, newWorkoutDay, user!.id!);

          if (response.success) {
            console.log(`✅ Generated workout day ${newWorkoutDay}`);
          }
        }

        // Reload workouts to get the newly generated ones
        await loadWorkouts(plan);

        // Refresh the plan from backend to get updated planDetails
        const updatedPlan = await backendWorkoutPlanApi.getUserPlans(user!.id!);
        const refreshedPlan = updatedPlan.find((p: any) => p.id == plan.id);
        if (refreshedPlan) {
          setActiveWorkoutPlan(refreshedPlan);
        }

        console.log(`💾 Generated ${neededWorkouts} new workout(s) successfully`);
      } catch (error) {
        console.error('❌ Error generating new workouts:', error);
      }
    } else {
      console.log('✓ Sufficient incomplete workouts available');
    }
    console.log('=== END WORKOUT GENERATION CHECK ===');
  };

  // NOTE: generateNextWorkout has been moved to backend API
  // See: POST /api/workouts/generate-next

  if (loading) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Today's Workout</IonTitle>
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

  if (activeWorkoutPlans.length === 0) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Today's Workout</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          <div className="no-plan-container">
            <h2>No Active Plans</h2>
            <p>You don't have any active workout plans yet.</p>
            <IonButton onClick={startPlanCreation} disabled={isCheckingProfile}>
              {canCreatePlan ? 'Create a Plan' : 'Finish profile to create a plan'}
            </IonButton>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  const currentPlan = activeWorkoutPlans.find(p => p.id == selectedPlanId) || activeWorkoutPlans[0];
  if (!currentPlan) {
    return null;
  }

  // Use workouts state (loaded with fallback pattern) instead of parsing on every render
  if (workoutInProgress && selectedDay !== null) {
    const workout = workouts.find(w => w.dayNumber === selectedDay);
    if (workout) {
      return <WorkoutExecution workout={workout} onComplete={handleWorkoutComplete} />;
    }
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Today's Workout</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={startPlanCreation} disabled={isCheckingProfile}>
              <IonIcon icon={add} slot="start" />
              {canCreatePlan ? 'New Plan' : 'Profile'}
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <div className="todays-workout-container">
          <PlanCarousel
            plans={activeWorkoutPlans}
            selectedPlanId={selectedPlanId}
            onSelectPlan={(id) => handlePlanSelect(id as number)}
            onViewDetails={handleViewPlanDetails}
            onToggleActive={handleTogglePlanActive}
            onArchive={handleArchivePlan}
          />

          <div style={{ padding: '0 16px', marginBottom: '16px' }}>
            <h2 className="section-title" style={{ display: 'inline-block', marginRight: '12px' }}>Select Your Workout</h2>
            <IonButton
              fill="clear"
              size="small"
              onClick={toggleHideCompleted}
            >
              <IonIcon icon={hideCompleted ? eye : eyeOff} slot="start" />
              {hideCompleted ? 'Show Completed' : 'Hide Completed'}
            </IonButton>
          </div>

          <div className="workouts-grid">
            {workouts
              .filter((w) => {
                const isCompleted = currentPlan?.completedWorkouts?.includes(w.dayNumber) || false;
                return hideCompleted ? !isCompleted : true;
              })
              .map((w) => (
                <WorkoutDayCard
                  key={w.dayNumber}
                  workout={w}
                  isCompleted={currentPlan?.completedWorkouts?.includes(w.dayNumber) || false}
                  onStart={startWorkout}
                  onMarkIncomplete={markWorkoutIncomplete}
                />
              ))}
          </div>
        </div>
      </IonContent>

      <PlanDetailsModal
        isOpen={showPlanDetailsModal}
        plan={viewingPlan}
        parseNextWorkouts={parseNextWorkouts}
        onCopyDetails={handleCopyPlanDetails}
        onSendWorkoutPreview={handleSendWorkoutPreview}
        onUpdateTelegramHour={handleUpdateTelegramHour}
        onUpdateReminderTime={handleUpdateReminderTime}
        onClose={() => {
          setShowPlanDetailsModal(false);
          setViewingPlan(null);
        }}
      />

      <IonToast
        isOpen={showToast}
        onDidDismiss={() => setShowToast(false)}
        message={toastMessage}
        duration={2000}
        position="top"
      />
    </IonPage>
  );
};

export default TodaysWorkout;
