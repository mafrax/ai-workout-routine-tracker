import { z } from 'zod';

/**
 * Equipment-specific attributes for an exercise. Discriminated by `kind`.
 *
 * Stored on Exercise.attributes (JSONB, nullable). NULL means the exercise
 * needs no extra context beyond reps + weight (e.g. push-ups, deadlifts).
 *
 * To add a new kind:
 *   1. Add a variant to `exerciseAttributesSchema` below.
 *   2. Add a matching detection rule in WorkoutGenerationService.parseExerciseLine.
 *   3. Add a renderer in frontend/src/components/Workout/AttributeStrip.tsx.
 */

export const dumbbellsAttributesSchema = z.object({
  kind: z.literal('dumbbells'),
  /** Mass per hand (i.e. weight of ONE dumbbell), in kilograms. */
  weightPerHandKg: z.number().positive().max(200),
  /** Optional grip orientation cue from the exercise name. */
  grip: z.enum(['neutral', 'pronated', 'supinated']).optional(),
});

export const inclineBenchAttributesSchema = z.object({
  kind: z.literal('incline-bench'),
  /** Bench angle in degrees: 0 = flat, 30/45 = incline, -15 = decline. */
  angleDeg: z.number().int().min(-30).max(90),
});

export const cableAttributesSchema = z.object({
  kind: z.literal('cable'),
  pulleyHeight: z.enum(['low', 'mid', 'high']),
  attachment: z.string().max(60).optional(),
});

export const bandAttributesSchema = z.object({
  kind: z.literal('band'),
  resistance: z.enum(['light', 'medium', 'heavy', 'extra-heavy']),
});

export const machineAttributesSchema = z.object({
  kind: z.literal('machine'),
  settings: z.record(z.union([z.string(), z.number()])).optional(),
});

export const exerciseAttributesSchema = z.discriminatedUnion('kind', [
  dumbbellsAttributesSchema,
  inclineBenchAttributesSchema,
  cableAttributesSchema,
  bandAttributesSchema,
  machineAttributesSchema,
]);

export type ExerciseAttributes = z.infer<typeof exerciseAttributesSchema>;

/**
 * Best-effort parse — returns the typed value or null if the input doesn't
 * match any known variant. Use this whenever you pull `attributes` out of
 * Prisma since the column type is `Json` (i.e. `any`).
 */
export function parseExerciseAttributes(raw: unknown): ExerciseAttributes | null {
  if (raw == null) return null;
  const result = exerciseAttributesSchema.safeParse(raw);
  return result.success ? result.data : null;
}
