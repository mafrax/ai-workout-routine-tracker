import { Preferences } from '@capacitor/preferences';
import { User, WorkoutPlan, WorkoutSession } from '../types';

// Storage keys
const KEYS = {
  USER: 'user',
  WORKOUT_PLANS: 'workoutPlans',
  WORKOUT_SESSIONS: 'workoutSessions',
  CHAT_HISTORY: 'chatHistory',
  ACTIVE_PLAN_ID: 'activePlanId',
};

// Clear all data
export const clearAllData = async (): Promise<void> => {
  await Preferences.remove({ key: KEYS.USER });
  await Preferences.remove({ key: KEYS.WORKOUT_PLANS });
  await Preferences.remove({ key: KEYS.WORKOUT_SESSIONS });
  await Preferences.remove({ key: KEYS.CHAT_HISTORY });
  await Preferences.remove({ key: KEYS.ACTIVE_PLAN_ID });
  console.log('All data cleared from storage');
};

// User operations
export const userStorage = {
  async get(): Promise<User | null> {
    const { value } = await Preferences.get({ key: KEYS.USER });
    return value ? JSON.parse(value) : null;
  },

  async save(user: User): Promise<void> {
    await Preferences.set({
      key: KEYS.USER,
      value: JSON.stringify(user),
    });
  },

  async clear(): Promise<void> {
    await Preferences.remove({ key: KEYS.USER });
  },
};

// Workout Plans operations
export const workoutPlanStorage = {
  async getAll(): Promise<WorkoutPlan[]> {
    const { value } = await Preferences.get({ key: KEYS.WORKOUT_PLANS });
    return value ? JSON.parse(value) : [];
  },

  async save(plan: WorkoutPlan): Promise<WorkoutPlan> {
    const plans = await this.getAll();
    const existingIndex = plans.findIndex(p => p.id === plan.id);

    if (existingIndex >= 0) {
      plans[existingIndex] = plan;
    } else {
      // Generate new ID if not exists
      plan.id = Date.now();
      plans.push(plan);
    }

    await Preferences.set({
      key: KEYS.WORKOUT_PLANS,
      value: JSON.stringify(plans),
    });

    return plan;
  },

  async getById(id: number): Promise<WorkoutPlan | null> {
    const plans = await this.getAll();
    // Handle both string and number IDs
    return plans.find(p => {
      const pId = typeof p.id === 'string' ? parseInt(p.id as string) : p.id;
      return pId === id;
    }) || null;
  },

  async getActive(): Promise<WorkoutPlan | null> {
    const { value } = await Preferences.get({ key: KEYS.ACTIVE_PLAN_ID });
    if (!value) return null;

    const activePlanId = parseInt(value);
    return await this.getById(activePlanId);
  },

  async setActive(planId: number): Promise<void> {
    // Set all plans to inactive
    const plans = await this.getAll();
    plans.forEach(p => p.isActive = false);

    // Set the specified plan to active
    const plan = plans.find(p => p.id === planId);
    if (plan) {
      plan.isActive = true;
      await Preferences.set({
        key: KEYS.WORKOUT_PLANS,
        value: JSON.stringify(plans),
      });
      await Preferences.set({
        key: KEYS.ACTIVE_PLAN_ID,
        value: planId.toString(),
      });
    }
  },

  async update(planId: number, updates: Partial<WorkoutPlan>): Promise<WorkoutPlan | null> {
    const plans = await this.getAll();
    // Handle both string and number IDs
    const plan = plans.find(p => {
      const pId = typeof p.id === 'string' ? parseInt(p.id as string) : p.id;
      return pId === planId;
    });

    if (plan) {
      Object.assign(plan, updates);
      await Preferences.set({
        key: KEYS.WORKOUT_PLANS,
        value: JSON.stringify(plans),
      });
      return plan;
    }

    console.error('Plan not found in localStorage. PlanId:', planId, 'Available plans:', plans.map(p => ({ id: p.id, type: typeof p.id })));
    return null;
  },

  async delete(planId: number): Promise<void> {
    const plans = await this.getAll();
    const filtered = plans.filter(p => p.id !== planId);
    await Preferences.set({
      key: KEYS.WORKOUT_PLANS,
      value: JSON.stringify(filtered),
    });
  },
};

// Workout Sessions operations
export const workoutSessionStorage = {
  async getAll(): Promise<WorkoutSession[]> {
    const { value } = await Preferences.get({ key: KEYS.WORKOUT_SESSIONS });
    return value ? JSON.parse(value) : [];
  },

  async save(session: WorkoutSession): Promise<WorkoutSession> {
    const sessions = await this.getAll();

    if (!session.id) {
      session.id = Date.now();
    }

    const existingIndex = sessions.findIndex(s => s.id === session.id);
    if (existingIndex >= 0) {
      sessions[existingIndex] = session;
    } else {
      sessions.push(session);
    }

    await Preferences.set({
      key: KEYS.WORKOUT_SESSIONS,
      value: JSON.stringify(sessions),
    });

    return session;
  },

  async getRecent(limit: number = 10): Promise<WorkoutSession[]> {
    const sessions = await this.getAll();
    return sessions
      .sort((a, b) => new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime())
      .slice(0, limit);
  },

  async delete(sessionId: number): Promise<void> {
    const sessions = await this.getAll();
    const filtered = sessions.filter(s => s.id !== sessionId);
    await Preferences.set({
      key: KEYS.WORKOUT_SESSIONS,
      value: JSON.stringify(filtered),
    });
  },

  async clear(): Promise<void> {
    await Preferences.remove({ key: KEYS.WORKOUT_SESSIONS });
  },
};

// Chat History operations
export const chatStorage = {
  async getHistory(): Promise<any[]> {
    const { value } = await Preferences.get({ key: KEYS.CHAT_HISTORY });
    return value ? JSON.parse(value) : [];
  },

  async saveMessage(message: any): Promise<void> {
    const history = await this.getHistory();
    history.push(message);
    await Preferences.set({
      key: KEYS.CHAT_HISTORY,
      value: JSON.stringify(history),
    });
  },

  async clear(): Promise<void> {
    await Preferences.remove({ key: KEYS.CHAT_HISTORY });
  },
};

// Clear all data (for testing/reset)
export const clearAllStorage = async (): Promise<void> => {
  await Preferences.clear();
};
