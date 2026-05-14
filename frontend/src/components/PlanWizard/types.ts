import type { BodyweightExercise } from '../../types';

/**
 * Draft state assembled by the wizard. Mirrors the backend's
 * generatePlanSchema 1:1 so the final POST body is just a typed
 * subset of this object.
 */
export interface PlanDraft {
  name: string;
  focus: 'strength' | 'hypertrophy' | 'endurance' | 'mobility' | 'weight-loss' | '';
  daysPerWeek: number;
  durationWeeks: number;
  equipment: string[];
  bodyweight: BodyweightExercise[];
  injuries: string;
  sessionMinutes?: number;
  intensity: 'easy' | 'moderate' | 'hard';
}

export const EMPTY_DRAFT: PlanDraft = {
  name: '',
  focus: '',
  daysPerWeek: 3,
  durationWeeks: 8,
  equipment: [],
  bodyweight: [],
  injuries: '',
  sessionMinutes: undefined,
  intensity: 'moderate',
};

export const FOCUS_LABELS: Record<Exclude<PlanDraft['focus'], ''>, string> = {
  strength: 'Strength',
  hypertrophy: 'Muscle growth',
  endurance: 'Endurance',
  mobility: 'Mobility',
  'weight-loss': 'Weight loss',
};
