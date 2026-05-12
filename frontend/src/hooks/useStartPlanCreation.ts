import { useHistory } from 'react-router-dom';
import { useCurrentUser } from './useUserQuery';
import { isProfileComplete, REQUIRED_PROFILE_FIELDS } from '../store/useStore';

interface StartPlanResult {
  /** Call this from a button onClick. Routes to /chat if profile is complete, /profile otherwise. */
  startPlanCreation: () => void;
  /** True while we don't yet know the user's profile completeness. Buttons should be disabled. */
  isCheckingProfile: boolean;
  /** True when the user is allowed to start plan creation. */
  canCreatePlan: boolean;
  /** Fields that still need to be filled out, in order. Empty when canCreatePlan is true. */
  missingFields: typeof REQUIRED_PROFILE_FIELDS[number][];
}

/**
 * Centralised gate for "create a new workout plan". All three entry points
 * (Today's Workout header, the "No Active Plans" empty state, the Home
 * action card) should call this hook so the rule is enforced consistently.
 *
 * Profile completeness is the hard prerequisite — without age, weight,
 * height, fitness level, and at least one goal, the AI coach cannot tailor
 * a plan, so we redirect the user to /profile instead of letting them
 * waste a chat round-trip.
 */
export const useStartPlanCreation = (): StartPlanResult => {
  const history = useHistory();
  const { data: user, isLoading } = useCurrentUser();

  const canCreatePlan = isProfileComplete(user);

  const missingFields = canCreatePlan
    ? []
    : REQUIRED_PROFILE_FIELDS.filter((f) => {
        const value = (user as any)?.[f];
        if (f === 'goals') return !Array.isArray(value) || value.length === 0;
        if (f === 'fitnessLevel') return typeof value !== 'string' || value.length === 0;
        return typeof value !== 'number' || value <= 0;
      });

  return {
    isCheckingProfile: isLoading,
    canCreatePlan,
    missingFields,
    startPlanCreation: () => {
      if (canCreatePlan) {
        history.push('/chat');
      } else {
        // Profile incomplete — send the user to fill it out first.
        history.push({
          pathname: '/profile',
          search: `?reason=plan-prerequisites&missing=${missingFields.join(',')}`,
        });
      }
    },
  };
};
