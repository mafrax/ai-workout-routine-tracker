/**
 * WorkoutGenerationService
 * Automatically generates Workout and Exercise records from workout plan details
 */

import prisma from '../lib/database';

interface ExerciseDetails {
  restTime?: number;
  notes?: string;
  weight?: number;
}

export class WorkoutGenerationService {
  /**
   * Parse plan_details to extract muscle groups for each day
   */
  private static parseMuscleGroups(planDetails: string): { [day: number]: string } {
    const muscleGroups: { [day: number]: string } = {};
    const lines = planDetails.split('\n');

    for (const line of lines) {
      const dayMatch = line.match(/^Day (\d+)\s*-\s*(.+):?$/i);
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
      // Match exercise line: "1. Exercise Name - details"
      const exerciseMatch = line.match(/^\d+\.\s*(.+)\s+-\s+(\d+x\d+.+)$/);
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
   * Parse exercise line to extract sets, reps, weight, and name
   */
  private static parseExerciseLine(line: string): {
    name: string;
    sets: number;
    reps: number;
    weight?: number;
    isBodyweight: boolean;
  } | null {
    const match = line.match(/^\d+\.\s*(.+?)\s*-\s*(\d+)x(\d+)\s*@\s*(.+)/);
    if (!match || !match[1] || !match[2] || !match[3] || !match[4]) return null;

    const name = match[1].trim();
    const sets = parseInt(match[2]);
    const reps = parseInt(match[3]);
    const weightStr = match[4].trim();

    const isBodyweight = weightStr.toLowerCase() === 'bodyweight';
    const weight = isBodyweight ? undefined : parseFloat(weightStr);

    return { name, sets, reps, weight, isBodyweight };
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
    }> = [];

    for (const line of lines) {
      // Check for day header
      const dayMatch = line.match(/^Day (\d+)\s*-\s*(.+):?$/i);
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
        notes: details.notes || null
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
