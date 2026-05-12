import { useQuery } from '@tanstack/react-query';
import { userApi } from '../services/api_backend';
import { useStore } from '../store/useStore';

/**
 * Cache key for the current user's full backend profile.
 * Keep it small and stable; the userId is what matters.
 */
export const userKeys = {
  all: ['user'] as const,
  byId: (id: number) => [...userKeys.all, id] as const,
};

/**
 * Fetches the FULL user record (age, weight, height, fitnessLevel, goals,
 * availableEquipment, ...) from the backend, gated on the auth bootstrap
 * having completed AND a user being present in the store. This is the
 * single source of truth for "do we know who this person is yet?".
 *
 * Pages that need profile data should call this hook directly rather than
 * firing their own fetch effects — that keeps the cache shared and avoids
 * the race where one screen has stale data while another is still loading.
 */
export const useCurrentUser = () => {
  const authReady = useStore((s) => s.authReady);
  const storeUser = useStore((s) => s.user);

  return useQuery({
    queryKey: storeUser?.id ? userKeys.byId(storeUser.id) : userKeys.all,
    queryFn: async () => {
      if (!storeUser?.id) throw new Error('No user id');
      return await userApi.getById(storeUser.id);
    },
    enabled: authReady && !!storeUser?.id,
    staleTime: 60 * 1000, // 1 minute — profile rarely changes mid-session
  });
};
