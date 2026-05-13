/**
 * WorkoutGenerationService
 * Automatically generates Workout and Exercise records from workout plan details.
 *
 * The canonical day-header and exercise-line regexes for the backend live on
 * this class (DAY_HEADER_RE, EXERCISE_LINE_RE). The frontend has its own
 * text-fallback parser in `frontend/src/types/workout.ts` that runs only
 * when the API returns no structured workouts; keep its regex shape in
 * sync if you ever change the canonical format.
 */

import { Prisma } from '@prisma/client';
import prisma from '../lib/database';
import type { ExerciseAttributes } from '../types/exercise';

interface ExerciseDetails {
  restTime?: number;
  notes?: string;
  weight?: number;
}

export class WorkoutGenerationService {
  // Day-header regex: requires "Day N - X" or "Day N: X". Optional
  // markdown bold around "Day N". Trailing colon optional. Rejects narrative
  // text like "Day 1 and Day 2" because it lacks ':' or '-' after the number.
  private static readonly DAY_HEADER_RE = /^\*{0,2}Day\s+(\d+)\*{0,2}\s*[:\-]\s*(.+?):?$/i;

  // Exercise regex: accepts "4x8" and ranges "4x6-8". Captures sets, reps (string), weight.
  private static readonly EXERCISE_LINE_RE =
    /^\d+\.\s*(.+?)\s*-\s*(\d+)x(\d+(?:-\d+)?)\s*@\s*(.+)/i;

  /**
   * Parse plan_details to extract muscle groups for each day
   */
  private static parseMuscleGroups(planDetails: string): { [day: number]: string } {
    const muscleGroups: { [day: number]: string } = {};
    const lines = planDetails.split('\n');

    for (const line of lines) {
      const dayMatch = line.match(this.DAY_HEADER_RE);
      if (dayMatch && dayMatch[1] && dayMatch[2]) {
        muscleGroups[parseInt(dayMatch[1])] = dayMatch[2].trim().replace(/:$/, '');
      }
    }

    return muscleGroups;
  }

  /**
   * Parse plan_details to extract exercise details (rest time, notes, weight)
   */
  private static parseExerciseDetails(planDetails: string): Map<string, ExerciseDetails> {
    const exerciseDetails = new Map<string, ExerciseDetails>();
    const lines = planDetails.split('\n');

    for (const line of lines) {
      // Match exercise line: "1. Exercise Name - details" (accepts rep ranges)
      const exerciseMatch = line.match(/^\d+\.\s*(.+?)\s+-\s+(\d+x\d+(?:-\d+)?.+)$/);
      if (exerciseMatch && exerciseMatch[1] && exerciseMatch[2]) {
        const exerciseName = exerciseMatch[1].trim();
        const details = exerciseMatch[2].trim();

        const info: ExerciseDetails = {};

        // Extract rest time - handle patterns: "| 120s rest" or "| 60s"
        const restMatch = details.match(/\|\s*(\d+)s/);
        if (restMatch && restMatch[1]) {
          info.restTime = parseInt(restMatch[1]);
        }

        // Extract weight (e.g., "@ 55kg")
        const weightMatch = details.match(/@ ([\d.]+)kg/);
        if (weightMatch && weightMatch[1]) {
          info.weight = parseFloat(weightMatch[1]);
        }

        // Extract notes (text in parentheses)
        const notesMatch = details.match(/\(([^)]+)\)/);
        if (notesMatch && notesMatch[1]) {
          info.notes = notesMatch[1];
        }

        exerciseDetails.set(exerciseName, info);
      }
    }

    return exerciseDetails;
  }

  /**
   * Parse exercise line to extract sets, reps, weight, and name.
   * Accepts both "4x8" and rep ranges "4x6-8". Ranges are reduced to the
   * lower bound (the most demanding floor) because downstream frontend
   * code expects a single integer rep count per set.
   */
  private static parseExerciseLine(line: string): {
    name: string;
    sets: number;
    reps: number;
    weight?: number;
    isBodyweight: boolean;
    attributes: ExerciseAttributes | null;
  } | null {
    const match = line.match(this.EXERCISE_LINE_RE);
    if (!match || !match[1] || !match[2] || !match[3] || !match[4]) return null;

    const name = match[1].trim();
    const sets = parseInt(match[2]);

    // "6-8" -> 6 (lower bound), "8" -> 8
    const repsToken = match[3];
    const reps = parseInt(repsToken.split('-')[0] ?? repsToken, 10);
    if (isNaN(reps)) return null;

    // weight token may include trailing "kg", "| 90s", "(notes)" etc — strip them
    const weightToken = match[4].split(/[|(]/)[0]?.trim() ?? '';
    const isBodyweight = /bodyweight|body\s+weight|^bw$/i.test(weightToken);
    const numericWeight = parseFloat(weightToken.replace(/kg/i, ''));
    const weight = isBodyweight || isNaN(numericWeight) ? undefined : numericWeight;

    // Equipment-specific attributes from the exercise name + the tail of the
    // weight token (which carries free-form notes like "(30° incline)" or
    // "per hand" cues). Best-effort — never block parsing on detection.
    const attributes = this.detectAttributes(name, match[4], weight);

    return { name, sets, reps, weight, isBodyweight, attributes };
  }

  /**
   * Infer ExerciseAttributes from the exercise title + raw tail of the line.
   * Returns null when no specific equipment signature is detected — most
   * exercises (bench press, push-ups, squats) carry no extras and stay NULL.
   */
  private static detectAttributes(
    name: string,
    rawTail: string,
    weightKg: number | undefined
  ): ExerciseAttributes | null {
    const lower = name.toLowerCase();
    const tailLower = rawTail.toLowerCase();

    // Incline bench detection takes precedence over dumbbells because an
    // "Incline Dumbbell Press" should track the angle (the dumbbells variant
    // is the muscle work — we surface incline since it's the rarer signal).
    const angleMatch =
      tailLower.match(/(\-?\d{1,2})\s*(?:°|deg(?:rees)?|degree)/i) ||
      tailLower.match(/(?:incline|decline)[^\d]{0,8}(\-?\d{1,2})/i);
    if (lower.includes('incline') || lower.includes('decline')) {
      const raw = angleMatch?.[1];
      const angle = raw ? parseInt(raw, 10) : lower.includes('decline') ? -15 : 30;
      if (!isNaN(angle) && angle >= -30 && angle <= 90) {
        return { kind: 'incline-bench', angleDeg: angle };
      }
    }

    // Dumbbells — title has "dumbbell" / "DB" and we have a numeric weight.
    // The number we parsed is the per-hand weight by convention in this app.
    if (/\b(dumbbell|dumbbells|db)\b/i.test(name) && typeof weightKg === 'number') {
      const grip = /neutral|hammer/i.test(name)
        ? ('neutral' as const)
        : /reverse|supinated|underhand/i.test(name)
        ? ('supinated' as const)
        : undefined;
      return { kind: 'dumbbells', weightPerHandKg: weightKg, ...(grip ? { grip } : {}) };
    }

    // Cable — pulley height inferred from common cable exercise prefixes.
    if (/\bcable\b/i.test(name)) {
      const pulleyHeight =
        /\b(pulldown|high\s*pull|high\s*row|face\s*pull|tricep[s]?\s*pushdown)\b/i.test(name)
          ? 'high'
          : /\brow|pull-?through|kickback|low\s*pull\b/i.test(name)
          ? 'low'
          : 'mid';
      return { kind: 'cable', pulleyHeight };
    }

    // Resistance bands — usually only have a resistance level, no specific weight.
    if (/\bband[s]?\b/i.test(name)) {
      const resistance = /heavy/i.test(rawTail) ? 'heavy' : /light/i.test(rawTail) ? 'light' : 'medium';
      return { kind: 'band', resistance };
    }

    return null;
  }

  /**
   * Dry-run parse of plan_details — returns the days that would be created.
   * Used by routes to reject plans that would produce zero structured workouts.
   */
  static previewParsedWorkouts(planDetails: string): Array<{ day: number; exerciseCount: number }> {
    const lines = planDetails.split('\n');
    const days = new Map<number, number>();
    let currentDay: number | null = null;

    for (const line of lines) {
      const dayMatch = line.match(this.DAY_HEADER_RE);
      if (dayMatch && dayMatch[1]) {
        currentDay = parseInt(dayMatch[1]);
        if (!days.has(currentDay)) days.set(currentDay, 0);
        continue;
      }
      if (currentDay !== null && this.parseExerciseLine(line)) {
        days.set(currentDay, (days.get(currentDay) || 0) + 1);
      }
    }

    return [...days.entries()]
      .filter(([, count]) => count > 0)
      .map(([day, exerciseCount]) => ({ day, exerciseCount }));
  }

  /**
   * Generate workouts from plan_details
   * This will create/update Workout and Exercise records
   */
  static async generateWorkoutsFromPlanDetails(planId: bigint, planDetails: string): Promise<{
    created: number;
    updated: number;
  }> {
    console.log(`🏋️ Generating workouts for plan ${planId}`);

    const muscleGroups = this.parseMuscleGroups(planDetails);
    const exerciseDetailsMap = this.parseExerciseDetails(planDetails);

    let created = 0;
    let updated = 0;

    const lines = planDetails.split('\n');
    let currentDay: number | null = null;
    const currentExercises: Array<{
      name: string;
      sets: number;
      reps: number;
      weight?: number;
      isBodyweight: boolean;
      attributes: ExerciseAttributes | null;
    }> = [];

    for (const line of lines) {
      // Check for day header
      const dayMatch = line.match(WorkoutGenerationService.DAY_HEADER_RE);
      if (dayMatch && dayMatch[1]) {
        // Save previous day's workout if exists
        if (currentDay !== null && currentExercises.length > 0) {
          const result = await this.createOrUpdateWorkout(
            planId,
            currentDay,
            muscleGroups[currentDay] || 'Unknown',
            currentExercises,
            exerciseDetailsMap
          );
          if (result === 'created') created++;
          else if (result === 'updated') updated++;
        }

        // Start new day
        currentDay = parseInt(dayMatch[1]);
        currentExercises.length = 0; // Clear array
        continue;
      }

      // Check for exercise line
      const exerciseData = this.parseExerciseLine(line);
      if (exerciseData && currentDay !== null) {
        currentExercises.push(exerciseData);
      }
    }

    // Save last day's workout
    if (currentDay !== null && currentExercises.length > 0) {
      const result = await this.createOrUpdateWorkout(
        planId,
        currentDay,
        muscleGroups[currentDay] || 'Unknown',
        currentExercises,
        exerciseDetailsMap
      );
      if (result === 'created') created++;
      else if (result === 'updated') updated++;
    }

    console.log(`✅ Generated ${created} new workouts, updated ${updated} existing workouts`);

    return { created, updated };
  }

  /**
   * Create or update a single workout with its exercises
   */
  private static async createOrUpdateWorkout(
    planId: bigint,
    day: number,
    muscleGroup: string,
    exercisesData: Array<{
      name: string;
      sets: number;
      reps: number;
      weight?: number;
      isBodyweight: boolean;
      attributes: ExerciseAttributes | null;
    }>,
    exerciseDetailsMap: Map<string, ExerciseDetails>
  ): Promise<'created' | 'updated'> {
    // Check if workout already exists
    const existingWorkout = await prisma.workout.findUnique({
      where: {
        planId_day: {
          planId,
          day
        }
      }
    });

    const exercisesPayload = exercisesData.map((ex, index) => {
      const details = exerciseDetailsMap.get(ex.name) || {};
      return {
        orderIndex: index + 1,
        exerciseTitle: ex.name,
        numberOfReps: JSON.stringify(Array(ex.sets).fill(ex.reps)),
        weight: details.weight || ex.weight || null,
        isBodyweight: ex.isBodyweight,
        restTime: details.restTime || null,
        notes: details.notes || null,
        // Prisma rejects raw `null` for JSON columns — must use JsonNull sentinel.
        attributes: ex.attributes ?? Prisma.JsonNull,
      };
    });

    if (existingWorkout) {
      // Update existing workout
      await prisma.exercise.deleteMany({
        where: { workoutId: existingWorkout.id }
      });

      await prisma.exercise.createMany({
        data: exercisesPayload.map(ex => ({
          ...ex,
          workoutId: existingWorkout.id
        }))
      });

      return 'updated';
    } else {
      // Create new workout
      await prisma.workout.create({
        data: {
          planId,
          day,
          muscleGroup,
          exercises: {
            create: exercisesPayload
          }
        }
      });

      return 'created';
    }
  }

  /**
   * Delete workouts that are no longer in plan_details
   */
  static async cleanupRemovedWorkouts(planId: bigint, planDetails: string): Promise<number> {
    const muscleGroups = this.parseMuscleGroups(planDetails);
    const validDays = Object.keys(muscleGroups).map(d => parseInt(d));

    // Delete workouts not in the valid days list
    const result = await prisma.workout.deleteMany({
      where: {
        planId,
        day: {
          notIn: validDays
        }
      }
    });

    return result.count;
  }
}
