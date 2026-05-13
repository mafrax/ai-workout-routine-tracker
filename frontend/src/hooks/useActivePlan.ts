import { useQuery, useQueryClient } from '@tanstack/react-query';
import { workoutPlanApi } from '../services/api_backend';
import { useStore } from '../store/useStore';
import { workoutKeys } from './useWorkoutQueries';
import type { WorkoutPlan } from '../types';

/**
 * The user's currently-active workout plan (or null if none).
 *
 * Replaces the legacy Zustand `activeWorkoutPlan` slice — we now read
 * straight from the workout-plans react-query cache and derive the
 * active one server-side semantics (`isActive === true`).
 *
 * Cache key: `workoutKeys.plans(userId)` — already used by `useWorkoutPlans`,
 * so this hook hits the same data without an extra round-trip.
 *
 * Mutations that change which plan is active (activate, pause, archive,
 * regenerate) should invalidate the same key via `invalidateActivePlan()`
 * below, or push an optimistic update via `setActivePlan(plan)`.
 */
export const useActivePlan = () => {
  const storeUser = useStore((s) => s.user);
  const authReady = useStore((s) => s.authReady);
  const query = useQuery({
    queryKey: storeUser?.id ? workoutKeys.plans(storeUser.id) : ['workouts', 'plans', 'pending'],
    queryFn: async () => {
      if (!storeUser?.id) throw new Error('No user id');
      return await workoutPlanApi.getUserPlans(storeUser.id);
    },
    enabled: authReady && !!storeUser?.id,
    staleTime: 3 * 60 * 1000,
  });

  const activePlan = query.data?.find((p) => p.isActive) ?? null;
  return { ...query, data: activePlan };
};

/**
 * Helper for code that needs to update the active plan after a mutation.
 * Push the new plan object into the plans cache so all readers see the
 * change immediately — no extra GET round-trip needed.
 */
export const useUpdateActivePlan = () => {
  const queryClient = useQueryClient();
  const storeUser = useStore((s) => s.user);

  const setActivePlan = (plan: WorkoutPlan | null) => {
    if (!storeUser?.id) return;
    queryClient.setQueryData<WorkoutPlan[]>(workoutKeys.plans(storeUser.id), (old) => {
      if (!old) return plan ? [plan] : [];
      if (!plan) return old.filter((p) => !p.isActive);
      // Replace existing plan with same id, otherwise append.
      const idx = old.findIndex((p) => p.id === plan.id);
      if (idx === -1) return [...old, plan];
      const next = [...old];
      next[idx] = plan;
      return next;
    });
  };

  const invalidateActivePlan = () => {
    if (!storeUser?.id) return;
    queryClient.invalidateQueries({ queryKey: workoutKeys.plans(storeUser.id) });
  };

  return { setActivePlan, invalidateActivePlan };
};
