import { workoutSessionStorage } from './localStorage';
import { workoutSessionApi } from './api_backend';

export interface WorkoutSessionData {
  userId: number;
  workoutPlanId?: number;
  sessionDate: string;
  durationMinutes: number;
  exercises: string; // JSON string
  completionRate: number; // 0.0 to 1.0
  difficultyRating?: number; // 1-10 scale
  notes?: string;
}

export const saveWorkoutSession = async (sessionData: WorkoutSessionData) => {
  console.log('saveWorkoutSession called with:', sessionData);

  const session = {
    id: Date.now(),
    ...sessionData,
  };

  // Save to local storage first (immediate response)
  const savedSession = await workoutSessionStorage.save(session);
  console.log('Workout session saved to local storage:', savedSession);

  // Also save to backend (cloud sync)
  try {
    const backendSession = await workoutSessionApi.create({
      userId: sessionData.userId,
      workoutPlanId: sessionData.workoutPlanId,
      sessionDate: sessionData.sessionDate,
      durationMinutes: sessionData.durationMinutes,
      exercises: sessionData.exercises,
      completionRate: sessionData.completionRate,
      notes: sessionData.notes
    });
    console.log('Workout session synced to backend:', backendSession);
  } catch (error) {
    console.warn('Failed to sync workout session to backend:', error);
    // Continue with local storage - don't fail the operation
  }

  return savedSession;
};

export const getUserSessions = async (userId: number) => {
  console.log('getUserSessions called for userId:', userId);

  // Try to load from backend first
  try {
    const backendSessions = await workoutSessionApi.getUserSessions(userId);
    console.log('Loaded sessions from backend:', backendSessions.length);
    return backendSessions;
  } catch (error) {
    console.warn('Failed to load sessions from backend, using localStorage:', error);
    // Fallback to localStorage
    const allSessions = await workoutSessionStorage.getAll();
    const userSessions = allSessions.filter(s => s.userId === userId);
    console.log('Found sessions in localStorage:', userSessions.length);
    return userSessions;
  }
};

export const getUserProgress = async (userId: number) => {
  console.log('getUserProgress called for userId:', userId);
  const sessions = await getUserSessions(userId);

  // Calculate progress statistics
  const totalSessions = sessions.length;
  const totalMinutes = sessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
  const avgCompletionRate = sessions.length > 0
    ? sessions.reduce((sum, s) => sum + (s.completionRate || 0), 0) / sessions.length
    : 0;

  return {
    totalSessions,
    totalMinutes,
    avgCompletionRate,
    recentSessions: sessions.slice(0, 10),
  };
};

export const deleteWorkoutSession = async (sessionId: number) => {
  console.log('deleteWorkoutSession called for sessionId:', sessionId);
  await workoutSessionStorage.delete(sessionId);
  console.log('Workout session deleted from local storage');
};
