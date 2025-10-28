import { workoutSessionStorage } from './localStorage';

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

  const savedSession = await workoutSessionStorage.save(session);
  console.log('Workout session saved to local storage:', savedSession);
  return savedSession;
};

export const getUserSessions = async (userId: number) => {
  console.log('getUserSessions called for userId:', userId);
  const allSessions = await workoutSessionStorage.getAll();
  const userSessions = allSessions.filter(s => s.userId === userId);
  console.log('Found sessions:', userSessions.length);
  return userSessions;
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
