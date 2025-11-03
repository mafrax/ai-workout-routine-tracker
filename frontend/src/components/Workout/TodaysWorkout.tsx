import React, { useState, useEffect, useRef } from 'react';
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
  IonButton,
  IonList,
  IonItem,
  IonLabel,
  IonIcon,
  IonSpinner,
  IonSegment,
  IonSegmentButton,
  IonChip,
} from '@ionic/react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination } from 'swiper/modules';
import type { Swiper as SwiperType } from 'swiper';
import 'swiper/css';
import 'swiper/css/pagination';
import { calendar, barbell, time, checkmarkCircleOutline, fitness, eyeOff, eye } from 'ionicons/icons';
import { Preferences } from '@capacitor/preferences';
import { useStore } from '../../store/useStore';
import { workoutPlanApi as localWorkoutPlanApi } from '../../services/api';
import { workoutPlanApi as backendWorkoutPlanApi } from '../../services/api_backend';
import { parseWorkoutPlan, type DailyWorkout } from '../../types/workout';
import WorkoutExecution from './WorkoutExecution';
import { aiService } from '../../services/aiService';
import './TodaysWorkout.css';

const TodaysWorkout: React.FC = () => {
  const { user, activeWorkoutPlan, setActiveWorkoutPlan } = useStore();
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [workoutInProgress, setWorkoutInProgress] = useState(false);
  const [hasCheckedGeneration, setHasCheckedGeneration] = useState(false);
  const [activeWorkoutPlans, setActiveWorkoutPlans] = useState<any[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [hideCompleted, setHideCompleted] = useState(true);
  const swiperRef = useRef<SwiperType | null>(null);

  const toggleHideCompleted = async () => {
    const newValue = !hideCompleted;
    setHideCompleted(newValue);
    await Preferences.set({
      key: 'hideCompletedWorkouts',
      value: JSON.stringify(newValue)
    });
  };

  // Load hideCompleted preference on mount
  useEffect(() => {
    const loadHideCompletedPreference = async () => {
      try {
        const { value } = await Preferences.get({ key: 'hideCompletedWorkouts' });
        if (value !== null) {
          setHideCompleted(JSON.parse(value));
        }
        // If no preference stored, default stays as true (hide completed)
      } catch (error) {
        console.log('Error loading hideCompleted preference:', error);
        // Keep default value of true
      }
    };
    loadHideCompletedPreference();
  }, []);

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

  // Reload active plans whenever the activeWorkoutPlan changes (e.g., updated via chat)
  useEffect(() => {
    if (user?.id && activeWorkoutPlan) {
      const refreshPlans = async () => {
        const allPlans = await backendWorkoutPlanApi.getUserPlans(user.id!);
        const activePlans = allPlans.filter(p => p.isActive && !p.isArchived);
        setActiveWorkoutPlans(activePlans);

        // Update the selected plan if it matches the activeWorkoutPlan
        if (selectedPlanId == activeWorkoutPlan.id) {
          const updatedPlan = activePlans.find(p => p.id == activeWorkoutPlan.id);
          if (updatedPlan) {
            // Force re-render by updating both states
            setActiveWorkoutPlans([...activePlans]);
          }
        }
      };
      refreshPlans();
    }
  }, [activeWorkoutPlan?.planDetails]);

  const loadActivePlan = async () => {
    if (!user?.id) return;

    try {
      // Load all plans from backend
      const allPlans = await backendWorkoutPlanApi.getUserPlans(user.id);
      const activePlans = allPlans.filter(p => p.isActive && !p.isArchived);

      setActiveWorkoutPlans(activePlans);

      // Set the first active plan as the default selected plan
      if (activePlans.length > 0) {
        const firstPlan = activePlans[0];
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

  const startWorkout = (dayNumber: number) => {
    setSelectedDay(dayNumber);
    setWorkoutInProgress(true);
  };

  const markWorkoutIncomplete = async (dayNumber: number) => {
    if (!currentPlan) return;

    try {
      console.log(`🔄 Marking day ${dayNumber} as incomplete for plan ${currentPlan.id}`);

      // Get current completed workouts
      const completedWorkouts = currentPlan.completedWorkouts || [];

      // Remove this day from completed workouts
      const updatedCompletedWorkouts = completedWorkouts.filter(day => day !== dayNumber);

      // Update the plan on backend
      const planIdNumber = typeof currentPlan.id === 'string' ? parseInt(currentPlan.id) : currentPlan.id;
      const updatedPlan = await backendWorkoutPlanApi.updatePlan(planIdNumber, {
        completedWorkouts: JSON.stringify(updatedCompletedWorkouts)
      });

      setActiveWorkoutPlan(updatedPlan);
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
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <div className="todays-workout-container">
          {activeWorkoutPlans.length > 1 ? (
            <div className="plan-carousel-container">
              <Swiper
                modules={[Pagination]}
                spaceBetween={16}
                slidesPerView={1}
                pagination={{ clickable: true }}
                onSwiper={(swiper) => {
                  swiperRef.current = swiper;
                }}
                onSlideChange={(swiper) => {
                  const plan = activeWorkoutPlans[swiper.activeIndex];
                  if (plan) {
                    handlePlanSelect(plan.id);
                  }
                }}
                initialSlide={activeWorkoutPlans.findIndex(p => p.id === selectedPlanId)}
                className="plan-swiper"
              >
                {activeWorkoutPlans.map((plan) => (
                  <SwiperSlide key={plan.id}>
                    <IonCard className="plan-info-card">
                      <IonCardHeader>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <IonCardTitle style={{ color: 'var(--text-primary)' }}>{plan.name}</IonCardTitle>
                          {plan.color && (
                            <div
                              style={{
                                width: '12px',
                                height: '12px',
                                borderRadius: '50%',
                                backgroundColor: plan.color,
                              }}
                            />
                          )}
                        </div>
                      </IonCardHeader>
                      <IonCardContent style={{ color: 'var(--text-secondary)' }}>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '12px' }}>{plan.description}</p>
                        <div className="plan-stats-row">
                          <div className="stat">
                            <IonIcon icon={calendar} />
                            <span>{plan.durationWeeks} weeks</span>
                          </div>
                          <div className="stat">
                            <IonIcon icon={barbell} />
                            <span>{plan.daysPerWeek} days/week</span>
                          </div>
                        </div>
                      </IonCardContent>
                    </IonCard>
                  </SwiperSlide>
                ))}
              </Swiper>
            </div>
          ) : (
            <IonCard className="plan-info-card">
              <IonCardHeader>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <IonCardTitle style={{ color: 'var(--text-primary)' }}>{currentPlan.name}</IonCardTitle>
                  {currentPlan.color && (
                    <div
                      style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        backgroundColor: currentPlan.color,
                      }}
                    />
                  )}
                </div>
              </IonCardHeader>
              <IonCardContent style={{ color: 'var(--text-secondary)' }}>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '12px' }}>{currentPlan.description}</p>
                <div className="plan-stats-row">
                  <div className="stat">
                    <IonIcon icon={calendar} />
                    <span>{currentPlan.durationWeeks} weeks</span>
                  </div>
                  <div className="stat">
                    <IonIcon icon={barbell} />
                    <span>{currentPlan.daysPerWeek} days/week</span>
                  </div>
                </div>
              </IonCardContent>
            </IonCard>
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
    </IonPage>
  );
};

export default TodaysWorkout;
