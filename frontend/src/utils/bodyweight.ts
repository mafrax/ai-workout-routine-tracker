import type { BodyweightExercise } from '../types';

const DEFAULT_TIME_BASED = new Set([
  'plank',
  'side plank',
  'wall sit',
  'l-sit',
  'l sit',
  'hollow hold',
  'superman hold',
  'dead hang',
]);

/**
 * Normalise a single bodyweight-exercise entry to the new
 * `{ name, unit, max }` shape. Handles:
 *  - Already in the new shape -> returned as-is.
 *  - Legacy `{ name, maxReps }` shape -> mapped to `{ unit: 'reps' | 'seconds', max }`
 *    where the unit is inferred from the exercise name.
 *  - Malformed input -> null.
 *
 * Mirrors the backend helper at src/utils/bodyweight.ts; keep them in sync.
 */
export function normalizeBodyweightExercise(raw: unknown): BodyweightExercise | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.name !== 'string' || r.name.length === 0) return null;

  if (r.unit === 'reps' || r.unit === 'seconds') {
    const max = typeof r.max === 'number' && r.max > 0 ? r.max : 0;
    if (max === 0) return null;
    return { name: r.name, unit: r.unit, max };
  }

  const legacyMax = typeof r.maxReps === 'number' && r.maxReps > 0 ? r.maxReps : 0;
  if (legacyMax === 0) return null;
  const unit: 'reps' | 'seconds' = DEFAULT_TIME_BASED.has(r.name.toLowerCase()) ? 'seconds' : 'reps';
  return { name: r.name, unit, max: legacyMax };
}

export function normalizeBodyweightExercises(raw: unknown): BodyweightExercise[] {
  if (!Array.isArray(raw)) return [];
  const out: BodyweightExercise[] = [];
  for (const item of raw) {
    const n = normalizeBodyweightExercise(item);
    if (n) out.push(n);
  }
  return out;
}

/**
 * Suggest a default unit for an exercise name. Used by the wizard's
 * bodyweight step to decide whether to label the input "max reps" or
 * "max hold (s)" when the user picks a new exercise.
 */
export function defaultUnitFor(exerciseName: string): 'reps' | 'seconds' {
  return DEFAULT_TIME_BASED.has(exerciseName.toLowerCase()) ? 'seconds' : 'reps';
}
