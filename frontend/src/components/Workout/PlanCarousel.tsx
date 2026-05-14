import React, { useEffect, useRef, useState } from 'react';
import {
  IonBadge,
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonChip,
  IonIcon,
  IonLabel,
} from '@ionic/react';
import { archive, calendar, checkmarkCircle, fitness, pause } from 'ionicons/icons';

interface Plan {
  id: number | string;
  name: string;
  description?: string;
  daysPerWeek?: number;
  durationWeeks?: number;
  isActive?: boolean;
  isArchived?: boolean;
  color?: string;
  completedWorkouts?: number[];
}

interface Props {
  plans: Plan[];
  selectedPlanId: number | string | null;
  onSelectPlan: (planId: number | string) => void;
  onViewDetails: (plan: Plan) => void;
  onToggleActive: (plan: Plan) => void;
  onArchive: (plan: Plan) => void;
}

/**
 * Horizontal swipeable carousel of the user's workout plans. Owns its
 * own touch / current-index state since these are pure UI concerns; the
 * parent only sees a `selectedPlanId` change when the user taps a card
 * or an indicator.
 *
 * The action buttons (View Details / Pause / Archive) call back into
 * the parent so business logic stays out of this presentational chunk.
 */
const PlanCarousel: React.FC<Props> = ({
  plans,
  selectedPlanId,
  onSelectPlan,
  onViewDetails,
  onToggleActive,
  onArchive,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  // Keep the carousel pointed at the externally-selected plan (e.g. after
  // the user activates a paused plan via View Details).
  useEffect(() => {
    if (selectedPlanId == null) return;
    const idx = plans.findIndex((p) => p.id === selectedPlanId);
    if (idx !== -1 && idx !== currentIndex) setCurrentIndex(idx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlanId, plans]);

  const onTouchStart = (e: React.TouchEvent) => {
    touchEndX.current = null;
    touchStartX.current = e.targetTouches[0]?.clientX ?? null;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0]?.clientX ?? null;
  };
  const onTouchEnd = () => {
    if (touchStartX.current == null || touchEndX.current == null) return;
    const distance = touchStartX.current - touchEndX.current;
    const isLeft = distance > 50;
    const isRight = distance < -50;
    if (isLeft && currentIndex < plans.length - 1) {
      const next = currentIndex + 1;
      setCurrentIndex(next);
      const plan = plans[next];
      if (plan) onSelectPlan(plan.id);
    } else if (isRight && currentIndex > 0) {
      const next = currentIndex - 1;
      setCurrentIndex(next);
      const plan = plans[next];
      if (plan) onSelectPlan(plan.id);
    }
  };

  if (plans.length === 0) return null;

  return (
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
            transform: `translateX(-${currentIndex * (100 / plans.length)}%)`,
            width: `${plans.length * 100}%`,
          }}
        >
          {plans.map((plan) => (
            <div key={plan.id} className="carousel-slide" style={{ width: `${100 / plans.length}%` }}>
              <IonCard
                className={`plan-card ${plan.isArchived ? 'archived' : ''}`}
                style={{
                  borderLeft: `6px solid ${plan.color || '#667eea'}`,
                  cursor: 'pointer',
                  margin: '0 8px',
                  opacity: plan.isArchived ? 0.7 : 1,
                }}
                onClick={() => onSelectPlan(plan.id)}
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
                  <p className="plan-description" style={{ color: 'var(--text-secondary)' }}>
                    {plan.description}
                  </p>

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
                    <IonBadge color="primary">{plan.completedWorkouts?.length || 0} workouts completed</IonBadge>
                  </div>

                  <div className="plan-actions" onClick={(e) => e.stopPropagation()}>
                    <IonButton size="small" fill="solid" onClick={() => onViewDetails(plan)}>
                      View Details
                    </IonButton>

                    <IonButton
                      size="small"
                      fill={plan.isActive ? 'outline' : 'solid'}
                      color={plan.isActive ? 'medium' : 'primary'}
                      onClick={() => onToggleActive(plan)}
                    >
                      <IonIcon icon={plan.isActive ? pause : checkmarkCircle} slot="start" />
                      {plan.isActive ? 'Pause' : 'Activate'}
                    </IonButton>

                    {!plan.isArchived && (
                      <IonButton size="small" fill="outline" color="warning" onClick={() => onArchive(plan)}>
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

      {plans.length > 1 && (
        <>
          <div className="carousel-indicators">
            {plans.map((_, index) => (
              <div
                key={index}
                className={`indicator ${index === currentIndex ? 'active' : ''}`}
                onClick={() => {
                  setCurrentIndex(index);
                  const plan = plans[index];
                  if (plan) onSelectPlan(plan.id);
                }}
              />
            ))}
          </div>
          <div className="carousel-counter">
            {currentIndex + 1} of {plans.length}
          </div>
        </>
      )}
    </div>
  );
};

export default PlanCarousel;
