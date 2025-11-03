import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUserSessions, deleteWorkoutSession } from '../services/workoutSessionService';
import { workoutPlanApi as backendWorkoutPlanApi } from '../services/api_backend';
import type { WorkoutPlan } from '../types';

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

// Query keys for consistent cache management
export const workoutKeys = {
  all: ['workouts'] as const,
  sessions: (userId: number) => [...workoutKeys.all, 'sessions', userId] as const,
  plans: (userId: number) => [...workoutKeys.all, 'plans', userId] as const,
};

/**
 * Hook to fetch and cache workout sessions for a user
 */
export const useWorkoutSessions = (userId: number | undefined) => {
  return useQuery({
    queryKey: workoutKeys.sessions(userId!),
    queryFn: async () => {
      if (!userId) throw new Error('User ID is required');

      // Backend API already returns workout plan details with each session
      const data = await getUserSessions(userId);
      return data as WorkoutSession[];
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes - sessions change less frequently
  });
};

/**
 * Hook to delete a workout session with automatic cache invalidation
 */
export const useDeleteWorkoutSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionId: number) => deleteWorkoutSession(sessionId),
    onSuccess: (_, sessionId) => {
      // Invalidate all session queries to trigger a refetch
      queryClient.invalidateQueries({ queryKey: workoutKeys.all });
    },
  });
};

/**
 * Hook to fetch and cache workout plans for a user
 */
export const useWorkoutPlans = (userId: number | undefined) => {
  return useQuery({
    queryKey: workoutKeys.plans(userId!),
    queryFn: async () => {
      if (!userId) throw new Error('User ID is required');

      // Check for mock data first
      const mockPlansData = localStorage.getItem('mock_workout_plans');
      if (mockPlansData) {
        try {
          const mockPlans = JSON.parse(mockPlansData);
          console.log('🎭 Using mock workout plans:', mockPlans.length);
          return mockPlans.filter((p: any) => p.userId === userId);
        } catch (error) {
          console.error('Failed to parse mock workout plans:', error);
        }
      }

      try {
        const allPlans = await backendWorkoutPlanApi.getUserPlans(userId);
        return allPlans;
      } catch (error) {
        console.error('❌ Error loading plans from backend:', error);
        throw error;
      }
    },
    enabled: !!userId,
    staleTime: 3 * 60 * 1000, // 3 minutes - plans change even less frequently
  });
};

/**
 * Hook to update a workout plan with automatic cache update
 */
export const useUpdateWorkoutPlan = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ planId, updates }: { planId: number; updates: Partial<WorkoutPlan> }) =>
      backendWorkoutPlanApi.updatePlan(planId, updates as WorkoutPlan),
    onSuccess: (updatedPlan) => {
      // Update the cache directly without refetching
      queryClient.setQueryData(
        workoutKeys.plans(updatedPlan.userId),
        (oldPlans: WorkoutPlan[] | undefined) => {
          if (!oldPlans) return [updatedPlan];
          return oldPlans.map(plan =>
            plan.id === updatedPlan.id ? updatedPlan : plan
          );
        }
      );
    },
  });
};

/**
 * Hook to create a new workout plan with automatic cache invalidation
 */
export const useCreateWorkoutPlan = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (newPlan: Partial<WorkoutPlan>) =>
      backendWorkoutPlanApi.create(newPlan as WorkoutPlan),
    onSuccess: (newPlan) => {
      // Invalidate plans query to refetch with new plan
      queryClient.invalidateQueries({
        queryKey: workoutKeys.plans(newPlan.userId)
      });
    },
  });
};
