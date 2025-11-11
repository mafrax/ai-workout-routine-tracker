import React, { useState, useEffect, useRef } from 'react';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonButton,
  IonIcon,
  IonChip,
  IonLabel,
  IonModal,
  IonButtons,
  IonList,
  IonItem,
  IonInput,
  IonToast,
  IonBadge,
  IonSpinner,
} from '@ionic/react';
import {
  add,
  fitness,
  calendar,
  checkmarkCircle,
  close,
  archive,
  archiveOutline,
  play,
  pause,
  copy,
  send,
  time,
} from 'ionicons/icons';
import { useStore } from '../store/useStore';
import { userApi } from '../services/api';
import { workoutPlanApi as backendWorkoutPlanApi } from '../services/api_backend';
import type { WorkoutPlan } from '../types';
import { generateCustomWorkoutPlan } from '../services/workoutPlanService';
import PlanCreationChat from '../components/Plans/PlanCreationChat';
import { telegramService } from '../services/telegramService';
import { useWorkoutPlans, useUpdateWorkoutPlan, useCreateWorkoutPlan } from '../hooks/useWorkoutQueries';
import './Plans.css';

const PLAN_COLORS = [
  { name: 'Purple', value: '#667eea' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Green', value: '#10b981' },
  { name: 'Orange', value: '#f59e0b' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Indigo', value: '#6366f1' },
];

const Plans: React.FC = () => {
  const { user, activeWorkoutPlan, setActiveWorkoutPlan } = useStore();
  const { data: plans = [], isLoading } = useWorkoutPlans(user?.id);
  const updatePlanMutation = useUpdateWorkoutPlan();
  const createPlanMutation = useCreateWorkoutPlan();

  const [showColorModal, setShowColorModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<WorkoutPlan | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showChatMode, setShowChatMode] = useState(true);
  const [showPlanDetailsModal, setShowPlanDetailsModal] = useState(false);
  const [viewingPlan, setViewingPlan] = useState<WorkoutPlan | null>(null);
  const [currentPlanIndex, setCurrentPlanIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

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

    if (isLeftSwipe && currentPlanIndex < activePlans.length - 1) {
      setCurrentPlanIndex(currentPlanIndex + 1);
    }
    if (isRightSwipe && currentPlanIndex > 0) {
      setCurrentPlanIndex(currentPlanIndex - 1);
    }
  };

  const handleTogglePlanActive = async (plan: WorkoutPlan) => {
    if (!user?.id || !plan.id) return;

    try {
      const updatedPlan = await updatePlanMutation.mutateAsync({
        planId: plan.id,
        updates: { ...plan, isActive: !plan.isActive }
      });

      // If we're activating the first plan, set it as the active workout plan
      if (updatedPlan.isActive) {
        const activePlans = plans.filter((p: WorkoutPlan) => p.isActive || p.id == plan.id);
        if (activePlans.length === 1) {
          setActiveWorkoutPlan(updatedPlan);
        }
      }

      setToastMessage(updatedPlan.isActive ? 'Plan activated!' : 'Plan paused!');
      setShowToast(true);
    } catch (error) {
      console.error('Error toggling plan:', error);
      setToastMessage('Failed to update plan');
      setShowToast(true);
    }
  };

  const handleArchivePlan = async (plan: WorkoutPlan) => {
    if (!plan.id) return;

    try {
      await updatePlanMutation.mutateAsync({
        planId: plan.id,
        updates: { ...plan, isArchived: !plan.isArchived, isActive: false }
      });

      if (plan.isActive) {
        setActiveWorkoutPlan(null);
      }

      setToastMessage(plan.isArchived ? 'Plan restored!' : 'Plan archived!');
      setShowToast(true);
    } catch (error) {
      console.error('Error archiving plan:', error);
      setToastMessage('Failed to archive plan');
      setShowToast(true);
    }
  };

  const handleColorSelect = async (color: string) => {
    if (!selectedPlan?.id) return;

    try {
      await updatePlanMutation.mutateAsync({
        planId: selectedPlan.id,
        updates: { ...selectedPlan, color }
      });
      setShowColorModal(false);
      setSelectedPlan(null);
      setToastMessage('Color updated!');
      setShowToast(true);
    } catch (error) {
      console.error('Error updating color:', error);
      setToastMessage('Failed to update color');
      setShowToast(true);
    }
  };

  const handleViewPlanDetails = (plan: WorkoutPlan) => {
    setViewingPlan(plan);
    setShowPlanDetailsModal(true);
  };

  const handleCopyPlanDetails = async (plan: WorkoutPlan) => {
    try {
      const workouts = parseNextWorkouts(plan.planDetails || '', 100); // Get all workouts
      let textToCopy = `${plan.name}\n\n`;

      workouts.forEach((workout, idx) => {
        textToCopy += `${workout.day}\n\n`;
        workout.exercises.forEach((exercise) => {
          textToCopy += `${exercise}\n\n`;
        });
        textToCopy += '\n';
      });

      await navigator.clipboard.writeText(textToCopy);
      setToastMessage('Plan details copied to clipboard!');
      setShowToast(true);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      setToastMessage('Failed to copy to clipboard');
      setShowToast(true);
    }
  };

  const handleSendWorkoutPreview = async (plan: WorkoutPlan) => {
    try {
      await telegramService.loadConfig();
      if (!telegramService.isConfigured()) {
        setToastMessage('Please configure Telegram in Profile first');
        setShowToast(true);
        return;
      }

      setToastMessage('Sending workout details... 📤');
      setShowToast(true);

      // Get next workout details
      const workouts = parseNextWorkouts(plan.planDetails || '', 1);
      if (workouts.length === 0) {
        setToastMessage('No workout details found');
        setShowToast(true);
        return;
      }

      const nextWorkout = workouts[0];

      const success = await telegramService.sendWorkoutPreview(
        plan.name,
        nextWorkout.day,
        nextWorkout.exercises
      );

      if (success) {
        setToastMessage('Workout details sent to Telegram! ✅');
      } else {
        setToastMessage('Failed to send workout details');
      }
      setShowToast(true);
    } catch (error) {
      console.error('Error sending workout preview:', error);
      setToastMessage('Failed to send workout details');
      setShowToast(true);
    }
  };

  const handleUpdateTelegramHour = async (plan: WorkoutPlan, hour: number) => {
    if (!plan.id) return;

    try {
      await updatePlanMutation.mutateAsync({
        planId: plan.id,
        updates: { ...plan, telegramPreviewHour: hour }
      });

      setToastMessage(`Preview time set to ${hour}:00`);
      setShowToast(true);
    } catch (error) {
      console.error('Error updating telegram hour:', error);
      setToastMessage('Failed to update preview time');
      setShowToast(true);
    }
  };

  const fixPlanFormat = async (plan: WorkoutPlan) => {
    if (!plan.id || !plan.planDetails) return;

    try {
      // Convert old format to new format
      let fixed = plan.planDetails;

      // First normalize "Body Weight" to "bodyweight"
      fixed = fixed.replace(/Body\s+Weight/gi, 'bodyweight');

      // Pattern 1: "4 sets x 10 reps @ 60kg (90s rest)" -> "4x10 @ 60kg | 90s | 90s"
      fixed = fixed.replace(
        /(\d+)\s+sets?\s+x\s+([\d-]+)\s+reps?\s+@\s+([^\(]+?)\s*\((\d+)s?\s+rest\)/gi,
        '$1x$2 @ $3| $4s | 90s'
      );

      // Pattern 2: Handle format without parentheses but might have trailing text
      // "4 sets x 10 reps @ 60kg" or "2 sets x 10 reps @ bodyweight"
      fixed = fixed.replace(
        /(\d+)\s+sets?\s+x\s+([\d-]+)\s+reps?\s+@\s+(.+?)(?=\n|$)/gi,
        (match, sets, reps, weight) => {
          // Clean up weight - remove any trailing whitespace or text in parentheses
          const cleanWeight = weight.trim().replace(/\s*\([^)]*\).*$/,'').trim();
          return `${sets}x${reps} @ ${cleanWeight} | 60s | 90s`;
        }
      );

      console.log('Fixed plan details preview:', fixed.substring(0, 500));

      // Update the plan
      await updatePlanMutation.mutateAsync({
        planId: plan.id,
        updates: { ...plan, planDetails: fixed }
      });

      setShowPlanDetailsModal(false);
      setViewingPlan(null);
      setToastMessage('Plan format updated! Check Today\'s Workout page.');
      setShowToast(true);
    } catch (error) {
      console.error('Error fixing plan format:', error);
      setToastMessage('Failed to update plan format');
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

  const handleCreateNewPlan = async () => {
    if (!user) return;
    setShowChatMode(true);
    setShowCreateModal(true);
  };

  const handlePlanGenerated = async (planData: any) => {
    if (!user?.id) return;

    setIsGenerating(true);

    try {
      // Update user equipment if new equipment was mentioned
      if (planData.equipment && planData.equipment.length > 0) {
        const currentEquipment = user.availableEquipment || [];
        const newEquipment = planData.equipment.filter((eq: string) => !currentEquipment.includes(eq));

        if (newEquipment.length > 0) {
          const updatedEquipment = [...currentEquipment, ...newEquipment];
          await userApi.update(user.id, {
            ...user,
            availableEquipment: updatedEquipment
          });
        }
      }

      // Generate the custom workout plan
      const customPlan = await generateCustomWorkoutPlan(
        user,
        planData.name,
        planData.description,
        planData.focus,
        planData.equipment || user.availableEquipment || [],
        planData.days || 3,
        planData.duration || 8
      );

      // Save the plan
      await createPlanMutation.mutateAsync({
        userId: user.id,
        name: customPlan.name,
        description: customPlan.description,
        durationWeeks: customPlan.durationWeeks,
        daysPerWeek: customPlan.daysPerWeek,
        planDetails: customPlan.planDetails,
        difficultyLevel: user.fitnessLevel || 'intermediate',
        isActive: false,
        color: PLAN_COLORS[plans.length % PLAN_COLORS.length].value,
      });

      setShowCreateModal(false);
      setShowChatMode(true);
      setToastMessage(`${planData.name} created successfully!`);
      setShowToast(true);
    } catch (error) {
      console.error('Error creating custom plan:', error);
      setToastMessage('Failed to create workout plan');
      setShowToast(true);
    } finally {
      setIsGenerating(false);
    }
  };

  const activePlans = plans.filter((p: WorkoutPlan) => !p.isArchived);
  const archivedPlans = plans.filter((p: WorkoutPlan) => p.isArchived);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>My Workout Plans</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={handleCreateNewPlan}>
              <IonIcon icon={add} slot="start" />
              New Plan
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <div className="plans-container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 className="section-title" style={{ margin: 0 }}>Active Plans</h2>
          </div>

          {activePlans.length === 0 ? (
            <IonCard>
              <IonCardContent>
                <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                  No active workout plans. Create one from the Profile page!
                </p>
              </IonCardContent>
            </IonCard>
          ) : (
            <>
              {/* Desktop view - show all cards */}
              <div className="plans-desktop">
                {activePlans.map((plan: WorkoutPlan) => (
                  <IonCard
                    key={plan.id}
                    className="plan-card"
                    style={{ borderLeft: `6px solid ${plan.color || '#667eea'}`, cursor: 'pointer' }}
                    onClick={() => handleViewPlanDetails(plan)}
                  >
                    <IonCardHeader>
                      <div className="plan-header">
                        <IonCardTitle style={{ color: 'var(--text-primary)' }}>{plan.name}</IonCardTitle>
                        {plan.isActive && (
                          <IonChip color="success">
                            <IonIcon icon={checkmarkCircle} />
                            <IonLabel>Active</IonLabel>
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
                          fill="outline"
                          onClick={() => {
                            setSelectedPlan(plan);
                            setShowColorModal(true);
                          }}
                        >
                          Change Color
                        </IonButton>

                        <IonButton
                          size="small"
                          fill={plan.isActive ? "outline" : "solid"}
                          color={plan.isActive ? "medium" : "primary"}
                          onClick={() => handleTogglePlanActive(plan)}
                        >
                          <IonIcon icon={plan.isActive ? pause : play} slot="start" />
                          {plan.isActive ? 'Pause' : 'Activate'}
                        </IonButton>

                        <IonButton
                          size="small"
                          fill="outline"
                          color="warning"
                          onClick={() => handleArchivePlan(plan)}
                        >
                          <IonIcon icon={archive} slot="start" />
                          Archive
                        </IonButton>
                      </div>
                    </IonCardContent>
                  </IonCard>
                ))}
              </div>

              {/* Mobile carousel view */}
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
                      transform: `translateX(-${currentPlanIndex * 100}%)`,
                      width: `${activePlans.length * 100}%`
                    }}
                  >
                    {activePlans.map((plan: WorkoutPlan) => (
                      <div key={plan.id} className="carousel-slide">
                        <IonCard
                          className="plan-card"
                          style={{ borderLeft: `6px solid ${plan.color || '#667eea'}`, cursor: 'pointer', margin: '0 8px' }}
                          onClick={() => handleViewPlanDetails(plan)}
                        >
                          <IonCardHeader>
                            <div className="plan-header">
                              <IonCardTitle style={{ color: 'var(--text-primary)' }}>{plan.name}</IonCardTitle>
                              {plan.isActive && (
                                <IonChip color="success">
                                  <IonIcon icon={checkmarkCircle} />
                                  <IonLabel>Active</IonLabel>
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
                                fill="outline"
                                onClick={() => {
                                  setSelectedPlan(plan);
                                  setShowColorModal(true);
                                }}
                              >
                                Change Color
                              </IonButton>

                              <IonButton
                                size="small"
                                fill={plan.isActive ? "outline" : "solid"}
                                color={plan.isActive ? "medium" : "primary"}
                                onClick={() => handleTogglePlanActive(plan)}
                              >
                                <IonIcon icon={plan.isActive ? pause : play} slot="start" />
                                {plan.isActive ? 'Pause' : 'Activate'}
                              </IonButton>

                              <IonButton
                                size="small"
                                fill="outline"
                                color="warning"
                                onClick={() => handleArchivePlan(plan)}
                              >
                                <IonIcon icon={archive} slot="start" />
                                Archive
                              </IonButton>
                            </div>
                          </IonCardContent>
                        </IonCard>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Carousel indicators and navigation */}
                {activePlans.length > 1 && (
                  <>
                    <div className="carousel-indicators">
                      {activePlans.map((_: WorkoutPlan, index: number) => (
                        <div
                          key={index}
                          className={`indicator ${index === currentPlanIndex ? 'active' : ''}`}
                          onClick={() => setCurrentPlanIndex(index)}
                        />
                      ))}
                    </div>
                    <div className="carousel-counter">
                      {currentPlanIndex + 1} of {activePlans.length}
                    </div>
                  </>
                )}
              </div>
            </>
          )}

          {archivedPlans.length > 0 && (
            <>
              <h2 className="section-title" style={{ marginTop: '32px' }}>Archived Plans</h2>
              {archivedPlans.map((plan: WorkoutPlan) => (
                <IonCard
                  key={plan.id}
                  className="plan-card archived"
                  style={{ borderLeft: `6px solid ${plan.color || '#667eea'}`, opacity: 0.7 }}
                >
                  <IonCardHeader>
                    <IonCardTitle style={{ color: 'var(--text-primary)' }}>{plan.name}</IonCardTitle>
                  </IonCardHeader>

                  <IonCardContent>
                    <p className="plan-description" style={{ color: 'var(--text-secondary)' }}>{plan.description}</p>

                    <div className="plan-actions">
                      <IonButton
                        size="small"
                        fill="outline"
                        onClick={() => handleArchivePlan(plan)}
                      >
                        <IonIcon icon={archiveOutline} slot="start" />
                        Restore
                      </IonButton>
                    </div>
                  </IonCardContent>
                </IonCard>
              ))}
            </>
          )}
        </div>

        <IonModal
          isOpen={showColorModal}
          onDidDismiss={() => {
            setShowColorModal(false);
            setSelectedPlan(null);
          }}
        >
          <IonHeader>
            <IonToolbar>
              <IonTitle>Choose Plan Color</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setShowColorModal(false)}>
                  <IonIcon icon={close} />
                </IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>

          <IonContent>
            <div style={{ padding: '20px' }}>
              <p style={{ marginBottom: '20px', color: 'var(--text-muted)' }}>
                Select a color for "{selectedPlan?.name}"
              </p>

              <div className="color-grid">
                {PLAN_COLORS.map(color => (
                  <div
                    key={color.value}
                    className="color-option"
                    style={{
                      backgroundColor: color.value,
                      border: selectedPlan?.color === color.value ? '4px solid #000' : 'none',
                    }}
                    onClick={() => handleColorSelect(color.value)}
                  >
                    <span style={{ color: '#fff', fontWeight: 'bold', textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
                      {color.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </IonContent>
        </IonModal>

        <IonModal
          isOpen={showCreateModal}
          onDidDismiss={() => {
            setShowCreateModal(false);
          }}
        >
          <IonHeader>
            <IonToolbar>
              <IonTitle>Create New Workout Plan</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setShowCreateModal(false)}>
                  <IonIcon icon={close} />
                </IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          {isGenerating ? (
            <IonContent>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', height: '100%' }}>
                <IonSpinner name="crescent" style={{ width: '50px', height: '50px', marginBottom: '20px' }} />
                <p style={{ color: 'var(--brand-primary)', fontSize: '16px', textAlign: 'center' }}>
                  Creating your personalized workout plan...
                </p>
              </div>
            </IonContent>
          ) : showChatMode && user ? (
            <IonContent>
              <PlanCreationChat
                user={user}
                onPlanGenerated={handlePlanGenerated}
                onCancel={() => {
                  setShowCreateModal(false);
                  setShowChatMode(true);
                }}
              />
            </IonContent>
          ) : null}
        </IonModal>

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

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ margin: 0, color: 'var(--brand-primary)' }}>Next 4 Workouts</h3>
                    {(() => {
                      const workouts = parseNextWorkouts(viewingPlan.planDetails || '');
                      const hasNoExercises = workouts.length === 0 || workouts.every(w => w.exercises.length === 0);
                      return hasNoExercises && (
                        <IonButton
                          size="small"
                          color="warning"
                          onClick={() => fixPlanFormat(viewingPlan)}
                        >
                          Fix Format
                        </IonButton>
                      );
                    })()}
                  </div>
                  {(() => {
                    const workouts = parseNextWorkouts(viewingPlan.planDetails || '');
                    const hasNoExercises = workouts.length === 0 || workouts.every(w => w.exercises.length === 0);
                    return hasNoExercises ? (
                      <IonCard>
                        <IonCardContent>
                          <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>
                            No exercises found. This plan may be in an old format.
                            Click "Fix Format" above to update it.
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
      </IonContent>
    </IonPage>
  );
};

export default Plans;
