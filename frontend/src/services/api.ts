import { User, WorkoutPlan, WorkoutSession, ProgressSummary } from '../types';
import { userStorage, workoutPlanStorage, workoutSessionStorage, chatStorage } from './localStorage';
import { aiService } from './aiService';

// Chat API - uses AI service directly
export const chatApi = {
  sendMessage: async (userId: number, message: string, sessionId?: string) => {
    const activePlan = await workoutPlanStorage.getActive();
    const recentSessions = await workoutSessionStorage.getRecent(3);
    const chatHistory = await chatStorage.getHistory();

    const response = await aiService.chat(message, {
      activePlan: activePlan || undefined,
      recentSessions,
      chatHistory,
    });

    // Save to chat history
    await chatStorage.saveMessage({ role: 'user', content: message });
    await chatStorage.saveMessage({ role: 'assistant', content: response });

    return {
      message: response,
      sessionId: sessionId || 'local-session',
    };
  },
};

// User API - uses local storage
export const userApi = {
  getAll: async () => {
    const user = await userStorage.get();
    return user ? [user] : [];
  },

  create: async (user: Partial<User>) => {
    const newUser: User = {
      id: Date.now(),
      ...user as User,
    };
    await userStorage.save(newUser);
    return newUser;
  },

  update: async (userId: number, updates: Partial<User>) => {
    const user = await userStorage.get();
    if (user) {
      const updated = { ...user, ...updates };
      await userStorage.save(updated);
      return updated;
    }
    throw new Error('User not found');
  },
};

// Workout Plan API - uses local storage + AI
export const workoutPlanApi = {
  getAll: async () => {
    return await workoutPlanStorage.getAll();
  },

  getUserPlans: async (userId: number) => {
    return await workoutPlanStorage.getAll();
  },

  getActivePlan: async (userId: number) => {
    const plan = await workoutPlanStorage.getActive();
    if (!plan) {
      throw new Error('No active plan found');
    }
    return plan;
  },

  create: async (plan: Partial<WorkoutPlan>) => {
    const newPlan: WorkoutPlan = {
      ...plan as WorkoutPlan,
      id: Date.now(),
      userId: plan.userId || Date.now(),
    };
    return await workoutPlanStorage.save(newPlan);
  },

  activate: async (planId: number) => {
    await workoutPlanStorage.setActive(planId);
    const plan = await workoutPlanStorage.getById(planId);
    if (!plan) {
      throw new Error('Plan not found');
    }
    return plan;
  },

  update: async (planId: number, updates: Partial<WorkoutPlan>) => {
    const updated = await workoutPlanStorage.update(planId, updates);
    if (!updated) {
      throw new Error('Plan not found');
    }
    return updated;
  },

  updatePlan: async (planId: number, updates: Partial<WorkoutPlan>) => {
    const updated = await workoutPlanStorage.update(planId, updates);
    if (!updated) {
      throw new Error('Plan not found');
    }
    return updated;
  },

  updateExerciseWeight: async (planId: number, exerciseName: string, newWeight: string) => {
    const plan = await workoutPlanStorage.getById(planId);
    if (!plan) {
      throw new Error('Plan not found');
    }

    // Update the weight in the plan details
    const regex = new RegExp(`(${exerciseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*-\\s*\\d+x[\\d-]+\\s*@\\s*)([^|]+)(\\s*\\|.*)`, 'gm');
    const updatedDetails = plan.planDetails.replace(regex, `$1${newWeight}$3`);

    return await workoutPlanStorage.update(planId, { planDetails: updatedDetails });
  },

  delete: async (planId: number) => {
    await workoutPlanStorage.delete(planId);
    return { success: true };
  },

  // Generate plans using AI
  generatePlans: async (userProfile: any): Promise<string[]> => {
    return await aiService.generateWorkoutPlans(userProfile);
  },
};

// Workout Session API - uses local storage
export const workoutSessionApi = {
  getAll: async () => {
    return await workoutSessionStorage.getAll();
  },

  getUserSessions: async (userId: number) => {
    return await workoutSessionStorage.getAll();
  },

  create: async (session: Partial<WorkoutSession>) => {
    const newSession: WorkoutSession = {
      id: Date.now(),
      ...session as WorkoutSession,
    };
    return await workoutSessionStorage.save(newSession);
  },

  getProgress: async (userId: number): Promise<ProgressSummary> => {
    const sessions = await workoutSessionStorage.getAll();

    return {
      totalSessions: sessions.length,
      totalMinutesTrained: sessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0),
      averageCompletionRate: sessions.length > 0
        ? sessions.reduce((sum, s) => sum + (s.completionRate || 0), 0) / sessions.length
        : 0,
      averageDifficultyRating: 0,
      trend: sessions.length > 5 ? 'improving' : 'stable',
    };
  },
};

// Helper function to calculate streak
function calculateStreak(sessions: WorkoutSession[]): number {
  if (sessions.length === 0) return 0;

  const sortedSessions = sessions
    .sort((a, b) => new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime());

  let streak = 0;
  let currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);

  for (const session of sortedSessions) {
    const sessionDate = new Date(session.sessionDate);
    sessionDate.setHours(0, 0, 0, 0);

    const diffDays = Math.floor((currentDate.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0 || diffDays === 1) {
      streak++;
      currentDate = sessionDate;
    } else {
      break;
    }
  }

  return streak;
}
