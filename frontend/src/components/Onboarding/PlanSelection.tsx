import React, { useState } from 'react';
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
  IonSpinner,
  IonBadge,
  IonIcon,
} from '@ionic/react';
import { checkmarkCircle, calendar, fitness, barbell } from 'ionicons/icons';
import type { GeneratedPlan } from '../../services/workoutPlanService';
import { saveWorkoutPlan } from '../../services/workoutPlanService';
import { workoutPlanApi } from '../../services/api';
import { useStore } from '../../store/useStore';
import './PlanSelection.css';

interface PlanSelectionProps {
  plans: GeneratedPlan[];
  userId: number;
  onComplete: () => void;
}

const PlanSelection: React.FC<PlanSelectionProps> = ({ plans, userId, onComplete }) => {
  const setActiveWorkoutPlan = useStore((state) => state.setActiveWorkoutPlan);
  const [selectedPlan, setSelectedPlan] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSelectPlan = async () => {
    if (selectedPlan === null) return;

    setSaving(true);
    try {
      const plan = plans[selectedPlan];

      // Save the plan to the database
      const savedPlan = await saveWorkoutPlan(userId, plan);

      // Activate this plan
      const activatedPlan = await workoutPlanApi.activate(savedPlan.id!);

      // Set in store
      setActiveWorkoutPlan(activatedPlan);

      onComplete();
    } catch (error) {
      console.error('Error saving plan:', error);
      alert('Error saving your workout plan. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'beginner':
        return 'success';
      case 'intermediate':
        return 'warning';
      case 'advanced':
        return 'danger';
      default:
        return 'medium';
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Choose Your Workout Plan</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <div className="plan-selection-container">
          <div className="intro-section">
            <h2>Your Personalized Plans Are Ready! 🎉</h2>
            <p>
              Based on your profile, our AI coach has created 3 customized workout plans.
              Review each option and select the one that best fits your goals and schedule.
            </p>
          </div>

          <div className="plans-grid">
            {plans.map((plan, index) => (
              <IonCard
                key={index}
                className={`plan-card ${selectedPlan === index ? 'selected' : ''}`}
                onClick={() => setSelectedPlan(index)}
                button
              >
                {selectedPlan === index && (
                  <div className="selected-badge">
                    <IonIcon icon={checkmarkCircle} />
                    Selected
                  </div>
                )}

                <IonCardHeader>
                  <div className="plan-header">
                    <IonCardTitle>{plan.name}</IonCardTitle>
                    <IonBadge color={getDifficultyColor(plan.difficultyLevel)}>
                      {plan.difficultyLevel}
                    </IonBadge>
                  </div>
                </IonCardHeader>

                <IonCardContent>
                  <p className="plan-description">{plan.description}</p>

                  <div className="plan-stats">
                    <div className="stat-item">
                      <IonIcon icon={calendar} />
                      <span>{plan.durationWeeks} weeks</span>
                    </div>
                    <div className="stat-item">
                      <IonIcon icon={fitness} />
                      <span>{plan.daysPerWeek} days/week</span>
                    </div>
                  </div>

                  <div className="plan-details">
                    <h3><IonIcon icon={barbell} /> Week 1 - Full Schedule</h3>
                    <div className="plan-details-content">
                      {plan.planDetails.split('\n').map((line, i) => {
                        const isDayHeader = line.match(/^Day \d+/i);
                        return (
                          <p key={i} className={isDayHeader ? 'day-header' : ''}>
                            {line}
                          </p>
                        );
                      })}
                    </div>
                  </div>
                </IonCardContent>
              </IonCard>
            ))}
          </div>

          <div className="action-section">
            {selectedPlan !== null ? (
              <div className="selected-info">
                <IonIcon icon={checkmarkCircle} color="success" />
                <span>You selected: <strong>{plans[selectedPlan].name}</strong></span>
              </div>
            ) : (
              <p className="select-prompt">👆 Select a plan above to continue</p>
            )}

            <IonButton
              expand="block"
              size="large"
              onClick={handleSelectPlan}
              disabled={selectedPlan === null || saving}
              className="confirm-button"
            >
              {saving ? (
                <>
                  <IonSpinner name="crescent" /> Saving...
                </>
              ) : (
                'Start This Plan'
              )}
            </IonButton>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default PlanSelection;
