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
 * `{ name, unit, max }` shape, handling these inputs:
 *  - Already in the new shape -> returned as-is (with defensive clamps).
 *  - Legacy `{ name, maxReps }` shape -> mapped to `{ unit: 'reps', max }`.
 *  - Garbage / malformed -> null.
 *
 * Time-based exercises (Plank etc.) are detected by name when the input
 * doesn't include an explicit `unit` field, so a user with a long-standing
 * "Plank: 60" legacy row gets `unit: 'seconds'` automatically.
 */
export function normalizeBodyweightExercise(raw: unknown): BodyweightExercise | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.name !== 'string' || r.name.length === 0) return null;

  // New shape
  if (r.unit === 'reps' || r.unit === 'seconds') {
    const max = typeof r.max === 'number' && r.max > 0 ? r.max : 0;
    if (max === 0) return null;
    return { name: r.name, unit: r.unit, max };
  }

  // Legacy shape — pick a unit from the name
  const legacyMax = typeof r.maxReps === 'number' && r.maxReps > 0 ? r.maxReps : 0;
  if (legacyMax === 0) return null;
  const unit: 'reps' | 'seconds' = DEFAULT_TIME_BASED.has(r.name.toLowerCase()) ? 'seconds' : 'reps';
  return { name: r.name, unit, max: legacyMax };
}

/** Normalise a heterogeneous list (any of the supported shapes per item). */
export function normalizeBodyweightExercises(raw: unknown): BodyweightExercise[] {
  if (!Array.isArray(raw)) return [];
  const out: BodyweightExercise[] = [];
  for (const item of raw) {
    const n = normalizeBodyweightExercise(item);
    if (n) out.push(n);
  }
  return out;
}

/** Convenience: parse a JSON-stringified column (User.bodyweightExercises Prisma column). */
export function parseBodyweightColumn(raw: string | null | undefined): BodyweightExercise[] {
  if (!raw) return [];
  try {
    return normalizeBodyweightExercises(JSON.parse(raw));
  } catch {
    return [];
  }
}
