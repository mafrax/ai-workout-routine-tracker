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
import React, { useEffect, useRef, useState } from 'react';
import { aiService } from '../../services/aiService';
import { workoutPlanApi as backendWorkoutPlanApi, workoutSessionApi } from '../../services/api_backend';
import { useStore } from '../../store/useStore';
import { parseWorkoutPlan, type DailyWorkout } from '../../types/workout';
import './TodaysWorkout.css';
import WorkoutExecution from './WorkoutExecution';

const TodaysWorkout: React.FC = () => {
  const { user, activeWorkoutPlan, setActiveWorkoutPlan } = useStore();
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [workoutInProgress, setWorkoutInProgress] = useState(false);
  const [hasCheckedGeneration, setHasCheckedGeneration] = useState(false);
  const [activeWorkoutPlans, setActiveWorkoutPlans] = useState<any[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [hideCompleted, setHideCompleted] = useState(true);
  const [currentPlanIndex, setCurrentPlanIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);
  const [showPlanDetailsModal, setShowPlanDetailsModal] = useState(false);
  const [viewingPlan, setViewingPlan] = useState<any | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Touch handling for carousel
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && currentPlanIndex < activeWorkoutPlans.length - 1) {
      const newIndex = currentPlanIndex + 1;
      setCurrentPlanIndex(newIndex);
      const newPlan = activeWorkoutPlans[newIndex];
      if (newPlan) {
        handlePlanSelect(newPlan.id);
      }
    }
    if (isRightSwipe && currentPlanIndex > 0) {
      const newIndex = currentPlanIndex - 1;
      setCurrentPlanIndex(newIndex);
      const newPlan = activeWorkoutPlans[newIndex];
      if (newPlan) {
        handlePlanSelect(newPlan.id);
      }
    }
  };

  const toggleHideCompleted = async () => {
    const newValue = !hideCompleted;
    setHideCompleted(newValue);
    await Preferences.set({
      key: 'hideCompletedWorkouts',
      value: JSON.stringify(newValue)
    });
  };


  useEffect(() => {
    const initializeData = async () => {
      // If no user, try loading from API
      if (!user) {
        try {
          const users = await (await import('../../services/api')).userApi.getAll();
          if (users.length > 0) {
            useStore.getState().setUser(users[0]);
            return; // Will trigger re-render
          }
        } catch (error) {
          console.error('Error loading user:', error);
        }
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
  }, [user, activeWorkoutPlan, hasCheckedGeneration]);

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

  // Sync carousel index with selected plan
  useEffect(() => {
    if (selectedPlanId && activeWorkoutPlans.length > 0) {
      const index = activeWorkoutPlans.findIndex(p => p.id === selectedPlanId);
      if (index !== -1 && index !== currentPlanIndex) {
        setCurrentPlanIndex(index);
      }
    }
  }, [selectedPlanId, activeWorkoutPlans, currentPlanIndex]);

  const handlePlanSelect = (planId: number) => {
    const plan = activeWorkoutPlans.find(p => p.id == planId);
    console.log(activeWorkoutPlans)
    console.log(planId);
    console.log(plan);
    if (plan) {
      setSelectedPlanId(planId);
      setActiveWorkoutPlan(plan);
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
    const parsedPlan = parseWorkoutPlan(plan.planDetails);
    const totalWorkouts = parsedPlan.weeklyWorkouts.length;
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
        // Generate all needed workouts
        for (let i = 0; i < neededWorkouts; i++) {
          const newWorkoutDay = totalWorkouts + 1 + i;
          console.log(`📝 Generating workout day ${newWorkoutDay}...`);

          const generatedWorkout = await generateNextWorkout(plan, newWorkoutDay, parsedPlan.weeklyWorkouts);

          if (generatedWorkout) {
            // Append the new workout to the plan details
            plan.planDetails = plan.planDetails + '\n\n' + generatedWorkout;
            console.log(`✅ Generated workout day ${newWorkoutDay}`);
          }
        }

        // Save the updated plan
        const updatedPlan = await backendWorkoutPlanApi.updatePlan(plan.id, {
          planDetails: plan.planDetails
        });
        setActiveWorkoutPlan(updatedPlan);
        console.log(`💾 Saved ${neededWorkouts} new workout(s) to plan`);
      } catch (error) {
        console.error('❌ Error generating new workouts:', error);
      }
    } else {
      console.log('✓ Sufficient incomplete workouts available');
    }
    console.log('=== END WORKOUT GENERATION CHECK ===');
  };

  const generateNextWorkout = async (plan: any, dayNumber: number, existingWorkouts: DailyWorkout[]): Promise<string> => {
    // Determine the muscle group rotation pattern based on existing workouts
    const daysPerWeek = existingWorkouts.length; // Infer from parsed workouts
    const rotationIndex = (dayNumber - 1) % daysPerWeek;
    const targetWorkout = existingWorkouts[rotationIndex];

    const bodyweightExercises = user?.bodyweightExercises || [];
    const bodyweightInfo = bodyweightExercises.length > 0
      ? `
BODYWEIGHT EXERCISES (with max reps):
${bodyweightExercises.map(ex => `- ${ex.name}: Max ${ex.maxReps} reps`).join('\n')}

CRITICAL: You MUST include at least ${Math.min(2, bodyweightExercises.length)} bodyweight exercises in this workout.
Program them based on max reps (strength: 40-60%, hypertrophy: 60-80%, endurance: 80-100%).
`
      : '';

    const prompt = `You are a professional fitness coach creating workout plans. Generate Day ${dayNumber} for this workout program.

EXISTING WORKOUT PLAN (Days 1-${existingWorkouts.length}):
${plan.planDetails}

CONTEXT:
- Plan Name: ${plan.name}
- Days per week: ${daysPerWeek}
- This is a ${daysPerWeek}-day split rotation
- Day ${dayNumber} should follow the same muscle group pattern as Day ${rotationIndex + 1}
${bodyweightInfo}

CRITICAL INSTRUCTIONS:
1. Day ${dayNumber} should target: ${targetWorkout.focus}
2. Use similar exercises to Day ${rotationIndex + 1} but with slight progression (2-5% more weight or 1-2 more reps)
3. ${bodyweightExercises.length > 0 ? 'MANDATORY: Include at least ' + Math.min(2, bodyweightExercises.length) + ' bodyweight exercises mixed with equipment exercises' : 'Use equipment-based exercises'}
4. Follow the EXACT format below - this is mandatory
5. Include ALL rest times (both between sets and before next exercise)
6. Use realistic weights based on the existing plan
7. For bodyweight exercises, use "bodyweight" as the weight
8. DO NOT add any explanation, introduction, or commentary
9. DO NOT ask questions
10. Generate ONLY the workout content

REQUIRED FORMAT (copy this structure exactly):

Day ${dayNumber} - ${targetWorkout.focus}:
1. [Exercise Name] - [Sets]x[Reps] @ [Weight]kg | [Rest between sets]s | [Rest before next]s
2. [Exercise Name] - [Sets]x[Reps] @ [Weight]kg | [Rest between sets]s | [Rest before next]s
3. [Exercise Name] - [Sets]x[Reps] @ [Weight]kg | [Rest between sets]s | [Rest before next]s
4. [Exercise Name] - [Sets]x[Reps] @ [Weight]kg | [Rest between sets]s | [Rest before next]s
5. [Exercise Name] - [Sets]x[Reps] @ [Weight]kg | [Rest between sets]s | [Rest before next]s

EXAMPLE WITH BODYWEIGHT:
Day 5 - Chest & Triceps:
1. Push-ups - 3x12 @ bodyweight | 60s | 90s
2. Smith Machine Bench Press - 4x10 @ 52kg | 90s | 120s
3. Dips - 3x8 @ bodyweight | 60s | 90s
4. Cable Flyes - 3x15 @ 13kg | 60s | 90s
5. Diamond Push-ups - 3x10 @ bodyweight | 60s | 90s

NOW GENERATE:`;

    const response = await aiService.chat(prompt, {});
    const cleaned = response.trim();

    console.log('AI Response for Day', dayNumber, ':', cleaned.substring(0, 200));

    // Validate the response has the correct format
    if (!cleaned.includes(`Day ${dayNumber}`) || !cleaned.includes('-')) {
      console.error('Invalid workout format from AI:', cleaned);
      throw new Error('AI generated invalid workout format');
    }

    return cleaned;
  };

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
            <IonButton routerLink="/chat">Create a Plan</IonButton>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  const currentPlan = activeWorkoutPlans.find(p => p.id == selectedPlanId) || activeWorkoutPlans[0];
  if (!currentPlan) {
    return null;
  }

  const parsedPlan = parseWorkoutPlan(currentPlan.planDetails);

  if (workoutInProgress && selectedDay !== null) {
    const workout = parsedPlan.weeklyWorkouts.find(w => w.dayNumber === selectedDay);
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
            <IonButton routerLink="/chat">
              <IonIcon icon={add} slot="start" />
              New Plan
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <div className="todays-workout-container">
          {activeWorkoutPlans.length > 0 && (
            <div className="plans-mobile-carousel">
              <div
                className="carousel-container"
                ref={carouselRef}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
              >
                <div
                  className="carousel-track"
                  style={{
                    transform: `translateX(-${currentPlanIndex * (100 / activeWorkoutPlans.length)}%)`,
                    width: `${activeWorkoutPlans.length * 100}%`
                  }}
                >
                  {activeWorkoutPlans.map((plan) => (
                    <div key={plan.id} className="carousel-slide" style={{ width: `${100 / activeWorkoutPlans.length}%` }}>
                      <IonCard
                        className={`plan-card ${plan.isArchived ? 'archived' : ''}`}
                        style={{
                          borderLeft: `6px solid ${plan.color || '#667eea'}`,
                          cursor: 'pointer',
                          margin: '0 8px',
                          opacity: plan.isArchived ? 0.7 : 1
                        }}
                        onClick={() => handlePlanSelect(plan.id)}
                      >
                        <IonCardHeader>
                          <div className="plan-header">
                            <IonCardTitle style={{ color: 'var(--text-primary)' }}>{plan.name}</IonCardTitle>
                            {plan.isArchived ? (
                              <IonChip color="medium">
                                <IonIcon icon={archive} />
                                <IonLabel>Archived</IonLabel>
                              </IonChip>
                            ) : plan.id === selectedPlanId ? (
                              <IonChip color="success">
                                <IonIcon icon={checkmarkCircle} />
                                <IonLabel>Active</IonLabel>
                              </IonChip>
                            ) : plan.isActive ? (
                              <IonChip color="primary">
                                <IonIcon icon={checkmarkCircle} />
                                <IonLabel>Active</IonLabel>
                              </IonChip>
                            ) : (
                              <IonChip color="medium">
                                <IonIcon icon={pause} />
                                <IonLabel>Paused</IonLabel>
                              </IonChip>
                            )}
                          </div>
                        </IonCardHeader>

                        <IonCardContent>
                          <p className="plan-description" style={{ color: 'var(--text-secondary)' }}>{plan.description}</p>

                          <div className="plan-stats">
                            <div className="stat-item">
                              <IonIcon icon={calendar} />
                              <span>{plan.daysPerWeek} days/week</span>
                            </div>
                            <div className="stat-item">
                              <IonIcon icon={fitness} />
                              <span>{plan.durationWeeks} weeks</span>
                            </div>
                          </div>

                          <div className="plan-progress">
                            <IonBadge color="primary">
                              {plan.completedWorkouts?.length || 0} workouts completed
                            </IonBadge>
                          </div>

                          <div className="plan-actions" onClick={(e) => e.stopPropagation()}>
                            <IonButton
                              size="small"
                              fill="solid"
                              onClick={() => handleViewPlanDetails(plan)}
                            >
                              View Details
                            </IonButton>

                            <IonButton
                              size="small"
                              fill={plan.isActive ? "outline" : "solid"}
                              color={plan.isActive ? "medium" : "primary"}
                              onClick={() => handleTogglePlanActive(plan)}
                            >
                              <IonIcon icon={plan.isActive ? pause : checkmarkCircle} slot="start" />
                              {plan.isActive ? 'Pause' : 'Activate'}
                            </IonButton>

                            {!plan.isArchived && (
                              <IonButton
                                size="small"
                                fill="outline"
                                color="warning"
                                onClick={() => handleArchivePlan(plan)}
                              >
                                <IonIcon icon={archive} slot="start" />
                                Archive
                              </IonButton>
                            )}
                          </div>
                        </IonCardContent>
                      </IonCard>
                    </div>
                  ))}
                </div>
              </div>

              {/* Carousel indicators and navigation */}
              {activeWorkoutPlans.length > 1 && (
                <>
                  <div className="carousel-indicators">
                    {activeWorkoutPlans.map((_: any, index: number) => (
                      <div
                        key={index}
                        className={`indicator ${index === currentPlanIndex ? 'active' : ''}`}
                        onClick={() => {
                          setCurrentPlanIndex(index);
                          const plan = activeWorkoutPlans[index];
                          if (plan) {
                            handlePlanSelect(plan.id);
                          }
                        }}
                      />
                    ))}
                  </div>
                  <div className="carousel-counter">
                    {currentPlanIndex + 1} of {activeWorkoutPlans.length}
                  </div>
                </>
              )}
            </div>
          )}

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
            {parsedPlan.weeklyWorkouts.filter(workout => {
              const isCompleted = currentPlan?.completedWorkouts?.includes(workout.dayNumber) || false;
              // Default behavior: hide completed workouts unless explicitly showing them
              return hideCompleted ? !isCompleted : true;
            }).map((workout) => {
              const isCompleted = currentPlan?.completedWorkouts?.includes(workout.dayNumber) || false;
              return (
                <IonCard
                  key={workout.dayNumber}
                  className={`workout-day-card ${isCompleted ? 'completed' : ''}`}
                >
                  <IonCardContent>
                    <div className="day-header">
                      <h3>Day {workout.dayNumber}</h3>
                      {isCompleted ? (
                        <IonIcon icon={checkmarkCircleOutline} className="day-icon completed-icon" color="success" />
                      ) : (
                        <IonIcon icon={barbell} className="day-icon" />
                      )}
                    </div>
                    <p className="focus-text">{workout.focus}</p>
                    <div className="workout-meta">
                      <span className="exercise-count">{workout.exercises.length} exercises</span>
                      <span className="set-count">
                        {workout.exercises.reduce((sum, ex) => sum + ex.sets, 0)} sets
                      </span>
                    </div>
                    {isCompleted ? (
                      <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                        <IonButton expand="block" className="start-btn completed-btn" onClick={() => startWorkout(workout.dayNumber)}>
                          Do Again
                        </IonButton>
                        <IonButton
                          expand="block"
                          fill="outline"
                          color="medium"
                          onClick={() => markWorkoutIncomplete(workout.dayNumber)}
                        >
                          Mark Incomplete
                        </IonButton>
                      </div>
                    ) : (
                      <IonButton expand="block" className="start-btn" onClick={() => startWorkout(workout.dayNumber)}>
                        Start Workout
                      </IonButton>
                    )}
                  </IonCardContent>
                </IonCard>
              );
            })}
          </div>
        </div>
      </IonContent>

      <IonModal
        isOpen={showPlanDetailsModal}
        onDidDismiss={() => {
          setShowPlanDetailsModal(false);
          setViewingPlan(null);
        }}
      >
        <IonHeader>
          <IonToolbar>
            <IonTitle>{viewingPlan?.name}</IonTitle>
            <IonButtons slot="end">
              {viewingPlan && (
                <IonButton onClick={() => handleCopyPlanDetails(viewingPlan)}>
                  <IonIcon icon={copy} />
                </IonButton>
              )}
              <IonButton onClick={() => setShowPlanDetailsModal(false)}>
                <IonIcon icon={close} />
              </IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          {viewingPlan && (
            <div style={{ padding: '20px' }}>
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ marginBottom: '8px', color: 'var(--brand-primary)' }}>Description</h3>
                <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>{viewingPlan.description}</p>
              </div>

              <div style={{ marginBottom: '20px', display: 'flex', gap: '12px' }}>
                <IonChip color="primary">
                  <IonIcon icon={calendar} />
                  <IonLabel>{viewingPlan.daysPerWeek} days/week</IonLabel>
                </IonChip>
                <IonChip color="primary">
                  <IonIcon icon={fitness} />
                  <IonLabel>{viewingPlan.durationWeeks} weeks</IonLabel>
                </IonChip>
                {viewingPlan.isActive && (
                  <IonChip color="success">
                    <IonIcon icon={checkmarkCircle} />
                    <IonLabel>Active</IonLabel>
                  </IonChip>
                )}
              </div>

              <IonCard color="secondary" style={{ marginBottom: '20px' }}>
                <IonCardContent>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <IonIcon icon={send} style={{ fontSize: '20px' }} />
                      <strong>Telegram Workout Preview</strong>
                    </div>
                    <IonButton
                      size="small"
                      fill="solid"
                      onClick={() => handleSendWorkoutPreview(viewingPlan)}
                    >
                      <IonIcon icon={send} slot="start" />
                      Send Now
                    </IonButton>
                  </div>
                  <p style={{ fontSize: '14px', marginBottom: '12px', opacity: 0.9 }}>
                    Get your next workout details sent directly to Telegram
                  </p>
                  <div style={{ marginTop: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <IonIcon icon={time} />
                      <span style={{ fontSize: '14px', fontWeight: '500' }}>Daily preview time:</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {[6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22].map((hour) => (
                        <IonButton
                          key={hour}
                          size="small"
                          fill={viewingPlan.telegramPreviewHour === hour ? 'solid' : 'outline'}
                          color={viewingPlan.telegramPreviewHour === hour ? 'primary' : 'medium'}
                          onClick={() => handleUpdateTelegramHour(viewingPlan, hour)}
                        >
                          {hour}:00
                        </IonButton>
                      ))}
                    </div>
                  </div>
                  <p style={{ fontSize: '12px', marginTop: '8px', opacity: 0.7 }}>
                    Note: Scheduled messages require a backend service. Use "Send Now" for manual previews.
                  </p>
                </IonCardContent>
              </IonCard>

              <IonCard color="secondary" style={{ marginBottom: '20px' }}>
                <IonCardContent>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <IonIcon icon={time} style={{ fontSize: '20px' }} />
                    <strong>Workout Reminder Time</strong>
                  </div>
                  <p style={{ fontSize: '14px', marginBottom: '12px', opacity: 0.9 }}>
                    Set a daily reminder time for this workout plan
                  </p>
                  <IonItem>
                    <IonInput
                      type="time"
                      value={viewingPlan.reminderTime || ''}
                      placeholder="Select time"
                      onIonChange={(e) => {
                        if (e.detail.value) {
                          handleUpdateReminderTime(viewingPlan, e.detail.value);
                        }
                      }}
                    />
                  </IonItem>
                  <p style={{ fontSize: '12px', marginTop: '8px', opacity: 0.7 }}>
                    {viewingPlan.reminderTime
                      ? `Daily reminder set for ${viewingPlan.reminderTime}`
                      : 'No reminder time set'}
                  </p>
                </IonCardContent>
              </IonCard>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ margin: 0, color: 'var(--brand-primary)' }}>Next 4 Workouts</h3>
                </div>
                {(() => {
                  const workouts = parseNextWorkouts(viewingPlan.planDetails || '');
                  const hasNoExercises = workouts.length === 0 || workouts.every(w => w.exercises.length === 0);
                  return hasNoExercises ? (
                    <IonCard>
                      <IonCardContent>
                        <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>
                          No exercises found. This plan may be in an old format.
                        </p>
                      </IonCardContent>
                    </IonCard>
                  ) : (
                    parseNextWorkouts(viewingPlan.planDetails || '').map((workout, idx) => (
                      <IonCard key={idx} style={{ marginBottom: '12px' }}>
                        <IonCardHeader>
                          <IonCardTitle style={{ fontSize: '16px' }}>{workout.day}</IonCardTitle>
                        </IonCardHeader>
                        <IonCardContent>
                          <div style={{ fontSize: '14px', lineHeight: '1.8' }}>
                            {workout.exercises.slice(0, 5).map((exercise, exIdx) => (
                              <div key={exIdx} style={{ marginBottom: '4px', color: 'var(--text-secondary)' }}>
                                {exercise}
                              </div>
                            ))}
                            {workout.exercises.length > 5 && (
                              <div style={{ marginTop: '8px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                +{workout.exercises.length - 5} more exercises...
                              </div>
                            )}
                          </div>
                        </IonCardContent>
                      </IonCard>
                    ))
                  );
                })()}
              </div>
            </div>
          )}
        </IonContent>
      </IonModal>

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
